// Shared behaviour for every page: footer year, mobile menu, social links,
// floating WhatsApp button, share button.
(function () {
  const C = window.DWAARSEVA || {};

  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  const toggle = document.querySelector(".nav-toggle");
  const menu = document.getElementById("menu");
  if (toggle && menu) {
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
  }

  // Fill social links from config.js
  document.querySelectorAll("[data-social]").forEach((a) => {
    const url = C.social && C.social[a.dataset.social];
    if (url) {
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
    } else {
      a.hidden = true;
    }
  });

  // Floating WhatsApp button
  if (C.whatsapp) {
    const wa = document.createElement("a");
    wa.className = "fab fab-wa";
    wa.href = "https://wa.me/" + C.whatsapp + "?text=" + encodeURIComponent("Hi Dwaarseva, I need help with a home service.");
    wa.target = "_blank";
    wa.rel = "noopener noreferrer";
    wa.setAttribute("aria-label", "Chat on WhatsApp");
    wa.textContent = "WhatsApp";
    document.body.appendChild(wa);
  }

  // Share button
  document.querySelectorAll("[data-share]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const data = { title: document.title, text: "Trusted home services with Dwaarseva", url: location.origin + "/" };
      try {
        if (navigator.share) await navigator.share(data);
        else {
          await navigator.clipboard.writeText(data.url);
          btn.textContent = "Link copied";
          setTimeout(() => (btn.textContent = "Share this site"), 2000);
        }
      } catch (_) { /* user cancelled */ }
    });
  });
})();

// Installable web app: service worker and "Install app" button.
(function () {
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    });
  }

  const menu = document.getElementById("menu");
  let deferred = null;
  const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  if (!menu || standalone) return;

  const btn = document.createElement("a");
  btn.href = "#";
  btn.id = "install-app";
  btn.className = "btn btn-small";
  btn.textContent = "Install app";
  btn.hidden = true;
  menu.appendChild(btn);

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e;
    btn.hidden = false;
  });
  btn.addEventListener("click", async (e) => {
    e.preventDefault();
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice.catch(() => {});
    deferred = null;
    btn.hidden = true;
  });
  window.addEventListener("appinstalled", () => { btn.hidden = true; });
})();
