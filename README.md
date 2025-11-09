# Notion-Like Kanban Board (Next.js + PostgreSQL + Prisma)

Production-ready, **Notion-style Kanban** built with **Next.js (App Router, TypeScript)**, **PostgreSQL (Prisma)**, and **NextAuth**. It supports **drag & drop**, **subtasks**, **time tracking**, **Excel/CSV import & export**, **reporting**, **multi-user**, and a **right-side details pane**—all wired for local dev or Docker (with Nginx and mounted logs).

> **Commercial License Required** — To use this software in production or for commercial purposes, you must purchase a license from **Minhajul Anwar**.
> **Contact:** +8801716734974 • [minhaj.me.bd@gmail.com](mailto:minhaj.me.bd@gmail.com) • [LinkedIn](https://www.linkedin.com/in/anwargazi/) • [Facebook](https://www.facebook.com/minhajul.anwar.me)

![Status](https://img.shields.io/badge/status-active-success)
![License](https://img.shields.io/badge/license-commercial-important)
![DB](https://img.shields.io/badge/db-notion__clone-blue)
![Stack](https://img.shields.io/badge/stack-Next.js%20%7C%20Prisma%20%7C%20PostgreSQL%20%7C%20NextAuth%20%7C%20dnd--kit-informational)

---

## Table of Contents

* [Features](#features)
* [Architecture](#architecture)
* [Data Model (Prisma)](#data-model-prisma)
* [Excel Import/Export](#excel-importexport)
* [Right-Side Details Pane](#right-side-details-pane)
* [Auth & Access Control](#auth--access-control)
* [Getting Started](#getting-started)

  * [Standalone (app on :3000, DB in Docker)](#standalone-app-on-3000-db-in-docker)
  * [Full Docker (app + DB + Nginx, live reload)](#full-docker-app--db--nginx-live-reload)
* [Environment Variables](#environment-variables)
* [Database & Prisma](#database--prisma)
* [CLI Importer](#cli-importer)
* [API Endpoints](#api-endpoints)
* [Reporting](#reporting)
* [Logging (Nginx + docker logs)](#logging-nginx--docker-logs)
* [Troubleshooting](#troubleshooting)
* [Performance & Security Notes](#performance--security-notes)
* [Roadmap](#roadmap)
* [License](#license)
* [Contact](#contact)

---

## Features

**Kanban & UX**

* Columns (defaults): **Backlog, To Do, In Progress, Done**
* **Drag & Drop** via `@dnd-kit` with movement threshold (avoids accidental drags on click)
* **Task cards** show a **subtasks badge** (done/total)
* **Right-side slide-over pane** on card click: edit all task fields, manage subtasks, import/export

**Tasks & Subtasks**

* **Subtasks** (checkboxes) per task, inline edit, completion auto-sets `closedAt`
* **Fields on Task/Subtask** (all editable where appropriate):

  * `externalId` (ID): unique string (auto-generated in UI) or taken from Excel
  * `state` (string, optional)
  * `status` (string, optional; independent of column)
  * `priority` (enum: LOW, MEDIUM, HIGH, CRITICAL)
  * `estimatedSec` (time estimate, stored as **seconds**, edited/displayed as **hours**)
  * `xp` (integer)
  * `notes` (text)
  * `dependencyExternalIds` (`text[]`) – references by IDs of other tasks/subtasks
  * `description` (rich text area; supports Markdown)
  * Timestamps: `createdAt` (auto), `updatedAt` (auto), `closedAt` (auto when moved to Done), `startAt`, `endAt`
  * Manual **`logHours`** per task/subtask
* **Inline edits** for title & description (click/blur to save)

**Import/Export**

* **Export a task** (including subtasks): **CSV** or **Excel (.xlsx)**
* **Import subtasks from Excel**:

  * GUI: in the task side pane (footer) → *Import Subtasks (Excel)*
  * CLI: import one or more workbooks from the terminal
  * **Rules**:

    * *Sheet name* → main task title (GUI attaches rows to the open task; CLI creates a task per sheet)
    * Columns mapping (case-insensitive):

      * **Task** (*required*) → subtask title; rows without `Task` are skipped
      * **ID** → `externalId` (if present; otherwise auto)
      * **State, status, Priority, XP, Notes, dependency** → mapped to fields
      * **Est. Time (min)** → converted **minutes → seconds** (shown as hours in UI)
      * **description**, **Acceptance Criteria**, **Commands/How to Run** → **merged** into `description`

**Multi-User**

* NextAuth with **Credentials** and optional **GitHub OAuth**
* Basic board bootstrap on first login
* **Global auth middleware**: unauthenticated users are **redirected** to sign-in (no “Please sign in” pages)

**Reporting**

* `/reports` page shows:

  * **Logged Hours**: task.logHours + sum(subtasks.logHours)
  * **Duration (h)**: `(endAt − startAt)` per task
  * Column, Board, Assignee, and subtask completion ratios

**Dev & Ops**

* **Docker Compose** for app + DB + Nginx reverse proxy
* **DB persistence** via volumes
* **Hot reload**: source is mounted (no copy) for quick iteration
* **Nginx logs** mounted to repo at `./.logs/nginx` (+ still to stdout for `docker logs`)
* **Decimal/Date serialization** utility for Client Components

---

## Architecture

* **Next.js App Router** (server & client components) + **TypeScript**
* **Prisma** ORM with PostgreSQL
* **NextAuth** for auth (JWT strategy), global **middleware** for redirects
* **UI**: Tailwind CSS, custom components; `@dnd-kit` for DnD
* **Import/Export**: `xlsx` package for Excel; custom CSV

Project structure (key parts):

```
src/
  app/
    (app)/
      layout.tsx
      page.tsx
    reports/
      page.tsx
      layout.tsx
    api/
      auth/[...nextauth]/route.ts
      register/route.ts
      tasks/route.ts               # POST/PATCH
      tasks/[id]/route.ts          # GET task + subtasks
      tasks/[id]/import/route.ts   # POST Excel -> subtasks
      tasks/[id]/export/route.ts   # CSV/XLSX
      subtasks/route.ts            # POST/PATCH
      search/route.ts              # search by title or externalId
  components/
    Board.tsx
    Column.tsx
    TaskCard.tsx
    SubtaskList.tsx
    TaskPaneProvider.tsx
    TaskPane.tsx
    ProfileMenu.tsx
    Providers.tsx
  lib/
    prisma.ts
    auth.ts
    ids.ts
    excel.ts
    serialize.ts
prisma/
  schema.prisma
  migrations/...
scripts/
  import-excel.ts
docker/
  web/Dockerfile
  nginx/Dockerfile
  nginx/default.conf
docker-compose.yml
```

---

## Data Model (Prisma)

**Shared concepts** (subset):

* **Task**

  * core: `id`, `title`, `description?`, `columnId`, `position`
  * metadata: `externalId?`, `state`, `status?`, `priority?`, `estimatedSec?`, `xp?`, `notes?`, `dependencyExternalIds[]`
  * timing: `createdAt`, `updatedAt`, `closedAt?`, `startAt?`, `endAt?`, `logHours`
  * relations: `subtasks[]`, `assignee?`, `board`, `column`
* **Subtask**

  * similar metadata: `externalId?`, `state`, `status?`, `priority?`, `estimatedSec?`, `xp?`, `notes?`, `dependencyExternalIds[]`, `description?`
  * lifecycle: `completed`, `closedAt?`, `createdAt`, `updatedAt`, `startAt?`, `endAt?`, `logHours`

> `estimatedSec` is stored as **seconds**, but displayed/edited as **hours** in the UI.

---

## Excel Import/Export

### Supported Columns (case-insensitive)

| Column Header           | Maps to                   | Notes                                                                      |
| ----------------------- | ------------------------- | -------------------------------------------------------------------------- |
| **Task**                | `title` (subtask)         | **Required**; missing → row skipped                                        |
| **ID**                  | `externalId`              | Optional; auto-generated if missing                                        |
| **State**               | `state`                   | Optional (default `""`)                                                    |
| **status**              | `status`                  | Optional                                                                   |
| **Priority**            | `priority`                | LOW/MEDIUM/HIGH/CRITICAL (maps common aliases: `L/M/H/CRITICAL/URGENT/P1`) |
| **Est. Time (min)**     | `estimatedSec`            | **Minutes → seconds** conversion on import; (UI shows **hours**)           |
| **XP**                  | `xp`                      | Optional                                                                   |
| **description**         | `description`             | Optional                                                                   |
| **Acceptance Criteria** | merged into `description` | Appends under heading                                                      |
| **Commands/How to Run** | merged into `description` | Appends under heading                                                      |
| **dependency**          | `dependencyExternalIds[]` | Split by comma/space/semicolon; references **IDs** of other tasks/subtasks |
| **Notes**               | `notes`                   | Optional                                                                   |

> **GUI Import (side pane)**: All rows in the uploaded file are added as **subtasks of the open task**.
> **CLI Importer**: Each **sheet** becomes a **new task** (title = sheet name), its rows become **subtasks**.

### Export

* **CSV**: Task + Subtasks sections.
* **XLSX**: Two sheets: `Task` & `Subtasks`.

---

## Right-Side Details Pane

Clicking a task opens a slide-over with:

* **Editable title**
* **Description** (Markdown-friendly)
* **Details grid**: ID (read-only), State, Status, Priority (dropdown), XP, Est. (hours), Notes, Dependencies (IDs list)
* **Time tracking**: Start, End (datetime-local), Logged hours (number)
* **Subtasks**: add/toggle/edit
* **Footer**: **Import Subtasks (Excel)** + Export CSV/XLSX

---

## Auth & Access Control

* **NextAuth (JWT sessions)** with **Credentials** and optional **GitHub OAuth**
* **Global middleware** redirects unauthenticated users to `/api/auth/signin` (with `callbackUrl`)
* **Profile menu** (top-right): user initials, email, **session duration** since last login, **Log out**

---

## Getting Started

### Standalone (app on :3000, DB in Docker)

1. **Start Postgres**:

```bash
docker run --name notion-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=notion_clone \
  -p 5432:5432 -d postgres:16
```

2. **.env** (root):

```env
# URLs
AUTH_URL="http://localhost:3000"
NEXTAUTH_URL="http://localhost:3000"

# Use ONE strong secret (same for both)
AUTH_SECRET="replace-with-a-strong-32b-secret"
NEXTAUTH_SECRET="replace-with-a-strong-32b-secret"
AUTH_TRUST_HOST=true

# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/notion_clone?schema=public"
```

3. **Install & DB init**:

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init   # or your latest migration series
```

4. **Seed (optional, TS)**:

```bash
npm i -D tsx
# package.json -> "seed": "tsx prisma/seed.ts"
npm run seed
# or: npx prisma db seed
```

5. **Run app**:

```bash
npm run dev
# http://localhost:3000
```

6. **Create a dev user** (if using Credentials):

```bash
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"pass1234","name":"Demo"}'
```

---

### Full Docker (app + DB + Nginx, live reload)

1. **Start DB**:

```bash
docker compose up -d db
```

2. **First-time schema**:

```bash
docker compose run --rm web npx prisma migrate dev --name init
```

3. **Run stack** (Next dev on 3000 proxied via Nginx on 8080):

```bash
docker compose up
# App: http://localhost:8080
```

4. **Logs**:

```bash
# Nginx (also available via docker logs nginx)
tail -f ./.logs/nginx/access.log
tail -f ./.logs/nginx/error.log
```

> In this mode, the source is **mounted** (not copied) so edits reflect live.

---

## Environment Variables

| Name              | Required | Example                                     | Notes                                 |
| ----------------- | -------- | ------------------------------------------- | ------------------------------------- |
| `AUTH_URL`        | ✅        | `http://localhost:3000`                     | v5 NextAuth canonical URL             |
| `NEXTAUTH_URL`    | ✅        | `http://localhost:3000`                     | keep equal to `AUTH_URL`              |
| `AUTH_SECRET`     | ✅        | `…32+ chars…`                               | **Same** as `NEXTAUTH_SECRET`         |
| `NEXTAUTH_SECRET` | ✅        | `…same value…`                              | Used by middleware/JWT decode         |
| `AUTH_TRUST_HOST` | Optional | `true`                                      | Helpful for local/proxy               |
| `DATABASE_URL`    | ✅        | `postgresql://…/notion_clone?schema=public` | Default DB name is **`notion_clone`** |
| `GITHUB_ID`       | Optional | `abc`                                       | For GitHub OAuth                      |
| `GITHUB_SECRET`   | Optional | `xyz`                                       | For GitHub OAuth                      |

---

## Database & Prisma

* **Generate client**: `npx prisma generate`
* **Migrate**: `npx prisma migrate dev --name <msg>`
* **Push (dev only)**: `npx prisma db push`
* **Studio**: `npx prisma studio`

> **Arrays**: use `String[]` (maps to `text[]`). Don’t use `@db.Text[]` on arrays.
> **Decimals** in Client Components: serialize to numbers via `toPlain()` helper.

---

## CLI Importer

Import one or more Excel workbooks from the CLI.

**Script**:

```bash
npm run import:excel -- ./imports/my_file.xlsx ./imports/another.xlsx
```

Behavior:

* For each **sheet**: creates a **Task** (title = sheet name; fallback file name).
* Each row → **Subtask** (mapping rules above).
* `Est. Time (min)` → **seconds**.
* If an `ID` collides with an existing subtask ID, script can auto-regenerate an ID (optional code snippet available).

---

## API Endpoints

* `POST /api/register` – create Credentials user (dev)
* `POST /api/tasks` – create task (accepts all metadata fields)
* `PATCH /api/tasks` – update task; moving to `Done` sets `closedAt`
* `GET /api/tasks/:id` – fetch task with subtasks
* `POST /api/tasks/:id/import` – upload Excel to create **subtasks** for a task
* `GET /api/tasks/:id/export?format=csv|xlsx` – export task + subtasks
* `POST /api/subtasks` – create subtask
* `PATCH /api/subtasks` – update subtask (toggle `completed` auto-sets `closedAt`)
* `GET /api/search?q=…` – search tasks/subtasks by title or externalId
* `GET /api/auth/session` – NextAuth session (debug)
* `GET /api/auth/signin` – NextAuth sign-in page

---

## Reporting

Navigate to **`/reports`**:

* **Duration (h)** = `(endAt − startAt)`
* **Logged Hours** = `task.logHours + Σ subtask.logHours`
* Columns for Board, Column, Assignee, Start/End, Subtasks completion ratio

---

## Logging (Nginx + docker logs)

* **Local dev**: Nginx access & error logs mounted to `./.logs/nginx`

  * Access: `./.logs/nginx/access.log`
  * Error:  `./.logs/nginx/error.log`
* **Also** emitted to **stdout/stderr** (so `docker logs nginx` works)
* **Prod**: prefer centralized logging (Cloud logging drivers, etc.)

---

## Troubleshooting

**Login loops back to sign-in**

* Use **one** strong secret everywhere: set both `AUTH_SECRET` and `NEXTAUTH_SECRET` to the **same** value
* Clear cookies & restart dev server
* Check `/api/auth/session` – should return your session JSON

**Console: JWTSessionError `no matching decryption secret`**

* `middleware.ts` and `auth.ts` must read the **same** secret:

  ```ts
  const APP_SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  ```

**500 on `/api/auth/signin`**

* NextAuth v5 export in `route.ts`:

  ```ts
  import { handlers } from "@/lib/auth";
  export const { GET, POST } = handlers;
  ```

**Seeder error “Unknown file extension .ts”**

* Use `tsx`:

  ```bash
  npm i -D tsx
  # package.json -> "seed": "tsx prisma/seed.ts"
  npm run seed
  ```

**Prisma validation: `@db.Text[]` on arrays**

* Remove `@db.Text[]`; just `String[] @default([])`

**Permission error creating migration (EACCES)**

* Fix ownership:

  ```bash
  sudo chown -R "$USER":"$USER" .
  ```

  Or run compose with your UID/GID.

**RSC warning: Only plain objects; Decimal not supported**

* Serialize via `toPlain()` helper before passing to Client Components.

**Clicking a card hides it**

* DnD activation guard (distance/delay) + early-return on same-column drops.

---

## Performance & Security Notes

* **Secrets**: never commit `.env`; use strong secrets; keep `AUTH_*` and `NEXTAUTH_*` in sync
* **Rate limiting**: recommended on APIs in public deployments
* **Validation**: add Zod schemas for API payloads
* **Positions**: for heavy reordering, consider fractional indexing
* **Roles**: foundation is present; enforce RBAC per route if needed

---

## Roadmap

* Global board switcher & multi-board dashboard
* Filters (assignee, priority, state/status), search in UI
* Charts on `/reports` (burndown, cumulative flow, velocity)
* Activity log / audit trail
* File attachments & previews
* Strong dependency graph with relations (not just IDs)

---

## License

This project is distributed under a **Commercial License**. A paid license is required for production/commercial use. See **`LICENSE.md`** for terms.

---

## Contact

**Licensor:** Minhajul Anwar
**Phone:** +8801716734974
**Email:** [minhaj.me.bd@gmail.com](mailto:minhaj.me.bd@gmail.com)
**LinkedIn:** [linkedin.com/in/anwargazi](https://www.linkedin.com/in/anwargazi/)
**Facebook:** [facebook.com/minhajul.anwar.me](https://www.facebook.com/minhajul.anwar.me)

---

### SEO Keywords (for discovery)

Notion Kanban, Next.js Kanban, Prisma PostgreSQL Kanban, NextAuth credentials, Excel import export tasks, drag and drop board, time tracking tasks, reporting dashboard, Docker Nginx Next.js, developer starter kanban, commercial Notion clone features

