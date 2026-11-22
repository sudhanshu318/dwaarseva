// Built-in rule-based chatbot. Edit the INTENTS list to change answers.
(function () {
  const C = window.DWAARSEVA || {};

  const INTENTS = [
    { keys: ["hi", "hello", "hey", "namaste"], text: "Hello! I can help with services, pricing, booking and joining as a provider. What would you like to know?" },
    { keys: ["price", "pricing", "cost", "rate", "plan", "fee", "charge"], text: "Prices depend on the service and plan (daily, weekly or monthly). Monthly plans give the best value.", links: [{ label: "See pricing", href: "index.html#pricing" }] },
    { keys: ["book", "booking", "hire", "appointment", "need"], text: "You can book in three quick steps.", links: [{ label: "Book a service", href: "booking.html" }] },
    { keys: ["maid", "clean", "housekeeping", "laundry"], text: "Our maids handle cleaning, utensils, laundry and daily housekeeping.", links: [{ label: "Book a maid", href: "booking.html?service=Maid%20services" }] },
    { keys: ["cook", "cooking", "chef"], text: "We have daily, part-time and party cooks matched to your kitchen and taste.", links: [{ label: "Book a cook", href: "booking.html?service=Cook" }] },
    { keys: ["food", "meal", "tiffin", "home-made", "homemade"], text: "Fresh, hygienic home-made meals prepared by neighbours and delivered to you.", links: [{ label: "Order food", href: "booking.html?service=Home-made%20food" }] },
    { keys: ["driver", "drive", "car"], text: "Daily, outstation and on-demand drivers are available.", links: [{ label: "Book a driver", href: "booking.html?service=Driver" }] },
    { keys: ["delivery", "parcel", "grocery", "groceries", "errand"], text: "We handle groceries, parcels and errands within your community.", links: [{ label: "Book delivery", href: "booking.html?service=Delivery%20services" }] },
    { keys: ["buy", "sell", "second", "resale"], text: "Residents can buy and sell household items through our neighbourhood service.", links: [{ label: "Ask about buy and sell", href: "booking.html?service=Buy%20and%20sell" }] },
    { keys: ["verify", "verified", "safe", "safety", "trust", "background"], text: "Every helper is identity-checked, referenced and trained before they come to your door." },
    { keys: ["replace", "replacement", "absent", "leave", "unavailable"], text: "If your helper is unavailable, we send a replacement quickly." },
    { keys: ["join", "provider", "job", "work", "apply", "career"], text: "Want to work with us? Apply as a service provider.", links: [{ label: "Join as a provider", href: "providers.html#join" }] },
    { keys: ["login", "log in", "sign in", "signup", "sign up", "account", "register"], text: "Create an account to save your details and see your bookings.", links: [{ label: "Login or sign up", href: "login.html" }] },
    { keys: ["contact", "call", "phone", "email", "whatsapp", "talk", "human", "support"], text: "You can reach us at " + (C.phone || "") + " or " + (C.email || "") + ".", links: [{ label: "Chat on WhatsApp", href: "https://wa.me/" + (C.whatsapp || "") }] },
  ];
  const FALLBACK = { text: "I am not sure about that. Try one of the options below, or talk to our team.", links: [{ label: "Chat on WhatsApp", href: "https://wa.me/" + (C.whatsapp || "") }] };
  const QUICK = ["Services", "Pricing", "Book a service", "Join as provider", "Contact"];
  const QUICK_MAP = { "Services": "services", "Pricing": "pricing", "Book a service": "book", "Join as provider": "join", "Contact": "contact" };

  function reply(input) {
    const words = input.toLowerCase();
    if (/\bservices?\b/.test(words) && !/(maid|cook|driver)/.test(words)) {
      return { text: "We offer maids, cooks, home-made food, drivers, delivery, buy and sell, and other home services.", links: [{ label: "View services", href: "index.html#services" }] };
    }
    let best = null, score = 0;
    INTENTS.forEach((it) => {
      const s = it.keys.filter((k) => new RegExp("\\b" + k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + (k.length <= 3 ? "\\b" : "")).test(words)).length;
      if (s > score) { score = s; best = it; }
    });
    return best || FALLBACK;
  }

  // UI
  const btn = document.createElement("button");
  btn.className = "fab fab-chat";
  btn.setAttribute("aria-label", "Open chat");
  btn.setAttribute("aria-expanded", "false");
  btn.textContent = "Chat";

  const panel = document.createElement("section");
  panel.className = "chat";
  panel.hidden = true;
  panel.setAttribute("aria-label", "Dwaarseva assistant");

  const head = document.createElement("div");
  head.className = "chat-head";
  head.textContent = "Dwaarseva assistant";
  const close = document.createElement("button");
  close.type = "button";
  close.setAttribute("aria-label", "Close chat");
  close.textContent = "×";
  head.appendChild(close);

  const log = document.createElement("div");
  log.className = "chat-log";
  log.setAttribute("role", "log");
  log.setAttribute("aria-live", "polite");

  const quick = document.createElement("div");
  quick.className = "chat-quick";

  const form = document.createElement("form");
  form.className = "chat-form";
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Type your question";
  input.setAttribute("aria-label", "Your message");
  input.maxLength = 200;
  const send = document.createElement("button");
  send.type = "submit";
  send.textContent = "Send";
  form.append(input, send);

  panel.append(head, log, quick, form);
  document.body.append(panel, btn);

  function add(who, res) {
    const m = document.createElement("div");
    m.className = "msg " + who;
    const t = document.createElement("span");
    t.textContent = typeof res === "string" ? res : res.text;
    m.appendChild(t);
    if (res.links) {
      res.links.forEach((l) => {
        const a = document.createElement("a");
        a.href = l.href;
        a.textContent = l.label;
        if (/^https?:/.test(l.href)) { a.target = "_blank"; a.rel = "noopener noreferrer"; }
        m.appendChild(a);
      });
    }
    log.appendChild(m);
    log.scrollTop = log.scrollHeight;
  }

  function ask(text) {
    add("user", text);
    setTimeout(() => add("bot", reply(text)), 250);
  }

  QUICK.forEach((q) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = q;
    b.addEventListener("click", () => ask(QUICK_MAP[q] === "services" ? "services" : q));
    quick.appendChild(b);
  });

  function toggle(open) {
    panel.hidden = !open;
    btn.setAttribute("aria-expanded", String(open));
    if (open) {
      if (!log.children.length) add("bot", "Hi! I am the Dwaarseva assistant. How can I help?");
      input.focus();
    } else btn.focus();
  }
  btn.addEventListener("click", () => toggle(panel.hidden));
  close.addEventListener("click", () => toggle(false));
  panel.addEventListener("keydown", (e) => { if (e.key === "Escape") toggle(false); });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const v = input.value.trim();
    if (!v) return;
    input.value = "";
    ask(v);
  });
})();
