# Dwaarseva site setup

## 1. Firebase (login, bookings, providers)
1. Create a project at https://console.firebase.google.com and add a Web app.
2. Authentication > Sign-in method: enable **Email/Password** and **Google**.
3. Authentication > Settings > Authorized domains: add `dwaarseva.com`.
4. Copy the web app config values into `config.js` (`apiKey`, `authDomain`, `projectId`, `appId`).
   These keys are meant to be public; the rules below protect the data.
5. Create a **Firestore** database (Production mode), open the **Rules** tab, paste the rules below and **Publish**.
   If you change the admin email, change it here and in `adminEmails` in `config.js`.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    function isAdmin() {
      return request.auth != null
        && request.auth.token.email in ['dwaarseva@gmail.com']
        && request.auth.token.email_verified == true;
    }

    // ---- Customer bookings ----
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

    // ---- Service providers ----
    match /providers/{uid} {
      // A provider creates their own profile, always unverified and inactive.
      allow create: if request.auth != null && request.auth.uid == uid
        && request.resource.data.uid == uid
        && request.resource.data.verified == false
        && request.resource.data.aadhaarVerified == false
        && request.resource.data.active == false
        && request.resource.data.rating == 0
        && request.resource.data.servicesCount == 0
        && (!('photo' in request.resource.data) || request.resource.data.photo.size() < 200000);
      // Only the provider and admins can read a profile (it holds ID and bank details).
      allow read: if request.auth != null && (request.auth.uid == uid || isAdmin());
      allow update: if isAdmin()
        || (request.auth != null && request.auth.uid == uid
            && request.resource.data.diff(resource.data).affectedKeys().hasOnly([
                 'name', 'phone', 'address', 'service', 'details', 'pan', 'aadhaarLast4',
                 'accountHolder', 'accountNumber', 'ifsc', 'bankName', 'upi',
                 'photo', 'active', 'updatedAt'])
            // "active" can change only after the admin has verified the provider.
            && (request.resource.data.active == resource.data.active || resource.data.verified == true)
            && (!('photo' in request.resource.data) || request.resource.data.photo.size() < 200000)
            && (!('details' in request.resource.data) || request.resource.data.details.size() <= 1000));
      allow delete: if false;

      // Attachments (quotations, price lists, images, PDFs stored as data URLs).
      match /attachments/{aid} {
        allow read, delete: if request.auth != null && (request.auth.uid == uid || isAdmin());
        allow create: if request.auth != null && request.auth.uid == uid
          && request.resource.data.keys().hasOnly(['name', 'type', 'size', 'data', 'createdAt'])
          && request.resource.data.type in ['image/jpeg', 'application/pdf']
          && request.resource.data.data.size() < 900000;
        allow update: if false;
      }

      // Payment records: written by admins, readable by that provider.
      match /payments/{pid} {
        allow read: if request.auth != null && (request.auth.uid == uid || isAdmin());
        allow create, update, delete: if isAdmin();
      }
    }
  }
}
```

## 2. Replace placeholders
- `config.js`: social profile URLs, phone, email.
- `index.html`, section `#pricing`: sample prices.
- `chatbot.js`: edit the `INTENTS` list to change bot answers.

## Pages
- `index.html` home, pricing, quick request form
- `booking.html` 3-step booking (guests allowed; logged-in users get saved history, edit and cancel)
- `login.html` customer login, sign up, Google, password reset
- `providers.html` information for people who want to work with Dwaarseva, plus an application form
- `provider-login.html` provider login and sign up
- `provider.html` provider dashboard: profile, ID and bank details, active switch, rating, services done, payments
- `admin.html` admin: Bookings tab and Providers tab

## Provider flow
1. A provider signs up at `provider-login.html` and saves their profile (Aadhaar: last 4 digits only).
2. In `admin.html`, Providers tab, the admin checks documents in person, then ticks **Verified** (and **Aadhaar checked**) and clicks **Save**.
3. The provider can now switch **Active** on when available. Use the filter "Available now" to see active, verified providers by service.
4. The admin sets rating and services done, and adds payment records (amount, date, time, service) under **Details**. Providers see these on their dashboard.
