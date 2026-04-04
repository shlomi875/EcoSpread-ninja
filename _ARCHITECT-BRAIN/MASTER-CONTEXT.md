# MASTER-CONTEXT – EcoSpread-ninja
> **קרא קובץ זה בתחילת כל שיחה חדשה.**

## Project Identity
- **Name:** EcoSpread-ninja
- **Type:** E-commerce Intelligence Hub לחנויות שעוני יוקרה
- **Domain:** https://EcoSpread-ninja.lodesignlab.com
- **GitHub:** https://github.com/shlomi875/EcoSpread-ninja
- **Server:** Hetzner 77.42.72.207
- **Admin Coolify:** https://admin.lodesignlab.com / lo-work@outlook.co.il / shlomist69
- **Container Registry:** ghcr.io/shlomi875/ecospread-ninja

## Tech Stack
```
Frontend:  React 19 + Vite + TypeScript + Tailwind CSS v4
Backend:   Express.js (server.ts → bundled with esbuild)
Database:  PostgreSQL (Coolify managed) + Drizzle ORM
AI:        Google Gemini (gemini-2.0-flash) via @google/genai
Auth:      JWT + httpOnly cookies
Build:     Vite build (frontend) + esbuild (server)
Deploy:    Docker → GHCR → Coolify webhook
```

## Status Checklist
- [x] Project codebase exists (React + Vite + Express)
- [ ] Database schema created (Drizzle + PostgreSQL)
- [ ] API routes migrated to PostgreSQL
- [ ] Frontend refactored to use API (not React state)
- [ ] File upload system built
- [ ] Dockerfile created
- [ ] GitHub Actions CI/CD created
- [ ] Dev DB created in Coolify
- [ ] Prod DB created in Coolify
- [ ] First deploy live at https://EcoSpread-ninja.lodesignlab.com

## Current Problem (Why Site Needs DB)
המידע (מוצרים, הגדרות, אסטים) נשמר רק ב-React state.
רענון הדף = אובדן כל הנתונים.
צריך PostgreSQL + API כדי לשמור נתונים אמיתיים.

## Features של האפליקציה
1. **Dashboard** – סטטיסטיקות כלליות
2. **Products Spreadsheet** – CRUD מוצרים + AI Research (Gemini)
3. **Creative Generator** – יצירת פוסטים לפלטפורמות שונות
4. **Digital Assets Manager** – ניהול תמונות/סרטונים/באנרים

## Iron Rules
1. `HOSTNAME=0.0.0.0` ב-Dockerfile runner — חובה לTraefik
2. Build ב-GitHub Actions — **לא** על Hetzner (OOM crash)
3. Coolify Build Pack = "Docker Image" (pull only)
4. `DATABASE_URL` משתמש ב-**internal container name** בפרודקשן
5. `.env` לעולם לא ב-git — `migrations/` חייב להיות ב-git
6. `PORT=3000` + health check `/api/health`
7. File uploads נשמרים ב-`/app/uploads/` (volume מ-Coolify)

## Files Map
```
server.ts                    ← Express entry point (משופר עם DB)
src/                         ← React/Vite frontend (ללא שינוי גדול)
src/db/schema.ts             ← Drizzle schema
src/db/client.ts             ← DB connection singleton
src/db/seed.ts               ← Admin user initial seed
migrations/                  ← Drizzle migrations (חייב ב-git!)
_ARCHITECT-BRAIN/            ← לא ב-git
Dockerfile                   ← Multi-stage build
.github/workflows/deploy.yml ← CI/CD
```
