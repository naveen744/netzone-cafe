const modal=document.getElementById("modal");
document.getElementById("printBtn").addEventListener("click",()=>{modal.classList.add("show");modal.setAttribute("aria-hidden","false")});
document.getElementById("closeModal").addEventListener("click",()=>{modal.classList.remove("show");modal.setAttribute("aria-hidden","true")});
modal.addEventListener("click",e=>{if(e.target===modal){modal.classList.remove("show");modal.setAttribute("aria-hidden","true")}});

const enBtn=document.getElementById("enBtn"),hiBtn=document.getElementById("hiBtn");
function setLanguage(lang){
  document.documentElement.lang=lang==="hi"?"hi":"en";
  document.querySelectorAll("[data-en]").forEach(el=>el.textContent=lang==="hi"?el.dataset.hi:el.dataset.en);
  enBtn.classList.toggle("active",lang==="en"); hiBtn.classList.toggle("active",lang==="hi");
  localStorage.setItem("netzone-language",lang);
}
enBtn.onclick=()=>setLanguage("en"); hiBtn.onclick=()=>setLanguage("hi");
setLanguage(localStorage.getItem("netzone-language")||"en");
document.getElementById("year").textContent=new Date().getFullYear();

const orderForm = document.getElementById("printOrderForm");
const orderStatus = document.getElementById("orderStatus");
if (orderForm) {
  orderForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    orderStatus.textContent = "Submitting...";
    const data = new FormData(orderForm);
    try {
      const res = await fetch("/api/print-orders", { method: "POST", body: data });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Unable to submit order.");
      orderStatus.innerHTML = `Order received. Reference: <strong>${result.orderId}</strong>
        <br><a class="order-wa" href="${netzoneWhatsAppLink(`Hello NetZone, I have submitted print order ${result.orderId}.`)}" target="_blank" rel="noopener">Message NetZone on WhatsApp</a>`;
      orderForm.reset();
    } catch (err) {
      orderStatus.textContent = err.message || "Something went wrong. Please call NetZone.";
    }
  });
}

function netzoneWhatsAppLink(message) {
  const number = "919631968965"; // Replace with NetZone WhatsApp number.
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

function openOrderWhatsApp(orderId) {
  const message = `Hello NetZone, I want to check my print order ${orderId}.`;
  window.open(netzoneWhatsAppLink(message), "_blank", "noopener");
}
