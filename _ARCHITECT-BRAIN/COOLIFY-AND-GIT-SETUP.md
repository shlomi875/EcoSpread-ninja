# Coolify & Git Setup Guide
## EcoSpread-ninja — הוראות ביצוע ידניות

> בצע שלבים אלו **לפני** שמריצים את Claude Code Prompts.

---

## STEP 1 — GitHub Repository Setup

### 1a. וודא שה-repo קיים ומכיל את הקוד
```bash
# בטרמינל בתוך תיקיית הפרויקט:
git remote -v
# אמור להראות: origin https://github.com/shlomi875/EcoSpread-ninja.git

# אם לא — אתחל:
git init
git remote add origin https://github.com/shlomi875/EcoSpread-ninja.git
git branch -M main
```

### 1b. Make sure .gitignore is correct
Create/update `.gitignore`:
```
node_modules/
.env
.env.local
.env.production
dist/
dist-server/
_ARCHITECT-BRAIN/
*.log
.DS_Store
uploads/
```

**IMPORTANT:** `migrations/` must NOT be in .gitignore!

### 1c. Add GitHub Secrets (after Coolify app is created in Step 3)
Go to: https://github.com/shlomi875/EcoSpread-ninja/settings/secrets/actions

Add these two secrets:
- `COOLIFY_WEBHOOK_TOKEN` — ✂️ copy from Coolify → App → Webhooks
- `COOLIFY_WEBHOOK_URL` — ✂️ copy from Coolify → App → Webhooks

---

## STEP 2 — Coolify: Create PostgreSQL Databases

### Login to Coolify
```
URL:      https://admin.lodesignlab.com
Email:    lo-work@outlook.co.il
Password: shlomist69
```

---

### 2a. Create Dev Database

1. Click **+ New Resource**
2. Choose **PostgreSQL**
3. Fill in:
   ```
   Name:      ecospread-dev-db
   Version:   16
   ```
4. Click Create
5. In the DB settings, set:
   ```
   DB Name:   ecospread
   User:      ecospread_user
   Password:  [pick a strong password, save it!]
   ```
6. Enable **Make it publicly accessible** → ON
7. Set **Exposed Port:** `5433`
8. Click **Deploy** (Start the database)
9. Note down the connection string:
   ```
   postgresql://ecospread_user:PASSWORD@77.42.72.207:5433/ecospread
   ```

---

### 2b. Create Production Database

1. Click **+ New Resource**
2. Choose **PostgreSQL**
3. Fill in:
   ```
   Name:      ecospread-prod-db
   Version:   16
   ```
4. Fill settings:
   ```
   DB Name:   ecospread
   User:      ecospread_user
   Password:  [DIFFERENT strong password from dev!]
   ```
5. **Keep public access OFF** (default) — internal only
6. Click **Deploy**
7. Go to **Settings** tab of the DB resource
8. Note the **Container Name** (looks like: `ecospread-prod-db-postgres`)
9. Your internal DATABASE_URL will be:
   ```
   postgresql://ecospread_user:PASSWORD@CONTAINER_NAME:5432/ecospread
   ```

---

## STEP 3 — Coolify: Create the Application

1. Click **+ New Resource**
2. Choose **Application**
3. Choose **Docker Image** (NOT Dockerfile, NOT GitHub)
4. Fill in:
   ```
   Name:         ecospread-ninja
   Docker Image: ghcr.io/shlomi875/ecospread-ninja:latest
   ```
5. Port: `3000`
6. Domain: `ecospread-ninja.lodesignlab.com`
7. Click **Create**

### 3a. Set Environment Variables
Go to the app → **Environment** tab, add:

```env
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
DATABASE_URL=postgresql://ecospread_user:PASSWORD@CONTAINER_NAME:5432/ecospread
JWT_SECRET=EcoSpread_Prod_JWT_Secret_2026_32Chars_Min!
GEMINI_API_KEY=YOUR_GEMINI_KEY_HERE
```

### 3b. Configure Health Check
Go to app → **Health** tab:
```
Health Check Path:   /api/health
Health Interval:     30
Health Timeout:      10
Health Retries:      3
Health Start Period: 40
```

### 3c. Add Persistent Storage (for uploads)
Go to app → **Storages** tab:
```
Source (Host Path):  [leave blank — Coolify creates it]
Destination:         /app/uploads
```
Click **Add**

### 3d. Get Webhook for GitHub Actions
Go to app → **Webhooks** tab:
1. Enable Deploy Webhook
2. Copy **Webhook Token** → save as GitHub Secret `COOLIFY_WEBHOOK_TOKEN`
3. Copy **Webhook URL** → save as GitHub Secret `COOLIFY_WEBHOOK_URL`

### 3e. Set Auto Deploy
```
Auto Deploy: ON
Watch Branches: main
```

---

## STEP 4 — First Deploy Sequence

### 4a. Run Claude Code Prompts (Prompts 1-8 from START-HERE-CLAUDE-CODE.md)

This adds PostgreSQL, Dockerfile, and GitHub Actions to the project.

### 4b. Generate and commit migrations
```bash
# In project folder:
npm run db:push        # creates tables in dev DB
npm run db:generate    # generates migration files in migrations/

git add migrations/
git commit -m "feat: add db migrations"
git push origin main
```

### 4c. Monitor GitHub Actions Build
```
URL: https://github.com/shlomi875/EcoSpread-ninja/actions
```
Wait for ✅ green checkmark (~3-5 minutes for first build)

### 4d. Trigger First Coolify Deploy
After GitHub Actions completes and pushes the image to GHCR:
- Coolify should auto-deploy via webhook
- Or manually click **Deploy** in Coolify

### 4e. Seed Production Database
After first deploy, run the seed script (one time only):

Option A — via Coolify terminal:
1. Coolify → App → Terminal tab
2. Run: `node -e "require('./dist-server/server.js')"` — opens a shell
3. Actually: the server auto-runs migrations on startup ✅

Option B — connect directly from your local machine to prod DB:
```bash
DATABASE_URL="postgresql://ecospread_user:PASSWORD@77.42.72.207:5433/ecospread" npm run seed
```
(temporarily expose prod DB port, then disable again)

### 4f. Verify Everything is Working
```
✅ https://EcoSpread-ninja.lodesignlab.com — app loads
✅ https://EcoSpread-ninja.lodesignlab.com/api/health → {"status":"ok"}
✅ Login with admin@ecospread.co.il / EcoAdmin2026!
✅ Add product → refresh → product persists
✅ Upload image → appears in assets
✅ Settings → save → persist after refresh
```

---

## STEP 5 — Ongoing Deployment Flow

After initial setup, every new deploy is automatic:

```
You push to main
        ↓
GitHub Actions builds Docker image
        ↓
Image pushed to ghcr.io/shlomi875/ecospread-ninja:latest
        ↓
GitHub Actions hits Coolify webhook
        ↓
Coolify pulls new image + redeploys
        ↓
New version live (zero-downtime rolling update)
```

---

## Troubleshooting

### 502 Bad Gateway
```
FIX: Make sure ENV HOSTNAME=0.0.0.0 is in Dockerfile runner stage
AND in Coolify Environment Variables
```

### App loads but shows blank / crash
```
Check Coolify → App → Logs tab
Common causes:
- DATABASE_URL wrong (wrong container name or password)
- JWT_SECRET not set
- Migrations failed
```

### Login not working
```
Check: JWT_SECRET is set in Coolify ENV
Check: DATABASE_URL connects to the right DB
Check: seed was run (admin user exists)
```

### GitHub Actions failing
```
Check: COOLIFY_WEBHOOK_TOKEN and COOLIFY_WEBHOOK_URL are set in GitHub Secrets
Check: ghcr.io package visibility (should be 'internal' or 'private')
For private packages: Coolify needs to authenticate with GHCR
Go to Coolify → Settings → Container Registries
Add ghcr.io with your GitHub username + Personal Access Token
```

### Uploads not persisting across deploys
```
Check: Persistent Storage is configured in Coolify (Step 3c)
Path must be /app/uploads
```

---

## Quick Reference: Important URLs

| Resource | URL |
|----------|-----|
| Live App | https://EcoSpread-ninja.lodesignlab.com |
| Health | https://EcoSpread-ninja.lodesignlab.com/api/health |
| Coolify Admin | https://admin.lodesignlab.com |
| GitHub Repo | https://github.com/shlomi875/EcoSpread-ninja |
| GitHub Actions | https://github.com/shlomi875/EcoSpread-ninja/actions |
| GHCR Image | ghcr.io/shlomi875/ecospread-ninja |

---

## Initial Credentials (Change After First Login!)

| Service | Login |
|---------|-------|
| App Admin | admin@ecospread.co.il / EcoAdmin2026! |
| Coolify | lo-work@outlook.co.il / shlomist69 |
