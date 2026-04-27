# Config-Driven Application Generator

A production-grade system that converts JSON configuration into a fully working web application with dynamic UI, APIs, and database — inspired by [Base44](https://base44.com/).

## Architecture

```
JSON Config → Config Engine → Frontend (Next.js) + Backend (Express) + PostgreSQL
```

- **Config Engine** validates, normalizes, and serves the config to both frontend and backend
- **Backend** generates CRUD APIs dynamically for every entity in the config — zero hardcoded routes
- **Frontend** renders UI via a component registry — unknown view types show a fallback, never crash
- **Database** uses a single flexible JSONB table — no migrations needed when config changes

---

## Project Structure

```
task 1/
├── frontend/       # Next.js 14 + TypeScript + Tailwind
├── backend/        # Express + TypeScript + Prisma
├── shared/         # Shared TypeScript types (config + API)
├── config/         # JSON config files
└── docker-compose.yml
```

---

## Quick Start

### 1. Start PostgreSQL

```bash
docker-compose up -d
```

### 2. Setup Backend

```bash
cd backend
npm install

# Copy and configure environment
cp .env.example .env
# Edit DATABASE_URL if needed (defaults work with docker-compose)

# Generate Prisma client and run migrations
npm run prisma:generate
npm run prisma:migrate

# Start dev server (port 4000)
npm run dev
```

### 3. Setup Frontend

```bash
cd frontend
npm install

# Start dev server (port 3000)
npm run dev
```

### 4. Open the App

Visit [http://localhost:3000](http://localhost:3000) → Register → Start using the CRM config.

---

## How the Config Works

Everything is driven from `config/app.config.json`. Editing this file and restarting the backend regenerates all APIs and UI.

### Config Structure

```json
{
  "app": { "name": "App Name", "language": "en" },
  "entities": [
    {
      "name": "contacts",
      "fields": [
        { "name": "name",   "type": "string", "required": true },
        { "name": "email",  "type": "email",  "required": true },
        { "name": "status", "type": "enum",   "options": ["active", "inactive"] }
      ]
    }
  ],
  "views": [
    { "entity": "contacts", "type": "table", "columns": ["name", "email", "status"] },
    { "entity": "contacts", "type": "form" }
  ],
  "labels": {
    "en": { "save": "Save", "cancel": "Cancel" },
    "fr": { "save": "Enregistrer", "cancel": "Annuler" }
  },
  "events": [
    { "trigger": "record.created", "action": "toast", "message": "Record created!" }
  ]
}
```

### Supported Field Types

| Type | Input Rendered |
|---|---|
| `string` | Text input |
| `email` | Email input |
| `number` | Number input |
| `boolean` | Checkbox |
| `date` | Date picker |
| `enum` | Select dropdown |
| `text` | Textarea |
| `url` | URL input |

---

## API Reference (Dynamic)

All entity routes are generated automatically. Replace `{entity}` with any entity name from the config.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/entities/{entity}` | List records (paginated) |
| `GET` | `/api/entities/{entity}/:id` | Get single record |
| `POST` | `/api/entities/{entity}` | Create record |
| `PUT` | `/api/entities/{entity}/:id` | Update record |
| `DELETE` | `/api/entities/{entity}/:id` | Delete record |
| `POST` | `/api/auth/register` | Register |
| `POST` | `/api/auth/login` | Login |
| `GET` | `/api/config` | Get normalized config |
| `POST` | `/api/config` | Upload new config |
| `POST` | `/api/import/{entity}/upload` | Upload CSV |
| `POST` | `/api/import/{entity}/map` | Set column mapping |
| `POST` | `/api/import/{entity}/confirm` | Confirm import |
| `GET` | `/api/notifications/stream` | SSE notification stream |

---

## Features Implemented

### ✅ CSV Import System
3-step wizard: Upload → Map Columns → Confirm → Records appear in table.
Auto-maps CSV columns that match entity field names.

### ✅ Multi-Language UI
Config-driven labels with `labels.en`, `labels.fr`, `labels.es`.
Language switcher in navbar. Locale persisted to localStorage.

### ✅ Event Notifications
Config `events` array maps triggers to actions.
- `"action": "toast"` → real-time toast via Server-Sent Events (SSE)
- `"action": "email"` → structured mock email logged to console

---

## Edge Cases Handled

| Scenario | Behavior |
|---|---|
| Config file missing | System starts with empty config, empty dashboard |
| Invalid JSON in config | Returns parse error, runs with last valid config |
| Entity with no fields | Entity exists, form renders empty, table has no columns |
| View references unknown entity | Normalizer drops the view with a warning log |
| Unknown `view.type` in config | `FallbackComponent` renders explaining the issue |
| React render crash in component | `ErrorBoundary` catches it, rest of page works |
| Auth token expired | 401 returned, frontend redirects to login |
| CSV with wrong columns | User remaps in step 2; rows with errors are skipped |
| Partial record update | Fields merged with existing data, nothing wiped |

---

## Adding a New Component Type

1. Create `frontend/components/dynamic/DynamicChart.tsx`
2. Add to registry (in any file, before app renders):
   ```ts
   import { registerComponent } from '../registry/componentMap';
   import { DynamicChart } from '../dynamic/DynamicChart';
   registerComponent('chart', DynamicChart);
   ```
3. Use `"type": "chart"` in your config views.

**No other files need to change.** The core is untouched.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS |
| Backend | Node.js, Express, TypeScript, Zod |
| Database | PostgreSQL, Prisma ORM |
| Auth | bcrypt, JWT (httpOnly cookie + Bearer token) |
| Validation | AJV (config), Zod (API) |
| Notifications | SSE (real-time) + mock email |

---

## Environment Variables

### Backend (`backend/.env`)
```
DATABASE_URL=postgresql://postgres:password@localhost:5432/configapp
JWT_SECRET=your-long-secret
PORT=4000
CORS_ORIGINS=http://localhost:3000
CONFIG_PATH=../config/app.config.json
```

### Frontend (`frontend/.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:4000
```
