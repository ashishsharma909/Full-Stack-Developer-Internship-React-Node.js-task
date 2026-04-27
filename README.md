# Config-Driven Application Generator

A production-grade system that converts JSON configuration into a fully working web application with dynamic UI, APIs, and database — inspired by [Base44](https://base44.com/).

## 🚀 Live Demo

> After deployment:
> - **Frontend:** `https://your-app.vercel.app`
> - **Backend:** `https://your-api.railway.app`

**Demo access:** Click "Try Demo (one click)" on the login page — no registration needed.

---

## Architecture

```
JSON Config ─┬─▶ Config Engine ─┬─▶ Frontend (Next.js)
             │   (validate +    │     └─ Component Registry
             │    normalize)    │         ├─ DynamicForm
             │                  │         ├─ DynamicTable
             │                  │         └─ DynamicDashboard
             │                  └─▶ Backend (Express)
             │                        └─ Dynamic CRUD Routes
             └─────────────────────▶ PostgreSQL (JSONB)
```

- **Config Engine** validates, normalizes, and serves config to both layers
- **Backend** generates CRUD APIs dynamically per entity — zero hardcoded routes
- **Frontend** resolves view types via a registry — unknown types show a fallback, never crash
- **Database** uses a single JSONB table — no migrations when config changes

---

## Project Structure

```
.
├── frontend/                 # Next.js 15 + TypeScript + Tailwind
│   ├── app/                  # App Router pages
│   │   ├── login/            # Auth pages
│   │   ├── register/
│   │   ├── config-manager/   # Live config editor
│   │   ├── view/[entity]/[viewType]/  # Dynamic entity views
│   │   └── import/[entity]/  # CSV import wizard
│   ├── components/
│   │   ├── dynamic/          # DynamicForm, DynamicTable, DynamicDashboard
│   │   ├── registry/         # componentMap (extensible)
│   │   ├── csv/              # CsvImportWizard
│   │   ├── layout/           # Navbar, Sidebar (mobile-responsive)
│   │   └── ui/               # ErrorBoundary, LoadingSkeleton
│   ├── contexts/             # Auth, Config, Language providers
│   └── hooks/                # useEntity, useTranslation, useNotifications
│
├── backend/                  # Express + TypeScript + Prisma
│   ├── src/
│   │   ├── config/           # configLoader, configValidator, configNormalizer
│   │   ├── routes/           # Dynamic entity routes, auth, csv, config
│   │   ├── services/         # EntityService, AuthService, CsvService, NotificationService
│   │   ├── middleware/        # Auth guard, error handler
│   │   └── utils/            # logger, prisma, zodSchemaBuilder
│   ├── prisma/               # Schema (JSONB records table)
│   ├── Dockerfile
│   └── railway.toml
│
├── shared/types/             # Shared TypeScript contracts
├── config/                   # app.config.json (the driver)
└── docker-compose.yml        # Local PostgreSQL
```

---

## Quick Start (Local)

### 1. Start PostgreSQL

```bash
docker-compose up -d
```

### 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev          # → http://localhost:4000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev          # → http://localhost:3000
```

Open **http://localhost:3000** → click **"Try Demo"** to log in instantly.

---

## Config Format

Everything is driven by `config/app.config.json`:

```json
{
  "app": {
    "name": "My App",
    "language": "en",
    "description": "Built from config"
  },
  "entities": [
    {
      "name": "contacts",
      "label": "Contacts",
      "fields": [
        { "name": "name",   "type": "string",  "required": true },
        { "name": "email",  "type": "email",   "required": true },
        { "name": "status", "type": "enum",    "options": ["active", "lead", "inactive"] }
      ]
    }
  ],
  "views": [
    { "entity": "contacts", "type": "table",     "label": "All Contacts" },
    { "entity": "contacts", "type": "form",      "label": "New Contact" },
    { "entity": "contacts", "type": "dashboard", "label": "Overview" }
  ],
  "labels": {
    "en": { "save": "Save", "cancel": "Cancel" },
    "fr": { "save": "Enregistrer", "cancel": "Annuler" }
  },
  "events": [
    { "trigger": "record.created", "action": "toast", "message": "Record created!" },
    { "trigger": "record.created", "action": "email", "template": "new_record" }
  ]
}
```

**Change config → save → the app updates. No restart, no migrations.**

### Supported Field Types

| Type | Input |
|---|---|
| `string` | Text input |
| `email` | Email input |
| `number` | Number input |
| `boolean` | Checkbox |
| `date` | Date picker |
| `enum` | Select dropdown |
| `text` | Textarea |
| `url` | URL input |

### Supported View Types

| Type | Description |
|---|---|
| `table` | Paginated data table with edit/delete + inline create |
| `form` | Dynamic form matching entity fields |
| `dashboard` | Stats, enum breakdowns, recent records |
| *(any)* | Unknown types render `FallbackComponent` — no crash |

---

## Features

### ✅ CSV Import (3-step wizard)
Upload → auto-map columns → confirm → records appear instantly.

### ✅ Multi-Language (EN / FR / ES)
Config `labels` object drives all UI text. Switcher in navbar. Locale persisted to localStorage.

### ✅ Event Notifications
`events` array in config maps triggers to actions:
- `"action": "toast"` → real-time via SSE (Server-Sent Events)  
- `"action": "email"` → structured mock email in logs

### ✅ Config Manager UI
Live JSON editor at `/config-manager` — paste any config, validate, apply. System heals invalid configs.

### ✅ Demo Access
One-click login on the sign-in page — no registration needed.

---

## API Reference

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | — | Health check |
| POST | `/api/auth/register` | — | Register |
| POST | `/api/auth/login` | — | Login |
| GET | `/api/config` | — | Get normalized config |
| POST | `/api/config` | ✓ | Upload new config |
| POST | `/api/config/reload` | ✓ | Reload from disk |
| GET | `/api/entities/:entity` | ✓ | List records (paginated) |
| POST | `/api/entities/:entity` | ✓ | Create record |
| PUT | `/api/entities/:entity/:id` | ✓ | Update record |
| DELETE | `/api/entities/:entity/:id` | ✓ | Delete record |
| POST | `/api/import/:entity/upload` | ✓ | Upload CSV |
| POST | `/api/import/:entity/map` | ✓ | Set column mapping |
| POST | `/api/import/:entity/confirm` | ✓ | Confirm import |
| GET | `/api/notifications/stream` | ✓ | SSE event stream |

---

## Edge Cases Handled

| Scenario | Behavior |
|---|---|
| Config file missing | System starts with empty config, empty dashboard |
| Invalid JSON in config | Returns parse error, keeps last valid config |
| Entity with no fields | Entity exists, form renders empty, table has no columns |
| View references unknown entity | Normalizer drops view with warning log |
| Unknown `view.type` | `FallbackComponent` renders — no crash |
| React render crash | `ErrorBoundary` catches, rest of page works |
| Auth token expired | 401 → frontend redirects to `/login` |
| CSV with wrong columns | User remaps in step 2; failing rows skipped with error report |
| Missing required field | Zod validation returns structured `VALIDATION_ERROR` |
| Partial record update | Fields merged with existing JSONB, nothing wiped |
| Unknown API entity | 404 with structured JSON error |

---

## Adding a New View Type

1. Create `frontend/components/dynamic/DynamicCalendar.tsx`
2. Register it (anywhere before app renders):
```ts
import { registerComponent } from '../registry/componentMap';
import { DynamicCalendar } from '../dynamic/DynamicCalendar';
registerComponent('calendar', DynamicCalendar);
```
3. Use `"type": "calendar"` in your config views.

**Zero changes to core logic.** The registry handles everything.

---

## Deployment

### Frontend → Vercel

1. Push repo to GitHub
2. Import at [vercel.com/new](https://vercel.com/new)
3. Set root to `frontend/`
4. Add env var: `NEXT_PUBLIC_API_URL=https://your-backend.railway.app`

### Backend → Railway

1. Go to [railway.app](https://railway.app) → New Project → GitHub Repo
2. Select `backend/` as root (uses `railway.toml`)
3. Add a PostgreSQL plugin
4. Set env vars:
   ```
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   JWT_SECRET=<generate a long random string>
   CORS_ORIGINS=https://your-app.vercel.app
   NODE_ENV=production
   ```
5. Deploy — Railway auto-runs `prisma migrate deploy` then starts the server

---

## Environment Variables

### Backend (`backend/.env`)
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/configapp
JWT_SECRET=change-this-to-a-long-random-secret
JWT_EXPIRES_IN=7d
PORT=4000
NODE_ENV=development
CORS_ORIGINS=http://localhost:3000
CONFIG_PATH=../config/app.config.json
```

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS |
| Backend | Node.js, Express, TypeScript, Zod |
| Database | PostgreSQL 16, Prisma ORM (JSONB) |
| Auth | bcrypt password hashing, JWT (Bearer token) |
| Config Validation | AJV (config schema), Zod (API inputs) |
| Notifications | Server-Sent Events (real-time) + mock email |
| Deployment | Vercel (frontend), Railway (backend) |
