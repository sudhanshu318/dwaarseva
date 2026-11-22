// Firebase Authentication + Firestore wrapper.
// Works without keys: pages show a notice and the rest of the site still functions.
(function () {
  const cfg = (window.DWAARSEVA || {}).firebase || {};
  const configured = !!cfg.apiKey && !/^YOUR_/.test(cfg.apiKey) && typeof firebase !== "undefined";

  const listeners = [];
  const api = {
    configured,
    user: null,
    onChange(cb) { listeners.push(cb); cb(api.user); },
  };
  window.dwAuth = api;

  const authLink = document.getElementById("auth-link");
  function paintHeader(user) {
    if (!authLink) return;
    if (user) {
      authLink.textContent = "Logout";
      authLink.href = "#";
      authLink.onclick = (e) => { e.preventDefault(); api.signOut().then(() => (location.href = "index.html")); };
    } else {
      authLink.textContent = "Login";
      authLink.href = "login.html";
      authLink.onclick = null;
    }
  }
  paintHeader(null);
  if (!configured) return;

  firebase.initializeApp(cfg);
  const auth = firebase.auth();
  const db = firebase.firestore();

  api.signIn = (email, pw) => auth.signInWithEmailAndPassword(email, pw);
  api.signUp = async (name, email, pw) => {
    const cred = await auth.createUserWithEmailAndPassword(email, pw);
    if (name) await cred.user.updateProfile({ displayName: name });
    return cred;
  };
  api.google = () => auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
  api.reset = (email) => auth.sendPasswordResetEmail(email);
  api.signOut = () => auth.signOut();

  // All bookings live in one top-level collection. Firestore rules (see SETUP.md) let
  // owners read their own bookings and let only the admin email read or change all of them.
  const adminEmails = [].concat((window.DWAARSEVA || {}).adminEmails || []).map((e) => String(e).toLowerCase());
  api.isAdmin = (u) => !!u && !!u.email && u.emailVerified && adminEmails.includes(u.email.toLowerCase());
  const ts = (b) => (b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : Date.now());

  api.saveBooking = (data) =>
    db.collection("bookings").add({
      ...data,
      uid: api.user.uid,
      email: api.user.email || "",
      status: "requested",
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  api.listBookings = async () => {
    const snap = await db.collection("bookings").where("uid", "==", api.user.uid).get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => ts(b) - ts(a)).slice(0, 20);
  };
  // Owner edits: only these fields can change (enforced by Firestore rules).
  const EDITABLE = ["plan", "date", "slot", "community", "flat", "message"];
  api.updateMyBooking = (id, fields) => {
    const clean = {};
    EDITABLE.forEach((k) => { if (k in fields) clean[k] = fields[k]; });
    clean.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
    return db.collection("bookings").doc(id).update(clean);
  };
  api.cancelMyBooking = (id) =>
    db.collection("bookings").doc(id).update({
      status: "cancelled",
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  // Admin only (enforced by Firestore rules).
  api.listAllBookings = async () => {
    const snap = await db.collection("bookings").orderBy("createdAt", "desc").limit(500).get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  };
  api.updateBookingStatus = (id, status) => db.collection("bookings").doc(id).update({ status });

  auth.onAuthStateChanged((user) => {
    api.user = user;
    paintHeader(user);
    const old = document.getElementById("admin-link");
    if (old) old.remove();
    if (api.isAdmin(user) && authLink) {
      const a = document.createElement("a");
      a.id = "admin-link";
      a.href = "admin.html";
      a.textContent = "Admin";
      authLink.parentNode.insertBefore(a, authLink);
    }
    listeners.forEach((cb) => cb(user));
  });
})();
