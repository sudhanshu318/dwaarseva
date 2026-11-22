# Dwaarseva site setup

## 1. Turn on login and booking history (Firebase)
1. Create a project at https://console.firebase.google.com and add a Web app.
2. Authentication > Sign-in method: enable **Email/Password** and **Google**.
3. Authentication > Settings > Authorized domains: add `dwaarseva.com`.
4. Create a **Firestore** database, then set these rules so users can only read and write their own bookings:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /users/{uid}/bookings/{id} {
      allow read, create: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```
5. Copy the web app config values into `config.js` (`apiKey`, `authDomain`, `projectId`, `appId`).
   These keys are meant to be public; the rules above protect the data.

## 2. Replace placeholders
- `config.js`: social profile URLs, phone, email.
- `index.html`, section `#pricing`: sample prices.
- `chatbot.js`: edit the `INTENTS` list to change bot answers.

## Pages
- `index.html` home, pricing, quick request form
- `booking.html` 3-step booking (guests allowed; logged-in users get saved history)
- `login.html` login, sign up, Google, password reset
- `providers.html` provider information and application form
