// Admin: service providers tab (verify, ratings, availability, details, payments).
(function () {
  const A = window.dwAuth;
  const $ = (id) => document.getElementById(id);
  if (!A || !A.configured) return;

  const tabB = $("tab-bookings"), tabP = $("tab-providers");
  const secB = $("ad-bookings"), secP = $("ad-providers");
  const body = $("pr-body");
  const msg = $("pr-msg");
  let rows = [];
  let loaded = false;
  let current = null;

  function say(el, text, kind) {
    el.className = "form-status" + (kind ? " " + kind : "");
    el.textContent = text;
  }

  function showTab(providers) {
    secB.hidden = providers;
    secP.hidden = !providers;
    tabB.classList.toggle("active", !providers);
    tabP.classList.toggle("active", providers);
    tabB.setAttribute("aria-selected", String(!providers));
    tabP.setAttribute("aria-selected", String(providers));
    if (providers && !loaded) load();
  }
  tabB.addEventListener("click", () => showTab(false));
  tabP.addEventListener("click", () => showTab(true));

  function matches(p) {
    const f = $("pr-filter").value;
    if (f === "available" && !(p.verified && p.active)) return false;
    if (f === "pending" && p.verified) return false;
    if (f === "inactive" && !(p.verified && !p.active)) return false;
    const s = $("pr-service").value;
    if (s && p.service !== s) return false;
    const q = $("pr-search").value.trim().toLowerCase();
    if (!q) return true;
    return [p.name, p.phone, p.email].some((v) => String(v || "").toLowerCase().includes(q));
  }

  function td(tr, child) {
    const c = document.createElement("td");
    if (child) c.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
    tr.appendChild(c);
    return c;
  }

  function check(label, checked) {
    const i = document.createElement("input");
    i.type = "checkbox";
    i.checked = !!checked;
    i.setAttribute("aria-label", label);
    return i;
  }

  function numInput(label, value, min, max, step) {
    const i = document.createElement("input");
    i.type = "number";
    i.min = min; i.max = max; i.step = step;
    i.value = value == null ? 0 : value;
    i.className = "num";
    i.setAttribute("aria-label", label);
    return i;
  }

  function render() {
    body.textContent = "";
    const shown = rows.filter(matches);
    shown.forEach((p) => {
      const tr = document.createElement("tr");

      const photoCell = td(tr);
      if (p.photo && /^data:image\/jpeg;base64,/.test(p.photo)) {
        const img = document.createElement("img");
        img.src = p.photo; img.alt = ""; img.width = 44; img.height = 44; img.className = "pv-thumb";
        photoCell.appendChild(img);
      }

      const who = td(tr);
      const b = document.createElement("strong");
      b.textContent = p.name || "(no name)";
      who.appendChild(b);
      [p.phone, p.email].forEach((v) => { who.appendChild(document.createElement("br")); who.appendChild(document.createTextNode(v || "")); });

      td(tr, p.service || "");

      const ver = check("Verified: " + (p.name || ""), p.verified);
      td(tr, ver);
      const aad = check("Aadhaar checked: " + (p.name || ""), p.aadhaarVerified);
      td(tr, aad);

      const act = document.createElement("span");
      act.className = "pv-badge" + (p.active ? " ok" : "");
      act.textContent = p.active ? "Active" : "Inactive";
      td(tr, act);

      const rating = numInput("Rating for " + (p.name || ""), p.rating, 0, 5, 0.1);
      td(tr, rating);
      const count = numInput("Services done by " + (p.name || ""), p.servicesCount, 0, 100000, 1);
      td(tr, count);

      const actions = td(tr);
      const save = document.createElement("button");
      save.type = "button"; save.className = "btn btn-small"; save.textContent = "Save";
      save.addEventListener("click", async () => {
        const r = Number(rating.value), c = Number(count.value);
        if (!(r >= 0 && r <= 5) || !Number.isInteger(c) || c < 0) return say(msg, "Rating must be 0 to 5 and services done a whole number.", "error");
        const fields = { verified: ver.checked, aadhaarVerified: aad.checked, rating: Math.round(r * 10) / 10, servicesCount: c };
        if (!ver.checked) fields.active = false; // unverified providers cannot stay active
        save.disabled = true;
        try {
          await A.adminUpdateProvider(p.id, fields);
          Object.assign(p, fields);
          say(msg, "Saved " + (p.name || "provider") + ".", "ok");
          render();
        } catch (_) {
          say(msg, "Could not save. Check your Firestore rules.", "error");
          save.disabled = false;
        }
      });
      const det = document.createElement("button");
      det.type = "button"; det.className = "btn btn-small btn-ghost"; det.textContent = "Details";
      det.addEventListener("click", () => openDetail(p));
      actions.append(save, document.createTextNode(" "), det);

      body.appendChild(tr);
    });
    $("pr-count").textContent = shown.length + " of " + rows.length + " providers";
  }

  async function load() {
    say(msg, "Loading providers...");
    try {
      rows = await A.listProviders();
      loaded = true;
      say(msg, "");
      render();
    } catch (_) {
      say(msg, "Could not load providers. Check that the Firestore rules from SETUP.md are published.", "error");
    }
  }

  // ---- Details and payments ----
  function openDetail(p) {
    current = p;
    $("pr-d-title").textContent = p.name || "Provider details";
    const dl = $("pr-d-list");
    dl.textContent = "";
    const mask = (v) => (v ? v : "-");
    [
      ["Phone", p.phone], ["Email", p.email], ["Service", p.service], ["Address", p.address],
      ["Details / pricing / quotation", p.details],
      ["PAN", p.pan], ["Aadhaar (last 4)", p.aadhaarLast4],
      ["Account holder", p.accountHolder], ["Bank", p.bankName], ["Account number", p.accountNumber],
      ["IFSC", p.ifsc], ["UPI ID", p.upi],
    ].forEach(([k, v]) => {
      const dt = document.createElement("dt"); dt.textContent = k;
      const dd = document.createElement("dd"); dd.textContent = mask(v);
      dl.append(dt, dd);
    });
    $("pr-detail").hidden = false;
    $("pr-detail").scrollIntoView({ behavior: "smooth", block: "start" });
    loadPayments();
    loadAttachments();
  }

  async function loadAttachments() {
    const ul = $("pr-att-list");
    ul.textContent = "";
    try {
      const items = await A.listAttachments(current.id);
      if (!items.length) { const li = document.createElement("li"); li.textContent = "None"; ul.appendChild(li); return; }
      window.dwAttach.render(ul, items);
    } catch (_) {
      const li = document.createElement("li");
      li.textContent = "Could not load attachments.";
      ul.appendChild(li);
    }
  }

  async function loadPayments() {
    const pb = $("pr-pay-body");
    pb.textContent = "";
    try {
      const list = await A.adminListPayments(current.id);
      list.forEach((x) => {
        const tr = document.createElement("tr");
        [x.date, x.time, x.service, "₹" + (Number(x.amount) || 0).toLocaleString("en-IN"), x.note].forEach((v) => td(tr, v || ""));
        pb.appendChild(tr);
      });
    } catch (_) {
      say($("pr-pay-status"), "Could not load payments.", "error");
    }
  }

  $("pr-pay-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target.elements;
    const amount = Number(f.amount.value);
    if (!current || !(amount > 0) || !f.date.value || !f.time.value || !f.service.value) {
      return say($("pr-pay-status"), "Enter amount, date, time and service type.", "error");
    }
    try {
      await A.adminAddPayment(current.id, {
        amount, date: f.date.value, time: f.time.value, service: f.service.value, note: f.note.value.trim(),
      });
      e.target.reset();
      say($("pr-pay-status"), "Payment added.", "ok");
      loadPayments();
    } catch (_) {
      say($("pr-pay-status"), "Could not add payment. Check your Firestore rules.", "error");
    }
  });

  $("pr-d-close").addEventListener("click", () => { $("pr-detail").hidden = true; current = null; });
  $("pr-search").addEventListener("input", render);
  $("pr-service").addEventListener("change", render);
  $("pr-filter").addEventListener("change", render);
  $("pr-refresh").addEventListener("click", load);
})();
