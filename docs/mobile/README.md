# Marcipano Community

Mobile-first Android app (Capacitor + React) for a political party to send announcements to members. Offline-first with background sync.

## Quick start

```bash
cd client
npm install
cp .env.example .env        # set VITE_API_URL
npm run dev                 # local browser dev

npm run cap:sync            # build + sync to android/
npm run cap:open            # open Android Studio to build/sign APK
```

## Stack

| Layer | Tech |
|---|---|
| Mobile shell | Capacitor v6 (Android) |
| Frontend | React 18 + TypeScript + Vite |
| Offline DB | Dexie.js (IndexedDB) |
| PWA | vite-plugin-pwa + Workbox |
| Push | Firebase Cloud Messaging (Capacitor plugin) |
| Backend | .NET 9 ASP.NET, N-tier |
| ORM | EF Core 9 |

## V1 features
- Announcements feed (offline-readable, delta sync)
- Like / unlike (optimistic, syncs when online)
- File attachments (upload on compose, download on detail)
- Targeting by level / role / territory unit
- FCM push notifications (new announcement)
- Sideload APK distribution

## Project structure
See `CLAUDE.md` for full architecture, conventions, and task recipes.

## Backend API contract

### GET /api/sync?since={iso}
Returns delta since timestamp. Filters announcements by member level + territory.

### POST /api/announcements
Create announcement. Body includes `attachmentIds[]` from prior upload calls.

### POST /api/attachments/upload
Multipart upload, max 10 MB, any file type. Returns `{ id, fileName, fileUrl, fileSize, mimeType }`.

### POST /api/announcements/{id}/like
### DELETE /api/announcements/{id}/like

### POST /api/notifications/subscribe
Body: `{ fcmToken }` — registers device for push.

### DELETE /api/notifications/unsubscribe
Body: `{ fcmToken }` — removes device.
