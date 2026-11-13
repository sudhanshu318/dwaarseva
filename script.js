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
// TODO: connect to a backend or form service (e.g. email, Google Sheets, WhatsApp) to receive requests.
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

  // Static hosting has no backend, so open a pre-filled WhatsApp message to the business.
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

  const url = "https://wa.me/919148702403?text=" + encodeURIComponent(lines.join("\n"));
  window.open(url, "_blank", "noopener");

  status.className = "form-status ok";
  status.textContent = "Opening WhatsApp. Please press send there to complete your request.";
  form.reset();
});
