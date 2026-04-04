# BUILD PROGRESS — EcoSpread-ninja

## Pre-Code Setup
- [ ] Dev DB created in Coolify (ecospread-dev-db, port 5433)
- [ ] Prod DB created in Coolify (ecospread-prod-db, internal)
- [ ] .env file created with dev DATABASE_URL + GEMINI_API_KEY
- [ ] GitHub repo initialized: github.com/shlomi875/EcoSpread-ninja
- [ ] Coolify app resource created (Docker Image type)
- [ ] Coolify Persistent Storage added (/app/uploads)
- [ ] COOLIFY_WEBHOOK_TOKEN + COOLIFY_WEBHOOK_URL saved as GitHub Secrets

## Claude Code Prompts
- [ ] PROMPT 1 — Install Dependencies + Database Setup (Drizzle schema, seed)
- [ ] PROMPT 2 — Replace server.ts with Full PostgreSQL API
- [ ] PROMPT 3 — Refactor App.tsx to use API
- [ ] PROMPT 4 — Refactor AssetsManager to use API
- [ ] PROMPT 5 — Add File Upload to UploadAssetModal
- [ ] PROMPT 6 — Create Dockerfile
- [ ] PROMPT 7 — Create GitHub Actions CI/CD
- [ ] PROMPT 8 — Production Migration Runner

## Verification
- [ ] npx tsc --noEmit → 0 errors
- [ ] npm run dev → loads at localhost:3000
- [ ] Login works (admin@ecospread.co.il)
- [ ] Add product → refresh → persists ✅
- [ ] Upload asset → refresh → persists ✅
- [ ] Settings save → refresh → persists ✅

## Deployment
- [ ] npm run db:generate → generates migrations/
- [ ] migrations/ committed to git
- [ ] git push origin main → triggers GitHub Actions
- [ ] GitHub Actions ✅ green
- [ ] GHCR image created: ghcr.io/shlomi875/ecospread-ninja:latest
- [ ] Coolify deploys successfully
- [ ] https://EcoSpread-ninja.lodesignlab.com → loads ✅
- [ ] /api/health → { status: 'ok' } ✅
- [ ] Production seed run (admin user created)
- [ ] SSL certificate active (auto via Traefik)

## Post-Deploy
- [ ] Change admin password from default
- [ ] Disable public access on dev DB (optional)
- [ ] Test all features in production
