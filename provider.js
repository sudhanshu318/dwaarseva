(function () {
  const A = window.dwAuth;
  const $ = (id) => document.getElementById(id);
  const msg = $("pv-msg");
  const panel = $("pv-panel");
  const form = $("pv-form");
  const status = $("pv-status");
  const activeBox = $("pv-active");
  let profile = null;   // null until the provider saves for the first time
  let photoData = "";   // resized JPEG data URL

  function say(el, text, kind) {
    el.className = "form-status" + (kind ? " " + kind : "");
    el.textContent = text;
  }

  // ---- Photo: crop to a square and shrink so it fits inside the profile record ----
  $("pv-f-photo").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!/^image\//.test(file.type) || file.size > 15 * 1024 * 1024) {
      say(status, "Please choose an image file under 15 MB.", "error");
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const size = 256;
      const c = document.createElement("canvas");
      c.width = c.height = size;
      const s = Math.min(img.width, img.height);
      c.getContext("2d").drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      URL.revokeObjectURL(url);
      photoData = c.toDataURL("image/jpeg", 0.8);
      $("pv-photo-prev").src = photoData;
      $("pv-photo-prev").hidden = false;
      say(status, "");
    };
    img.onerror = () => say(status, "Could not read that image.", "error");
    img.src = url;
  });

  // ---- Rendering ----
  function showPhoto(el, src) {
    if (src && /^data:image\/jpeg;base64,/.test(src)) { el.src = src; el.hidden = false; }
    else el.hidden = true;
  }

  function renderStatus() {
    const p = profile;
    $("pv-name").textContent = p && p.name ? p.name : "Your profile";
    showPhoto($("pv-photo-view"), p && p.photo);
    const badge = $("pv-verify");
    const verified = !!(p && p.verified);
    badge.textContent = !p ? "Profile not saved yet" : verified ? "Verified" : "Waiting for verification";
    badge.className = "pv-badge" + (verified ? " ok" : "");
    activeBox.disabled = !verified;
    activeBox.checked = !!(p && p.active);
    $("pv-active-text").textContent = activeBox.checked ? "Active (available for work)" : "Inactive";
    $("pv-active-help").textContent = verified
      ? "Switch on when you are available. Switch off when you are not."
      : "You can switch to Active once the Dwaarseva team has verified you.";
    $("pv-rating").textContent = (p && p.rating ? Number(p.rating).toFixed(1) : "0.0") + " / 5";
    $("pv-count").textContent = String((p && p.servicesCount) || 0);
  }

  function fillForm() {
    const f = form.elements;
    ["name", "phone", "address", "service", "details", "pan", "aadhaarLast4", "accountHolder", "bankName", "accountNumber", "ifsc", "upi"].forEach((k) => {
      f[k].value = (profile && profile[k]) || "";
    });
    if (!profile) f.name.value = (A.user && A.user.displayName) || "";
    photoData = (profile && profile.photo) || "";
    showPhoto($("pv-photo-prev"), photoData);
  }

  async function renderPayments() {
    const body = $("pv-pay-body");
    body.textContent = "";
    if (!profile) { $("pv-pay-total").textContent = ""; return; }
    try {
      const list = await A.listMyPayments();
      let total = 0;
      list.forEach((p) => {
        total += Number(p.amount) || 0;
        const tr = document.createElement("tr");
        [p.date, p.time, p.service, "₹" + (Number(p.amount) || 0).toLocaleString("en-IN"), p.note].forEach((v) => {
          const td = document.createElement("td");
          td.textContent = v || "";
          tr.appendChild(td);
        });
        body.appendChild(tr);
      });
      $("pv-pay-total").textContent = list.length
        ? list.length + " payments, total ₹" + total.toLocaleString("en-IN")
        : "No payments recorded yet.";
    } catch (_) {
      $("pv-pay-total").textContent = "Could not load payments.";
    }
  }

  // ---- Validation ----
  function validate(d) {
    const bad = [];
    if (!d.name) bad.push("name");
    if (!/^[+\d][\d\s-]{6,}$/.test(d.phone)) bad.push("phone");
    if (!d.address) bad.push("address");
    if (!d.service) bad.push("service");
    if (d.details.length > 1000) bad.push("details");
    if (d.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(d.pan)) bad.push("pan");
    if (d.aadhaarLast4 && !/^\d{4}$/.test(d.aadhaarLast4)) bad.push("aadhaarLast4");
    if (d.ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(d.ifsc)) bad.push("ifsc");
    if (d.accountNumber && !/^\d{9,18}$/.test(d.accountNumber)) bad.push("accountNumber");
    if (d.upi && !/^[\w.\-]{2,}@[A-Za-z]{2,}$/.test(d.upi)) bad.push("upi");
    return bad;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = form.elements;
    const d = {
      name: f.name.value.trim(), phone: f.phone.value.trim(), address: f.address.value.trim(),
      service: f.service.value, details: f.details.value.trim(),
      pan: f.pan.value.trim().toUpperCase(), aadhaarLast4: f.aadhaarLast4.value.trim(),
      accountHolder: f.accountHolder.value.trim(), bankName: f.bankName.value.trim(),
      accountNumber: f.accountNumber.value.trim(), ifsc: f.ifsc.value.trim().toUpperCase(),
      upi: f.upi.value.trim(), photo: photoData,
    };
    const bad = validate(d);
    [...form.elements].forEach((el) => el.name && el.setAttribute("aria-invalid", String(bad.includes(el.name))));
    if (bad.length) return say(status, "Please correct the highlighted fields.", "error");
    if (d.photo.length > 190000) return say(status, "Photo is too large. Please pick a different photo.", "error");

    const btn = $("pv-save");
    btn.disabled = true;
    say(status, "Saving...");
    try {
      if (profile) await A.updateProvider(d);
      else await A.createProvider(d);
      profile = await A.getProvider();
      renderStatus();
      renderPayments();
      loadAttachments();
      say(status, "Profile saved.", "ok");
    } catch (_) {
      say(status, "Could not save. Please try again or call the Dwaarseva team.", "error");
    } finally {
      btn.disabled = false;
    }
  });

  activeBox.addEventListener("change", async () => {
    const want = activeBox.checked;
    activeBox.disabled = true;
    try {
      await A.setProviderActive(want);
      profile.active = want;
    } catch (_) {
      activeBox.checked = !want;
      say(msg, "Could not change your status. Please try again.", "error");
    } finally {
      renderStatus();
    }
  });

  // ---- Attachments ----
  const attInput = $("pv-att-file");
  const attStatus = $("pv-att-status");
  let attCount = 0;

  async function loadAttachments() {
    const ul = $("pv-att-list");
    ul.textContent = "";
    attInput.disabled = !profile;
    $("pv-att-note").textContent = profile ? "" : "Save your profile first, then you can attach files.";
    if (!profile) return;
    try {
      const items = await A.listAttachments();
      attCount = items.length;
      window.dwAttach.render(ul, items, async (it) => {
        if (!confirm("Remove " + (it.name || "this file") + "?")) return;
        try { await A.deleteAttachment(it.id); loadAttachments(); }
        catch (_) { say(attStatus, "Could not remove the file.", "error"); }
      });
    } catch (_) {
      say(attStatus, "Could not load attachments.", "error");
    }
  }

  attInput.addEventListener("change", async () => {
    const file = attInput.files[0];
    attInput.value = "";
    if (!file || !profile) return;
    if (attCount >= window.dwAttach.MAX_FILES) return say(attStatus, "You can attach up to " + window.dwAttach.MAX_FILES + " files. Remove one first.", "error");
    say(attStatus, "Uploading...");
    try {
      const a = await window.dwAttach.fromFile(file);
      await A.addAttachment(a);
      say(attStatus, "Attached " + a.name + ".", "ok");
      loadAttachments();
    } catch (err) {
      say(attStatus, err && err.message && !/permission/i.test(err.message) ? err.message : "Could not attach the file.", "error");
    }
  });

  // ---- Start ----
  if (!A.configured) {
    say(msg, "Login is not switched on. Add Firebase keys in config.js.", "error");
    return;
  }
  A.onChange(async (user) => {
    panel.hidden = true;
    if (!user) {
      say(msg, "");
      msg.appendChild(document.createTextNode("Please "));
      const l = document.createElement("a");
      l.href = "provider-login.html";
      l.textContent = "log in as a service provider";
      msg.appendChild(l);
      msg.appendChild(document.createTextNode("."));
      return;
    }
    try {
      profile = await A.getProvider();
      say(msg, profile ? "" : "Welcome! Fill in your profile and save it. The Dwaarseva team will then verify you.");
      msg.hidden = !!profile;
      fillForm();
      renderStatus();
      panel.hidden = false;
      renderPayments();
      loadAttachments();
    } catch (_) {
      say(msg, "Could not load your profile. Check that the Firestore rules from SETUP.md are published.", "error");
    }
  });
})();
