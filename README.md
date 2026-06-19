# Applaut — by LVAMO

AI-powered job application automation platform.

## Prerequisites

- Docker & Docker Compose (recommended)
- **Or** manually: Python 3.12+, Node 20+, PostgreSQL 16

## Quick start (Docker)

```bash
# 1. Clone and enter the repo
git clone <repo-url>
cd lvamo-applaut

# 2. Create your .env file
cp .env.example .env
# Edit .env — at minimum set SECRET_KEY to a random string

# 3. Start all services
docker compose up --build

# 4. Run database migrations (first time, and after new migrations)
docker compose exec backend alembic upgrade head
```

Services will be available at:

| Service  | URL                        |
|----------|----------------------------|
| Frontend | http://localhost:5173      |
| Backend  | http://localhost:8000      |
| API docs | http://localhost:8000/docs |
| Health   | http://localhost:8000/api/v1/health |

---

## Manual setup (without Docker)

### PostgreSQL

Create a database and user matching your `.env`:

```sql
CREATE USER applaut WITH PASSWORD 'applaut_dev';
CREATE DATABASE applaut OWNER applaut;
```

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp ../.env.example .env          # then edit .env

# Run migrations
alembic upgrade head

# Start dev server
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install

# Create a local .env (Vite reads .env in the frontend/ directory)
echo "VITE_API_BASE_URL=http://localhost:8000" > .env.local

npm run dev
```

---

## Running migrations

```bash
# Apply all pending migrations
alembic upgrade head

# Roll back one migration
alembic downgrade -1

# Generate a new migration (after editing models)
alembic revision --autogenerate -m "describe your change"
```

Run these from the `backend/` directory (or via `docker compose exec backend`).

---

## Project structure

```
lvamo-applaut/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app factory
│   │   ├── config.py        # Settings (loaded from .env)
│   │   ├── api/v1/          # Versioned routers
│   │   ├── models/          # SQLAlchemy ORM models
│   │   ├── schemas/         # Pydantic request/response schemas
│   │   ├── services/        # Business logic
│   │   └── db/              # Async DB session
│   ├── migrations/          # Alembic migrations
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── App.tsx           # React Router root
│       ├── pages/            # Page components
│       ├── components/       # Shared UI components
│       └── api/client.ts     # Axios instance
├── docker-compose.yml
└── .env.example
```

---

## Environment variables

See `.env.example` for the full list. Required variables to get started:

| Variable       | Description                            |
|----------------|----------------------------------------|
| `DATABASE_URL` | asyncpg connection string              |
| `SECRET_KEY`   | JWT signing secret (min 32 chars)      |

All other variables (R2, OpenAI, Google OAuth) can be left empty during initial development.
