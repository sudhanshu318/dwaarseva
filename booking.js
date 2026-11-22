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
      loadHistory();
    }
  });

  // ---- My bookings: view, edit, cancel ----
  const editForm = document.getElementById("edit-form");
  const editStatus = document.getElementById("e-status");
  let editing = null;

  function notifyTeam(subject, b, extra) {
    const body = {
      _subject: subject,
      message: [subject, "Service: " + b.service, "Name: " + b.name, "Phone: " + b.phone, "Email: " + (A.user && A.user.email || ""), extra].filter(Boolean).join("\n"),
    };
    fetch(C.formspree, { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => {});
  }

  function btn(label, onClick, cls) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "btn btn-small " + (cls || "btn-ghost");
    b.textContent = label;
    b.addEventListener("click", onClick);
    return b;
  }

  async function loadHistory() {
    const ul = document.getElementById("history-list");
    try {
      const list = await A.listBookings();
      ul.textContent = "";
      list.forEach((b) => {
        const li = document.createElement("li");
        const t = document.createElement("span");
        t.textContent = b.service + " (" + b.plan + "), starts " + b.date + ", " + b.slot + ". Status: " + b.status + ". ";
        li.appendChild(t);
        if (b.status === "requested" || b.status === "confirmed") {
          li.appendChild(btn("Edit", () => startEdit(b)));
          li.appendChild(btn("Cancel booking", () => cancelBooking(b)));
        }
        ul.appendChild(li);
      });
      document.getElementById("history").hidden = list.length === 0;
    } catch (_) { /* history is optional */ }
  }

  function startEdit(b) {
    editing = b;
    const f = editForm.elements;
    // Reuse the option lists from the main booking form.
    ["plan", "slot"].forEach((n) => {
      f[n].textContent = "";
      [...form.elements[n].options].filter((o) => o.value !== "").forEach((o) => f[n].appendChild(new Option(o.text, o.value)));
    });
    f.date.min = form.elements.date.min;
    f.plan.value = b.plan; f.date.value = b.date; f.slot.value = b.slot;
    f.community.value = b.community || ""; f.flat.value = b.flat || ""; f.message.value = b.message || "";
    editStatus.textContent = "";
    editForm.hidden = false;
    f.plan.focus();
  }

  async function cancelBooking(b) {
    if (!confirm("Cancel this booking?")) return;
    try {
      await A.cancelMyBooking(b.id);
      notifyTeam("Booking CANCELLED by customer", b, "Was: " + b.date + ", " + b.slot);
      loadHistory();
    } catch (_) { alert("Could not cancel. Please call " + C.phone + "."); }
  }

  document.getElementById("e-close").addEventListener("click", () => { editForm.hidden = true; editing = null; });

  editForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = editForm.elements;
    if (!editing || !f.date.value || !f.community.value.trim() || !f.flat.value.trim()) {
      editStatus.className = "form-status error";
      editStatus.textContent = "Please fill in date, community and flat number.";
      return;
    }
    const fields = {
      plan: f.plan.value, date: f.date.value, slot: f.slot.value,
      community: f.community.value.trim(), flat: f.flat.value.trim(), message: f.message.value.trim(),
    };
    try {
      await A.updateMyBooking(editing.id, fields);
      notifyTeam("Booking CHANGED by customer", editing, "New: " + fields.plan + ", " + fields.date + ", " + fields.slot + ", " + fields.community + " " + fields.flat);
      editForm.hidden = true;
      editing = null;
      loadHistory();
    } catch (_) {
      editStatus.className = "form-status error";
      editStatus.textContent = "Could not save changes. This booking may no longer be editable.";
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
        if (A.user && A.saveBooking) A.saveBooking(data).then(loadHistory).catch(() => {});
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
