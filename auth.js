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

  // Saved under the signed-in user. Firestore rules should restrict access to the owner.
  api.saveBooking = (data) =>
    db.collection("users").doc(api.user.uid).collection("bookings").add({
      ...data,
      status: "requested",
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  api.listBookings = async () => {
    const snap = await db.collection("users").doc(api.user.uid).collection("bookings").orderBy("createdAt", "desc").limit(20).get();
    return snap.docs.map((d) => d.data());
  };

  auth.onAuthStateChanged((user) => {
    api.user = user;
    paintHeader(user);
    listeners.forEach((cb) => cb(user));
  });
})();
