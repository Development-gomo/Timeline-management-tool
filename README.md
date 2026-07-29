# Webdev Project Management

Internal React/Vite tool for managing website projects, timelines, team members, app users, profile passwords, and activity logs.

## Features

- Firebase email/password login and Firestore-backed shared workspace state
- Project dashboard with active, completed, and upcoming project views
- Project create/edit workflows with assigned team members
- Project timeline and base timeline template management
- Team member directory with department/status filters
- User management with role-based access:
  - User: project/team workflows, user list visibility, create user-level accounts
  - Admin: user permissions plus project deletion and user/admin account creation
  - Super admin: admin permissions plus super-admin account management
- My Profile password update page
- Activity log history

## Tech Stack

- React
- Vite
- Tailwind CSS
- Firebase Auth
- Firestore
- dhtmlx-gantt

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a local environment file:

```bash
cp .env.example .env.local
```

3. Fill `.env.local` with your Firebase project values:

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_SUPER_ADMIN_EMAILS=
FIREBASE_API_KEY=
RESEND_API_KEY=
RESEND_FROM_EMAIL="GomoGroup Portal <portal@your-verified-domain.com>"
PORTAL_URL=https://your-portal-domain.com
TIMELINE_NOTIFICATION_EMAIL=project-manager@example.com
CRON_SECRET=use_a_random_secret_with_at_least_16_characters
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@example-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

`FIREBASE_API_KEY` should match `VITE_FIREBASE_API_KEY`. The server-side copy is
used to verify the signed-in Firebase user before sending email. `RESEND_FROM_EMAIL`
must use a domain verified in Resend.

The production deployment runs `/api/cron/timeline-notifications` every weekday
at 03:30 UTC (09:00 IST). `TIMELINE_NOTIFICATION_EMAIL` receives complete
per-project summaries for tasks due in five days and overdue tasks. Each assigned
owner receives a separate project summary containing only their assigned tasks.
Firebase Admin credentials are required so the server-side scheduler can read
projects and record delivery deduplication state.

4. Start local development:

```bash
npm run dev
```

To test the server-side email endpoint locally, run the project with `vercel dev`
so the Vite app and `/api` function are served together.

## Build

```bash
npm run build
```

## Preview Production Build

```bash
npm run preview
```

## Firebase

Firebase config is read from `VITE_FIREBASE_*` environment variables. Do not commit `.env.local`.

The repository includes:

- `firebase.json`
- `firestore.rules`
- `firestore.indexes.json`

## Git Hygiene

Ignored local/generated files include:

- `.env.local`
- `node_modules/`
- `dist/`
- `legacy/`
- `.DS_Store`
