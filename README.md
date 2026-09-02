# cleft

Bill-splitting app for group outings — Next.js + NestJS + PostgreSQL.

## Docs

- **[DEPLOY.md](./DEPLOY.md)** — Fresh production deploy (Vercel + Render Free + Supabase, **$0/mo**)
- **[DATAFLOW.md](./DATAFLOW.md)** — Browser → proxy → API → database flow
- **[SUMMARY.md](./SUMMARY.md)** — Project overview and common deployment mistakes
- **[stack_structure](./stack_structure)** — Stack, UI logic, project layout

## Local dev

```bash
docker compose up --build
```

Or separately:

```bash
cd backend && npm install && npx prisma migrate dev && npm run start:dev
cd frontend && npm install && npm run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:4000
- UI preview: `cd edit_front_end && npm run dev` → http://localhost:5173

Copy each `.env.example` to `.env` for local development. Never commit real database, Google OAuth, or JWT values.
