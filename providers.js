(function () {
  const C = window.DWAARSEVA;
  const form = document.getElementById("join-form");
  const status = document.getElementById("j-status");

  function say(msg, kind) {
    status.className = "form-status" + (kind ? " " + kind : "");
    status.textContent = msg;
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    let valid = true;
    form.querySelectorAll("[required]").forEach((f) => {
      const ok = f.type === "checkbox" ? f.checked : f.value.trim() !== "";
      f.setAttribute("aria-invalid", String(!ok));
      if (!ok) valid = false;
    });
    const phone = form.elements.phone;
    if (phone.value.trim() && !/^[+\d][\d\s-]{6,}$/.test(phone.value.trim())) {
      phone.setAttribute("aria-invalid", "true");
      valid = false;
    }
    if (!valid) return say("Please fill in the highlighted fields with valid details.", "error");

    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    say("Sending...");
    fetch(C.formspree, { method: "POST", headers: { Accept: "application/json" }, body: new FormData(form) })
      .then((res) => {
        if (!res.ok) throw new Error("failed");
        say("Thanks! We have received your application and will call you soon.", "ok");
        form.reset();
      })
      .catch(() => say("Could not send your application. Please call " + C.phone + " or email " + C.email + ".", "error"))
      .finally(() => { btn.disabled = false; });
  });
})();
