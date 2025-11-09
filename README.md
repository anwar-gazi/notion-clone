
# Notion-Like Kanban Board (Next.js + PostgreSQL)

<!-- Badges -->
![Status](https://img.shields.io/badge/status-active-success)
![License](https://img.shields.io/badge/license-commercial-important)
![DB](https://img.shields.io/badge/db-notion__clone-blue)

> **Commercial License Required** — To use this Software in production or for commercial purposes, a paid license must be purchased from **Minhajul Anwar**.  
> Contact: **+8801716734974** • **minhaj.me.bd@gmail.com** • [LinkedIn](https://www.linkedin.com/in/anwargazi/) • [Facebook](https://www.facebook.com/minhajul.anwar.me)


A production-ready, **Notion-style Kanban board** built with **Next.js (App Router)**, **PostgreSQL (Prisma)**, and **NextAuth**. Designed for teams that want **drag-and-drop boards**, **subtasks/checkboxes**, **time tracking**, **CSV/Excel exports**, and **reporting**—with a clean developer experience and Docker-friendly setup.

> **Database name:** `notion_clone` (default throughout this README)

---

## Table of Contents

* [Features](#features)
* [Tech Stack](#tech-stack)
* [Architecture Overview](#architecture-overview)
* [Getting Started](#getting-started)

  * [1) Standalone (app on port 3000, DB in Docker)](#1-standalone-app-on-port-3000-db-in-docker)
  * [2) Full Docker (app + DB + Nginx)](#2-full-docker-app--db--nginx)
* [Environment Variables](#environment-variables)
* [Database & Prisma](#database--prisma)
* [Authentication](#authentication)
* [Exports (CSV/Excel)](#exports-csvexcel)
* [Reports](#reports)
* [Project Structure](#project-structure)
* [Performance & Security Notes](#performance--security-notes)
* [Roadmap](#roadmap)
* [Troubleshooting](#troubleshooting)
* [License](#license)

---

## Features

* **Kanban board with drag-and-drop**

  * Organize tasks across columns (Backlog, To Do, In Progress, Done)
  * Reorder and move tasks with smooth DnD
* **Subtasks & checkboxes**

  * Each task can have **subtasks** (also used as lightweight checkbox todos)
  * Auto-stamp **closedAt** when a subtask is completed
* **Multi-user** collaboration

  * NextAuth for auth
  * Board membership & roles (Owner/Member/Viewer foundation)
* **Time tracking & timestamps**

  * Auto **createdAt** / **updatedAt**
  * Auto **closedAt** when task enters “Done”
  * Optional **startAt** / **endAt**
  * Manual **logHours** per task and subtask
* **Export a task**

  * **CSV** or **Excel (.xlsx)** export of a single task including its subtasks
* **Reporting**

  * Per-task **Logged hours** (sum of task + subtasks)
  * Per-task **Duration** = `endAt − startAt` (hours)
* **Docker-friendly**

  * DB persistence via volumes
  * Dev hot-reload (when using the full Docker stack)
  * Optional Nginx reverse proxy with logs mounted to `.logs/`

---

## Tech Stack

* **Frontend/Backend:** Next.js (App Router, TypeScript), React 18, Tailwind CSS
* **Auth:** NextAuth (JWT sessions; GitHub OAuth + Credentials for dev)
* **Database/ORM:** PostgreSQL + Prisma
* **Drag & Drop:** `@dnd-kit`
* **Exports:** `xlsx` (Excel), custom CSV generator

---

## Architecture Overview

* **Next.js App Router** handles pages and API routes.
* **Prisma** models: `User`, `Board`, `Membership`, `Column`, `Task`, `Subtask`.
* **Task lifecycle:** `createdAt` on insert, `closedAt` set when moved into “Done”; optional `startAt`, `endAt`; `logHours` (Decimal) is manual input.
* **Exports API:** `/api/tasks/[id]/export?format=csv|xlsx` generates a downloadable file on demand.
* **Reports page:** aggregates logged hours and duration (end−start).

---

## Getting Started

### 1) Standalone (app on port 3000, DB in Docker)

This mode runs **your app locally** (`npm run dev` on port **3000**) and runs **Postgres in Docker**.

1. **Start Postgres in Docker** (one-off container):

```bash
docker run --name notion-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=notion_clone \
  -p 5432:5432 -d postgres:16
```

2. **Create `.env`** (at project root):

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/notion_clone?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="devsecret"
# Optional GitHub OAuth
# GITHUB_ID=xxx
# GITHUB_SECRET=yyy
```

3. **Install & init DB:**

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
```

4. **Seed data** (pick one):

* Using `tsx` (recommended):

  ```bash
  npm i -D tsx
  npm run seed   # ensure "seed": "tsx prisma/seed.ts" in package.json
  ```
* Or Prisma’s native hook:

  ```bash
  npx prisma db seed
  ```

5. **Run the app:**

```bash
npm run dev
# http://localhost:3000
```

> **Sign in quickly:** POST to `/api/register` to create a dev user, then use Credentials on `/api/auth/signin`.

```bash
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"pass1234","name":"Demo"}'
```

---

### 2) Full Docker (app + DB + Nginx)

This mode runs **everything in Docker** with hot-reload and persistent DB.
(Visit `http://localhost:8080` in this mode.)

**Compose highlights**

* `db`: Postgres 16 with a persistent volume
* `web`: Next.js dev server mounting the source (live reload)
* `nginx`: reverse proxy; logs go to `./.logs/nginx`

**Commands**

```bash
# Start DB
docker compose up -d db

# First-time DB schema
docker compose run --rm web npx prisma migrate dev --name init

# Full stack (Next.js dev on 3000 behind Nginx)
docker compose up

# App URL
# http://localhost:8080
```

---

## Environment Variables

| Name              | Required | Default / Example                                                          | Notes                               |
| ----------------- | -------- | -------------------------------------------------------------------------- | ----------------------------------- |
| `DATABASE_URL`    | ✅        | `postgresql://postgres:postgres@localhost:5432/notion_clone?schema=public` | Use `db` host inside Docker Compose |
| `NEXTAUTH_URL`    | ✅        | `http://localhost:3000` (standalone) / `http://localhost:8080` (Docker)    | Must match the URL you visit        |
| `NEXTAUTH_SECRET` | ✅        | `devsecret` (change in prod)                                               | Any strong string                   |
| `GITHUB_ID`       | Optional | –                                                                          | For GitHub OAuth                    |
| `GITHUB_SECRET`   | Optional | –                                                                          | For GitHub OAuth                    |

---

## Database & Prisma

* **DB name:** `notion_clone`
* Generate client: `npx prisma generate`
* Apply migrations: `npx prisma migrate dev --name init`
* Seed (recommended): `npm run seed` (with `tsx`) or `npx prisma db seed`

**Prisma models include**:

* `Task` & `Subtask` with `createdAt`, `updatedAt`, `closedAt`, `startAt`, `endAt`, `logHours`
* `Column.position` / `Task.position` for ordering
* `Membership` with a simple `Role` enum (OWNER/MEMBER/VIEWER foundation)

---

## Authentication

* **NextAuth** with **JWT** sessions.
* Supported providers:

  * **GitHub OAuth** (recommended for teams)
  * **Credentials** (dev convenience; `/api/register` to create a local user)
* Sign-in URL: `/api/auth/signin`

> If you see a 500 on `/api/auth/signin` while customizing, ensure the route re-exports are correct for v5:
>
> ```ts
> // src/app/api/auth/[...nextauth]/route.ts
> import { handlers } from "@/lib/auth";
> export const { GET, POST } = handlers;
> ```

---

## Exports (CSV/Excel)

Export a task (including subtasks) from the task details UI or directly via API:

```
GET /api/tasks/:id/export?format=csv
GET /api/tasks/:id/export?format=xlsx
```

* **Excel** includes two sheets: `Task` and `Subtasks`
* **CSV** includes a “Task” section and a “Subtasks” section

---

## Reports

Visit `/reports` to see per-task:

* **Logged Hours** — `task.logHours + sum(subtask.logHours)`
* **Duration (h)** — `(endAt − startAt) / 3600000`

Use this to reconcile manual logs with actual duration windows.

---

## Project Structure

```
src/
  app/
    (app)/
      layout.tsx
      page.tsx
    reports/
      page.tsx
    api/
      auth/[...nextauth]/route.ts
      boards/[boardId]/route.ts
      tasks/route.ts
      tasks/[id]/route.ts
      tasks/reorder/route.ts
      tasks/[id]/export/route.ts
      subtasks/route.ts
      subtasks/[id]/route.ts
      register/route.ts
  components/
    Board.tsx
    Column.tsx
    TaskCard.tsx
    SubtaskList.tsx
  lib/
    prisma.ts
    auth.ts
prisma/
  schema.prisma
  seed.ts
docker/
  web/Dockerfile
  nginx/Dockerfile
  nginx/default.conf
docker-compose.yml
```

---

## Performance & Security Notes

* **Dev vs Prod**: The repo ships dev-friendly settings; harden for production.
* **Auth providers**: Prefer OAuth in production; disable Credentials provider if not needed.
* **Input validation**: Add stricter payload validation with Zod on API routes.
* **Rate limiting**: Recommended for public deployments.
* **Positions**: Consider **fractional indexing** or neighbor-based repositioning for heavy reordering.

---

## Roadmap

* Board switching UI & multi-board dashboard
* Filters (assignee, status, date range), search
* Charts on `/reports` (burndown, cumulative flow)
* Role enforcement per route (OWNER/MEMBER/VIEWER guards)
* Activity log / audit trail
* File attachments

---

## Troubleshooting

**500 on `/api/auth/signin`**

* Ensure route exports match NextAuth v5 (`export const { GET, POST } = handlers;`)
* `NEXTAUTH_URL` matches the URL you’re using
* `NEXTAUTH_SECRET` set
* DB reachable via `DATABASE_URL`, migrations applied

**Seed script error: “Unknown file extension .ts”**

* Use `tsx`:

  ```bash
  npm i -D tsx
  # package.json -> "seed": "tsx prisma/seed.ts"
  npm run seed
  ```

**Can’t connect to DB**

* For **standalone app**: `localhost:5432`
* For **Docker compose**: host is `db`, not `localhost` (use the compose `DATABASE_URL`)

---

## License

**COMMERCIAL LICENSE** — contact developer.

---
