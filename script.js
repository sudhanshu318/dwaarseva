// Footer year
document.getElementById("year").textContent = new Date().getFullYear();

// Mobile menu
const toggle = document.querySelector(".nav-toggle");
const menu = document.getElementById("menu");
toggle.addEventListener("click", () => {
  const open = menu.classList.toggle("open");
  toggle.setAttribute("aria-expanded", String(open));
});
menu.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => {
    menu.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  })
);

// Booking form: client-side validation only.
const FORMSPREE_URL = "https://formspree.io/f/xdegagbk";
const form = document.getElementById("booking-form");
const status = document.getElementById("form-status");

form.addEventListener("submit", (e) => {
  e.preventDefault();
  let valid = true;
  form.querySelectorAll("[required]").forEach((field) => {
    const ok = field.value.trim() !== "";
    field.setAttribute("aria-invalid", String(!ok));
    if (!ok) valid = false;
  });

  const phone = form.elements.phone;
  if (phone.value.trim() && !/^[+\d][\d\s-]{6,}$/.test(phone.value.trim())) {
    phone.setAttribute("aria-invalid", "true");
    valid = false;
  }

  if (!valid) {
    status.className = "form-status error";
    status.textContent = "Please fill in the highlighted fields with valid details.";
    return;
  }

  // Send the request by email through Formspree (works on static hosting).
  const f = form.elements;
  const lines = [
    "New service request (Dwaarseva website)",
    "Name: " + f.name.value.trim(),
    "Phone: " + f.phone.value.trim(),
    "Community: " + f.community.value.trim(),
    "Service: " + f.service.value,
    "Plan: " + f.plan.value,
  ];
  if (f.message.value.trim()) lines.push("Notes: " + f.message.value.trim());
  const waUrl = "https://wa.me/919148702403?text=" + encodeURIComponent(lines.join("\n"));

  const submitBtn = form.querySelector("button[type=submit]");
  submitBtn.disabled = true;
  status.className = "form-status";
  status.textContent = "Sending...";

  fetch(FORMSPREE_URL, {
    method: "POST",
    headers: { Accept: "application/json" },
    body: new FormData(form),
  })
    .then((res) => {
      if (!res.ok) throw new Error("Request failed");
      status.className = "form-status ok";
      status.textContent = "Thanks! We have received your request and will be in touch soon. ";
      const link = document.createElement("a");
      link.href = waUrl;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = "Chat with us on WhatsApp";
      status.appendChild(link);
      form.reset();
    })
    .catch(() => {
      status.className = "form-status error";
      status.textContent =
        "Could not send your request. Please call +91 91487 02403 or email dwaarseva@gmail.com.";
    })
    .finally(() => {
      submitBtn.disabled = false;
    });
});
