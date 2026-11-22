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
    function isAdmin() {
      return request.auth != null
        && request.auth.token.email in ['dwaarseva@gmail.com']
        && request.auth.token.email_verified == true;
    }
    match /bookings/{id} {
      allow create: if request.auth != null
        && request.resource.data.uid == request.auth.uid
        && request.resource.data.status == 'requested';
      allow read: if request.auth != null
        && (resource.data.uid == request.auth.uid || isAdmin());
      // Admin: may change the status only.
      allow update: if isAdmin()
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status']);
      // Owner: may edit details or cancel, while the booking is open.
      allow update: if request.auth != null
        && resource.data.uid == request.auth.uid
        && resource.data.status in ['requested', 'confirmed']
        && request.resource.data.diff(resource.data).affectedKeys()
             .hasOnly(['plan', 'date', 'slot', 'community', 'flat', 'message', 'status', 'updatedAt'])
        && (request.resource.data.status == resource.data.status
            || request.resource.data.status == 'cancelled');
      allow delete: if false;
    }
  }
}
```

## Admin page
`admin.html` lists every booking for the accounts in `adminEmails` in `config.js`.
Log in with one of those accounts, then open `/admin.html` (an "Admin" link also appears in the menu).
If you change the admin emails, change them in both `config.js` and the `isAdmin()` rule above.

## Customer changes
Signed-in customers can edit or cancel their own open bookings from `booking.html` ("Your recent bookings").
The team gets a Formspree email whenever a booking is changed or cancelled.
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
