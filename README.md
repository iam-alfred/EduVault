# EduVault Version 2

Version 2 turns the original browser-only prototype into a small full-stack app.

## Included
- Real PDF uploads through `/admin`
- Server-side PDF storage in `uploads/`
- Admin login using environment variables
- Delete materials from the dashboard
- Public material search
- Real server-controlled PDF downloads
- Download counters
- JSON metadata store for an easy local prototype
- AI endpoint boundary that keeps future API keys on the server
- Mobile-friendly frontend based on Version 1

## Requirements
Node.js 18+

## Run locally
1. Open a terminal in this folder.
2. Run `npm install`.
3. Copy `.env.example` to `.env`.
4. Change `ADMIN_PASSWORD` and `SESSION_SECRET`.
5. Run `npm start`.
6. Open `http://localhost:3000`.
7. Open `http://localhost:3000/admin` to upload PDFs.

Default development login if you do not create `.env`:
- username: `admin`
- password: `change-this-password`

Change these before putting the site online.

## Important production notes
This version is intentionally a local/server prototype. Before public deployment, move PDF storage to object storage, use HTTPS, set secure cookies, use a real database, add rate limiting/CSRF protection, and use a proper admin identity system.

The AI route is server-side by design. Do not put an AI API key in `public/script.js` or any browser file.
