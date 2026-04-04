# DEV-ENV – EcoSpread-ninja
> ⚠️ NEVER commit this file to git. Add `_ARCHITECT-BRAIN/` to .gitignore.

## Coolify Admin
- URL: https://admin.lodesignlab.com
- Email: lo-work@outlook.co.il
- Password: shlomist69

## Hetzner Server
- IP: 77.42.72.207
- SSH: ssh root@77.42.72.207

## GitHub
- Repo: https://github.com/shlomi875/EcoSpread-ninja
- GHCR Image: ghcr.io/shlomi875/ecospread-ninja

## Dev Database (create in Coolify)
```
Resource Name:  ecospread-dev-db
Type:           PostgreSQL
Version:        16
DB Name:        ecospread
DB User:        ecospread_user
DB Password:    [set a strong password in Coolify]
Public:         ON (to access from local dev)
Exposed Port:   5433 (maps to internal 5432)
```

Dev DATABASE_URL (after creating):
```
postgresql://ecospread_user:PASSWORD@77.42.72.207:5433/ecospread
```

## Prod Database (create in Coolify)
```
Resource Name:  ecospread-prod-db
Type:           PostgreSQL
Version:        16
DB Name:        ecospread
DB User:        ecospread_user
DB Password:    [DIFFERENT strong password]
Public:         OFF (internal only)
Container Name: [note from Coolify Settings tab]
```

Prod DATABASE_URL (use internal container name):
```
postgresql://ecospread_user:PASSWORD@ecospread-prod-db:5432/ecospread
```

## .env File for Local Dev
```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://ecospread_user:PASSWORD@77.42.72.207:5433/ecospread
JWT_SECRET=ecospread_jwt_secret_change_this_in_production_32chars
GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
```

## Coolify App Environment Variables (Production)
```env
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
DATABASE_URL=postgresql://ecospread_user:PASSWORD@ecospread-prod-db:5432/ecospread
JWT_SECRET=STRONG_RANDOM_STRING_32_CHARS_MINIMUM
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

## GitHub Secrets Required
- `COOLIFY_WEBHOOK_TOKEN`  → from Coolify App → Webhooks
- `COOLIFY_WEBHOOK_URL`    → from Coolify App → Webhooks

## Initial Admin User (after first deploy)
Run seed script: `npm run seed`
Or use: email=admin@ecospread.co.il / password=EcoAdmin2026!
(Change immediately after first login)
