# Blueprint: EcoSpread-ninja

## Purpose
כלי BI לחנויות שעוני יוקרה ישראליות — ניהול קטלוג מוצרים, מחקר מחירים ב-AI,
יצירת תוכן שיווקי לפלטפורמות, וניהול נכסים דיגיטליים.

## Database Schema (Drizzle + PostgreSQL)

### Table: users
```
id          UUID PK default gen_random_uuid()
email       TEXT UNIQUE NOT NULL
password_hash TEXT NOT NULL
name        TEXT NOT NULL
role        TEXT NOT NULL default 'viewer'  -- admin | editor | viewer
created_at  TIMESTAMPTZ default NOW()
```

### Table: products
```
id               UUID PK default gen_random_uuid()
name             TEXT NOT NULL
sku              TEXT
model_number     TEXT
category         TEXT
sub_category     TEXT
gender           TEXT default 'unisex'   -- men|women|unisex|kids
price            TEXT
zap_price        TEXT
zap_link         TEXT
target_price     TEXT
min_price        TEXT
description      TEXT
short_description TEXT
manufacturer     TEXT
warranty         TEXT
delivery_time    TEXT
payments         TEXT
movement         TEXT
diameter         TEXT
material         TEXT
water_resistance TEXT
glass            TEXT
filters          TEXT[]  default '{}'
seo_keywords     TEXT[]  default '{}'
images           TEXT[]  default '{}'
status           TEXT default 'draft'   -- draft|ready|published
last_updated     TIMESTAMPTZ default NOW()
created_at       TIMESTAMPTZ default NOW()
```

### Table: assets
```
id          UUID PK default gen_random_uuid()
name        TEXT NOT NULL
type        TEXT NOT NULL   -- image|video|vector|other
category    TEXT NOT NULL   -- banner|product|social|logo|other
brand       TEXT
model       TEXT
size        TEXT
date        TEXT
url         TEXT NOT NULL
created_at  TIMESTAMPTZ default NOW()
```

### Table: company_settings
```
id                   INTEGER PK default 1
name                 TEXT
phone                TEXT
email                TEXT
about                TEXT
target_price_offset  NUMERIC default -5
brands               JSONB default '[]'   -- BrandConfig[]
```

## API Routes (Express)

### Auth
- `POST /api/login`        → validate + set JWT cookie
- `POST /api/logout`       → clear cookie
- `GET  /api/me`           → return current user

### Products
- `GET    /api/products`         → list all (auth required)
- `POST   /api/products`         → create (admin|editor)
- `PUT    /api/products/:id`     → update (admin|editor)
- `DELETE /api/products/:id`     → delete (admin)

### Assets
- `GET    /api/assets`           → list all (auth required)
- `POST   /api/assets`           → create record (admin|editor)
- `DELETE /api/assets/:id`       → delete (admin)

### Settings
- `GET  /api/settings`           → get company settings (auth)
- `PUT  /api/settings`           → update (admin only)

### Users (Admin Panel)
- `GET    /api/users`            → list (admin)
- `POST   /api/users`            → create (admin)
- `PUT    /api/users/:id`        → update (admin)
- `DELETE /api/users/:id`        → delete (admin)

### Upload
- `POST /api/upload`             → multipart/form-data → saves to /app/uploads/
  Returns: { url: '/uploads/filename.jpg' }

### Health
- `GET /api/health`              → { status: 'ok', timestamp }

## Frontend Changes Required
Each component that currently uses React state needs to call the API:
- `App.tsx` → replace INITIAL_PRODUCTS + INITIAL_SETTINGS with API calls
- `AssetsManager.tsx` → replace INITIAL_ASSETS with API calls
- Product CRUD operations → call API instead of setProducts()
- Settings save → call PUT /api/settings
- Login → already calls /api/login ✅

## Infrastructure
- **Dev DB:**  ecospread-dev-db  (Coolify, public=ON, port 5433 exposed)
- **Prod DB:** ecospread-prod-db (Coolify, public=OFF, internal only)
- **Uploads:** Coolify Persistent Storage Volume → /app/uploads
- **Domain:**  EcoSpread-ninja.lodesignlab.com (Traefik auto SSL)
- **Image:**   ghcr.io/shlomi875/ecospread-ninja:latest
