(function () {
  const A = window.dwAuth;
  const form = document.getElementById("auth-form");
  const status = document.getElementById("a-status");
  const submit = document.getElementById("a-submit");
  const tabLogin = document.getElementById("tab-login");
  const tabSignup = document.getElementById("tab-signup");
  let mode = "login";

  // Only allow redirects to pages on this site.
  const nextParam = new URLSearchParams(location.search).get("next");
  const next = nextParam && /^[a-z0-9_-]+\.html$/i.test(nextParam) ? nextParam : "booking.html";

  if (!A.configured) document.getElementById("config-note").hidden = false;

  function setMode(m) {
    mode = m;
    const signup = m === "signup";
    tabLogin.classList.toggle("active", !signup);
    tabSignup.classList.toggle("active", signup);
    tabLogin.setAttribute("aria-selected", String(!signup));
    tabSignup.setAttribute("aria-selected", String(signup));
    form.querySelectorAll("[data-signup]").forEach((el) => (el.hidden = !signup));
    form.elements.password.autocomplete = signup ? "new-password" : "current-password";
    submit.textContent = signup ? "Create account" : "Login";
    say("");
  }
  tabLogin.addEventListener("click", () => setMode("login"));
  tabSignup.addEventListener("click", () => setMode("signup"));

  function say(msg, kind) {
    status.textContent = msg;
    status.className = "form-status" + (kind ? " " + kind : "");
  }

  function friendly(err) {
    const map = {
      "auth/invalid-credential": "Email or password is incorrect.",
      "auth/wrong-password": "Email or password is incorrect.",
      "auth/user-not-found": "Email or password is incorrect.",
      "auth/email-already-in-use": "An account with this email already exists. Try logging in.",
      "auth/weak-password": "Password must be at least 6 characters.",
      "auth/invalid-email": "Please enter a valid email address.",
      "auth/popup-closed-by-user": "Google sign-in was cancelled.",
      "auth/too-many-requests": "Too many attempts. Please try again later.",
    };
    return map[err && err.code] || "Something went wrong. Please try again.";
  }

  async function run(fn) {
    if (!A.configured) return say("Login is not switched on yet. Add Firebase keys in config.js.", "error");
    submit.disabled = true;
    say("Please wait...");
    try {
      await fn();
      say("Success. Redirecting...", "ok");
      location.href = next;
    } catch (err) {
      say(friendly(err), "error");
    } finally {
      submit.disabled = false;
    }
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = form.elements;
    const email = f.email.value.trim();
    const pw = f.password.value;
    if (!email || !pw) return say("Enter your email and password.", "error");
    if (mode === "signup") run(() => A.signUp(f.name.value.trim(), email, pw));
    else run(() => A.signIn(email, pw));
  });

  document.getElementById("a-google").addEventListener("click", () => run(() => A.google()));

  document.getElementById("a-forgot").addEventListener("click", async (e) => {
    e.preventDefault();
    const email = form.elements.email.value.trim();
    if (!email) return say("Type your email above, then click Forgot password.", "error");
    if (!A.configured) return say("Login is not switched on yet.", "error");
    try {
      await A.reset(email);
      say("Password reset email sent. Check your inbox.", "ok");
    } catch (err) {
      say(friendly(err), "error");
    }
  });

  A.onChange((user) => {
    if (user && !status.textContent) say("You are signed in as " + (user.displayName || user.email) + ".", "ok");
  });
})();
