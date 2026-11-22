(function () {
  const C = window.DWAARSEVA;
  const A = window.dwAuth;
  const form = document.getElementById("book-form");
  const steps = [...form.querySelectorAll(".step")];
  const dots = [...document.querySelectorAll("#progress li")];
  const back = document.getElementById("b-back");
  const next = document.getElementById("b-next");
  const submit = document.getElementById("b-submit");
  const status = document.getElementById("b-status");
  let cur = 0;

  // Earliest date is today; allow ?service=Cook&plan=Monthly links.
  const today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  form.elements.date.min = today.toISOString().slice(0, 10);
  const q = new URLSearchParams(location.search);
  const setIfValid = (sel, v) => {
    if (v && [...sel.options].some((o) => o.value === v || o.text === v)) sel.value = v;
  };
  setIfValid(form.elements.service, q.get("service"));
  setIfValid(form.elements.plan, q.get("plan"));

  function say(msg, kind) {
    status.className = "form-status" + (kind ? " " + kind : "");
    status.textContent = msg;
  }

  function show(i) {
    cur = i;
    steps.forEach((s, n) => (s.hidden = n !== i));
    dots.forEach((d, n) => d.classList.toggle("on", n <= i));
    back.hidden = i === 0;
    next.hidden = i === steps.length - 1;
    submit.hidden = i !== steps.length - 1;
    if (i === steps.length - 1) renderSummary();
    say("");
  }

  function validPhone(v) { return /^[+\d][\d\s-]{6,}$/.test(v.trim()); }

  function validateStep(i) {
    let ok = true;
    steps[i].querySelectorAll("[required]").forEach((f) => {
      const good = f.value.trim() !== "" && (f.name !== "phone" || validPhone(f.value));
      f.setAttribute("aria-invalid", String(!good));
      if (!good) ok = false;
    });
    if (!ok) say("Please fill in the highlighted fields with valid details.", "error");
    else say("");
    return ok;
  }

  function renderSummary() {
    const f = form.elements;
    const box = document.getElementById("summary");
    box.textContent = "";
    const h = document.createElement("strong");
    h.textContent = "Your booking";
    box.appendChild(h);
    [["Service", f.service.value], ["Plan", f.plan.value], ["Start", f.date.value + ", " + f.slot.value]].forEach(([k, v]) => {
      const p = document.createElement("div");
      p.textContent = k + ": " + v;
      box.appendChild(p);
    });
  }

  next.addEventListener("click", () => { if (validateStep(cur)) show(cur + 1); });
  back.addEventListener("click", () => show(cur - 1));

  // Prefill from the signed-in account, and show history.
  A.onChange(async (user) => {
    const hint = document.getElementById("login-hint");
    if (user) {
      hint.textContent = "Signed in as " + (user.displayName || user.email) + ".";
      if (!form.elements.name.value) form.elements.name.value = user.displayName || "";
      try {
        const list = await A.listBookings();
        const ul = document.getElementById("history-list");
        ul.textContent = "";
        list.forEach((b) => {
          const li = document.createElement("li");
          li.textContent = b.service + " (" + b.plan + "), starts " + b.date + ", " + b.slot + ". Status: " + b.status;
          ul.appendChild(li);
        });
        document.getElementById("history").hidden = list.length === 0;
      } catch (_) { /* history is optional */ }
    }
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!validateStep(cur)) return;
    const f = form.elements;
    const data = {
      service: f.service.value, plan: f.plan.value, date: f.date.value, slot: f.slot.value,
      name: f.name.value.trim(), phone: f.phone.value.trim(),
      community: f.community.value.trim(), flat: f.flat.value.trim(), message: f.message.value.trim(),
    };
    const lines = [
      "New booking (Dwaarseva website)",
      "Service: " + data.service, "Plan: " + data.plan,
      "Start: " + data.date + ", " + data.slot,
      "Name: " + data.name, "Phone: " + data.phone,
      "Community: " + data.community, "Flat: " + data.flat,
    ];
    if (data.message) lines.push("Notes: " + data.message);
    const waUrl = "https://wa.me/" + C.whatsapp + "?text=" + encodeURIComponent(lines.join("\n"));

    submit.disabled = true;
    say("Sending...");
    fetch(C.formspree, { method: "POST", headers: { Accept: "application/json" }, body: new FormData(form) })
      .then((res) => {
        if (!res.ok) throw new Error("failed");
        if (A.user && A.saveBooking) A.saveBooking(data).catch(() => {});
        status.className = "form-status ok";
        status.textContent = "Booking received. We will confirm shortly. ";
        const link = document.createElement("a");
        link.href = waUrl; link.target = "_blank"; link.rel = "noopener";
        link.textContent = "Confirm on WhatsApp";
        status.appendChild(link);
        form.reset();
        show(0);
        status.className = "form-status ok";
        status.textContent = "Booking received. We will confirm shortly. ";
        status.appendChild(link);
      })
      .catch(() => say("Could not send your booking. Please call " + C.phone + " or email " + C.email + ".", "error"))
      .finally(() => { submit.disabled = false; });
  });

  show(0);
})();
