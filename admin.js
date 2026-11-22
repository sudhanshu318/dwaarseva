(function () {
  const A = window.dwAuth;
  const msg = document.getElementById("ad-msg");
  const panel = document.getElementById("ad-panel");
  const body = document.getElementById("ad-body");
  const count = document.getElementById("ad-count");
  const search = document.getElementById("ad-search");
  const filter = document.getElementById("ad-filter");
  const STATUSES = ["requested", "confirmed", "completed", "cancelled"];
  let rows = [];

  function say(text, kind) {
    msg.className = "form-status" + (kind ? " " + kind : "");
    msg.textContent = text;
    msg.hidden = !text;
  }

  function when(b) {
    return b.createdAt && b.createdAt.toDate ? b.createdAt.toDate().toLocaleString() : "";
  }

  function cell(tr, lines) {
    const td = document.createElement("td");
    lines.forEach((l, i) => {
      if (i) td.appendChild(document.createElement("br"));
      td.appendChild(document.createTextNode(l || ""));
    });
    tr.appendChild(td);
    return td;
  }

  function matches(b) {
    const s = filter.value;
    if (s && b.status !== s) return false;
    const q = search.value.trim().toLowerCase();
    if (!q) return true;
    return [b.name, b.phone, b.email, b.community, b.flat, b.service].some((v) => String(v || "").toLowerCase().includes(q));
  }

  function render() {
    body.textContent = "";
    const shown = rows.filter(matches);
    shown.forEach((b) => {
      const tr = document.createElement("tr");
      cell(tr, [when(b), b.updatedAt && b.updatedAt.toDate ? "Edited " + b.updatedAt.toDate().toLocaleString() : ""]);
      cell(tr, [b.name, b.email]);
      const phone = cell(tr, []);
      const a = document.createElement("a");
      a.textContent = b.phone || "";
      a.href = "tel:" + String(b.phone || "").replace(/[^\d+]/g, "");
      phone.appendChild(a);
      cell(tr, [b.service, b.plan]);
      cell(tr, [b.date, b.slot]);
      cell(tr, [b.community, b.flat]);
      cell(tr, [b.message]);
      const td = document.createElement("td");
      const sel = document.createElement("select");
      sel.setAttribute("aria-label", "Status for " + (b.name || "booking"));
      STATUSES.forEach((s) => {
        const o = document.createElement("option");
        o.textContent = s;
        o.selected = s === b.status;
        sel.appendChild(o);
      });
      sel.addEventListener("change", async () => {
        const prev = b.status;
        sel.disabled = true;
        try {
          await A.updateBookingStatus(b.id, sel.value);
          b.status = sel.value;
        } catch (_) {
          sel.value = prev;
          say("Could not update status. Check your Firestore rules.", "error");
        } finally {
          sel.disabled = false;
        }
      });
      td.appendChild(sel);
      tr.appendChild(td);
      body.appendChild(tr);
    });
    count.textContent = shown.length + " of " + rows.length + " bookings";
  }

  async function load() {
    say("Loading bookings...");
    try {
      rows = await A.listAllBookings();
      say("");
      render();
    } catch (_) {
      say("Could not load bookings. Check that the Firestore rules from SETUP.md are published.", "error");
    }
  }

  function csvCell(v) {
    let s = String(v == null ? "" : v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // stop spreadsheet formula injection
    return '"' + s.replace(/"/g, '""') + '"';
  }

  document.getElementById("ad-csv").addEventListener("click", () => {
    const head = ["Received", "Name", "Email", "Phone", "Service", "Plan", "Start date", "Slot", "Community", "Flat", "Notes", "Status"];
    const lines = [head.map(csvCell).join(",")];
    rows.filter(matches).forEach((b) =>
      lines.push([when(b), b.name, b.email, b.phone, b.service, b.plan, b.date, b.slot, b.community, b.flat, b.message, b.status].map(csvCell).join(","))
    );
    const blob = new Blob(["\ufeff" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dwaarseva-bookings.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  search.addEventListener("input", render);
  filter.addEventListener("change", render);
  document.getElementById("ad-refresh").addEventListener("click", load);

  if (!A.configured) {
    say("Login is not switched on. Add Firebase keys in config.js.", "error");
    return;
  }
  A.onChange((user) => {
    panel.hidden = true;
    if (!user) {
      say("");
      const p = document.createElement("span");
      p.appendChild(document.createTextNode("Please "));
      const l = document.createElement("a");
      l.href = "login.html?next=admin.html";
      l.textContent = "log in";
      p.appendChild(l);
      p.appendChild(document.createTextNode(" with the admin account."));
      msg.appendChild(p);
      msg.hidden = false;
    } else if (!A.isAdmin(user)) {
      say("This account (" + user.email + ") does not have admin access.", "error");
    } else {
      panel.hidden = false;
      load();
    }
  });
})();
