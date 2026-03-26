# CloudiFlow-9000 Backend

This is the backend for CloudiFlow-9000, built with [Hono](https://hono.dev/), [Bun](https://bun.sh/), [Drizzle ORM](https://orm.drizzle.team/), and PostgreSQL.

## Setup Instructions

### 1. Prerequisites
Ensure you have the following installed:
- [Bun](https://bun.sh/)
- [pnpm](https://pnpm.io/)
- [Podman](https://podman.io/) (for local infrastructure)

### 2. Infrastructure Setup
Run the following commands using Podman to start the database and Redis cache:

```bash
# PostgreSQL
podman run --name pg-cloudiflow -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=cloudiflow_db -p 5432:5432 -d postgres:latest

# Redis (for BullMQ queues and caching)
podman run --name redis-cloudiflow -p 6379:6379 -d redis:latest
```

### 3. Environment Variables
Copy the example environment file and configure your credentials:

```bash
cp .env.example .env
```

Ensure the `DATABASE_URL` matches your infrastructure setup:
`DATABASE_URL=postgresql://postgres:postgres@localhost:5432/cloudiflow_db`

### 4. Installation
Install project dependencies using pnpm:

```bash
pnpm install
```

### 5. Database Schema
Push the schema to your local PostgreSQL instance:

```bash
npx drizzle-kit push
```

## Running the Application

### Development Mode
Start the development server with hot-reloading enabled:

```bash
pnpm run dev
```

The server will be available at [http://localhost:3001](http://localhost:3001) (or your configured `PORT`).
