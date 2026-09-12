const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const multer = require("multer");
const crypto = require("crypto");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 3000;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "print-orders";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const allowed = new Set([".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx"]);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.has(ext));
  }
});

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(express.json({ limit: "32kb" }));

const publicApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many requests. Please try again later." }
});

const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many order submissions. Please try again later." }
});

app.use(express.static(path.join(__dirname, "public")));

app.post("/api/print-orders", orderLimiter, upload.single("document"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Please upload PDF, JPG, PNG, DOC or DOCX (maximum 10 MB)."
      });
    }

    const { name, phone, copies, printType, notes } = req.body;
    if (!name || !phone || !copies) {
      return res.status(400).json({
        message: "Name, mobile number and copies are required."
      });
    }

    const copiesNumber = Number(copies);
    if (!Number.isInteger(copiesNumber) || copiesNumber < 1 || copiesNumber > 500) {
      return res.status(400).json({ message: "Copies must be between 1 and 500." });
    }

    const orderId =
      `NZ-${new Date().toISOString().slice(0,10).replaceAll("-", "")}-` +
      crypto.randomBytes(3).toString("hex").toUpperCase();

    const ext = path.extname(req.file.originalname).toLowerCase();
    const storagePath = `${new Date().toISOString().slice(0,10)}/${orderId}${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, req.file.buffer, {
        contentType: req.file.mimetype || "application/octet-stream",
        upsert: false
      });

    if (uploadError) {
      console.error(uploadError);
      return res.status(500).json({ message: "Document storage failed. Please try again." });
    }

    const { error: dbError } = await supabase.from("print_orders").insert({
      order_id: orderId,
      customer_name: String(name).trim(),
      phone: String(phone).trim(),
      copies: copiesNumber,
      print_type: printType === "color" ? "color" : "bw",
      notes: notes ? String(notes).trim() : null,
      original_filename: req.file.originalname,
      storage_path: storagePath,
      status: "pending"
    });

    if (dbError) {
      // Best-effort cleanup if database insert fails.
      await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
      console.error(dbError);
      return res.status(500).json({ message: "Order could not be saved. Please try again." });
    }

    res.status(201).json({ ok: true, orderId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unexpected server error. Please try again." });
  }
});

const ADMIN_TOKEN = process.env.NETZONE_ADMIN_TOKEN;

function requireAdmin(req, res, next) {
  if (!ADMIN_TOKEN) {
    return res.status(503).json({ message: "Admin access is not configured." });
  }
  const auth = req.headers.authorization || "";
  const supplied = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (supplied.length !== ADMIN_TOKEN.length ||
      !crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(ADMIN_TOKEN))) {
    return res.status(401).json({ message: "Unauthorized." });
  }
  next();
}

app.get("/api/admin/orders", requireAdmin, async (req, res) => {
  const status = req.query.status;
  let query = supabase
    .from("print_orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (status && ["pending","printing","ready","completed","cancelled"].includes(status)) {
    query = query.eq("status", status);
  }
  const { data, error } = await query;
  if (error) {
    console.error(error);
    return res.status(500).json({ message: "Unable to load orders." });
  }
  res.json({ orders: data || [] });
});

app.patch("/api/admin/orders/:orderId/status", requireAdmin, async (req, res) => {
  const allowedStatuses = new Set(["pending","printing","ready","completed","cancelled"]);
  const { status } = req.body || {};
  if (!allowedStatuses.has(status)) {
    return res.status(400).json({ message: "Invalid status." });
  }
  const { data, error } = await supabase
    .from("print_orders")
    .update({ status })
    .eq("order_id", req.params.orderId)
    .select("order_id,status")
    .single();
  if (error) {
    console.error(error);
    return res.status(500).json({ message: "Unable to update order status." });
  }
  res.json({ ok: true, order: data });
});

app.get("/api/admin/orders/:orderId/document", requireAdmin, async (req, res) => {
  const { data: order, error } = await supabase
    .from("print_orders")
    .select("storage_path,original_filename")
    .eq("order_id", req.params.orderId)
    .single();
  if (error || !order) return res.status(404).json({ message: "Order not found." });

  const { data, error: signError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(order.storage_path, 300);
  if (signError) {
    console.error(signError);
    return res.status(500).json({ message: "Unable to create secure document link." });
  }
  res.json({ url: data.signedUrl, filename: order.original_filename });
});

app.get("/api/admin/summary", requireAdmin, async (_req, res) => {
  const { data, error } = await supabase
    .from("print_orders")
    .select("status");
  if (error) return res.status(500).json({ message: "Unable to load summary." });
  const summary = { pending: 0, printing: 0, ready: 0, completed: 0, cancelled: 0 };
  (data || []).forEach(row => { if (summary[row.status] !== undefined) summary[row.status]++; });
  res.json(summary);
});

app.get("/api/order-status/:orderId", publicApiLimiter, async (req, res) => {
  const orderId = String(req.params.orderId || "").trim();
  if (!/^NZ-\d{8}-[A-Z0-9]{6}$/.test(orderId)) {
    return res.status(400).json({ message: "Invalid order reference." });
  }
  const { data, error } = await supabase
    .from("print_orders")
    .select("order_id,status")
    .eq("order_id", orderId)
    .single();
  if (error || !data) return res.status(404).json({ message: "Order not found." });
  res.json({ orderId: data.order_id, status: data.status });
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "NetZone", storage: "supabase", admin: Boolean(ADMIN_TOKEN) });
});

app.listen(PORT, () => console.log(`NetZone running on port ${PORT}`));
