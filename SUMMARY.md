# cleft — Project Summary

> เอกสารสรุปภาพรวมโปรเจกต์: คอนเซปต์, โครงสร้าง, โค้ดหลัก, ขั้นตอน deploy และปัญหาที่พบบ่อย  
> รายละเอียดเต็ม: [`stack_structure`](./stack_structure) · [`DEPLOY.md`](./DEPLOY.md)

---

## 1. คอนเซปต์

**cleft** คือแอปแบ่งบิลสำหรับออกไปกินดื่ม/ปาร์ตี้กับเพื่อน

| หัวข้อ | รายละเอียด |
|--------|------------|
| ผู้ใช้ | Login ด้วย Google → บันทึก profile, currency, ประวัติ party |
| แขก (Guest) | Home แสดง welcome + login เท่านั้น (ซ่อน stats/dashboard) — Items / Members / Summary ต้อง login |
| Draft session | รายการ + สมาชิกเก็บใน `localStorage` (`cleft-session`) ก่อน confirm |
| Confirm | กดยืนยันที่ Summary → บันทึกลง PostgreSQL + แสดงใน Recent History |
| การแบ่งเงิน | แบ่งต่อรายการ (item-level) — ALL = ทุกคน, PARTIAL = เลือกรายการ |

**ธีม UI:** Purple Noir — พื้นหลัง `#08051a`, accent `#6327FF`, ตัวเลขสีขาว

**Production ปัจจุบัน**

| ส่วน | URL / ผู้ให้บริการ |
|------|-------------------|
| Frontend | `https://<your-app>.vercel.app` (Vercel) |
| Backend API | `https://<your-api>.onrender.com` (Render Free) |
| Database | Supabase PostgreSQL (Singapore) |
| ค่าใช้จ่ายเป้าหมาย | **$0/เดือน** (Free tier ทั้งหมด) |

---

## 2. สถาปัตยกรรม (Architecture)

```
Browser (Vercel)
    │
    │  same-origin: /api/*
    ▼
Next.js rewrite (next.config.mjs)
    │
    │  proxy → NEXT_PUBLIC_API_URL
    ▼
NestJS API (Render)
    │
    │  Prisma
    ▼
PostgreSQL (Supabase)
```

**ทำไมต้องมี `/api` proxy?**  
Frontend อยู่บน Vercel, API อยู่บน Render — ถ้าเรียก API ตรง cookie login จะถูก browser บล็อก (third-party cookie) → `/auth/session` ได้ 401

**Auth flow (production)**

```
1. กด Login → /api/auth/google
2. Google → callback /api/auth/google/callback (proxy ไป Render)
3. Backend set httpOnly cookies → redirect FRONTEND_URL
4. Frontend เรียก /api/auth/session (cookie same-origin กับ Vercel)
```

---

## 3. โครงสร้างโฟลเดอร์

```
cursor_ai/
├── SUMMARY.md              ← เอกสารนี้
├── DEPLOY.md               ← คู่มือ deploy ทีละ phase
├── stack_structure         ← stack + UI logic ละเอียด
├── README.md
├── docker-compose.yml      ← local: postgres + backend + frontend
├── Dockerfile              ← Render build (root — ไม่ใช่ backend/Dockerfile)
├── render.yaml             ← Blueprint Render (service: cleft-api, plan: free)
├── render.env.example      ← template env สำหรับ Render
├── scripts/
│   ├── generate-jwt-secrets.sh
│   └── prisma-push-prod.sh
│
├── frontend/               ← Next.js 16 (App Router) → Vercel
│   ├── app/                ← หน้า route
│   │   ├── page.tsx        ← Home (guest welcome / logged-in dashboard)
│   │   ├── items/          ← รายการ (ต้อง login)
│   │   ├── members/        ← สมาชิก (ต้อง login)
│   │   └── summary/        ← สรุป + confirm (ต้อง login)
│   ├── components/
│   │   ├── top-nav.tsx     ← header (mobile wordmark top-right)
│   │   ├── app-logo.tsx    ← brand icon + wordmark
│   │   ├── profile-menu.tsx← avatar, login, profile modal
│   │   ├── payer-share-bar.tsx ← proportional share bars
│   │   ├── auth-guard.tsx  ← redirect ถ้าไม่ login
│   │   ├── dashboard-section.tsx
│   │   └── ui/             ← button, input, card, toast
│   ├── hooks/
│   │   └── use-party-session.ts  ← localStorage draft
│   ├── lib/
│   │   ├── api-base.ts     ← API_BASE = "/api"
│   │   ├── axios.ts        ← HTTP client (withCredentials)
│   │   ├── bill-display.ts ← คำนวณแบ่งบิล + format เงิน
│   │   └── types.ts
│   ├── next.config.mjs     ← rewrite /api/* → backend
│   └── public/             ← icon, manifest
│
├── backend/                ← NestJS → Render
│   ├── prisma/schema.prisma
│   └── src/
│       ├── main.ts         ← CORS, trust proxy, Helmet
│       ├── auth/           ← Google OAuth, JWT, cookies
│       ├── users/          ← profile CRUD
│       └── party/          ← calculate + confirm party
│
└── edit_front_end/         ← Vite preview UI (ไม่ต่อ backend)
    └── CleftUI.tsx         ← mirror design ทุกหน้า
```

---

## 4. ไฟล์และโค้ดสำคัญ

### Frontend

| ไฟล์ | หน้าที่ |
|------|--------|
| `lib/api-base.ts` | `export const API_BASE = "/api"` — ทุก request ผ่าน same-origin |
| `lib/axios.ts` | Axios instance, `withCredentials: true`, interceptor refresh token |
| `next.config.mjs` | Rewrite `/api/:path*` → `NEXT_PUBLIC_API_URL/:path*` |
| `hooks/use-party-session.ts` | อ่าน/เขียน `localStorage` key `cleft-session` |
| `lib/bill-display.ts` | `computePayerAmounts()` — logic แบ่งบิลฝั่ง client |
| `components/profile-menu.tsx` | Login Google, แก้ profile, mobile modal (portal) |
| `components/app-logo.tsx` | Brand SVG icon + gradient wordmark |
| `components/payer-share-bar.tsx` | Stacked overview + per-member share bars (Summary) |
| `components/top-nav.tsx` | Header — mobile wordmark top-right, desktop logo left |
| `components/auth-guard.tsx` | ป้องกัน `/items`, `/members`, `/summary` |

### Backend

| ไฟล์ | หน้าที่ |
|------|--------|
| `main.ts` | `trust proxy`, CORS จาก `FRONTEND_URL`, Helmet |
| `auth/auth.controller.ts` | `/auth/google`, callback, session, refresh, logout + cookies |
| `auth/strategies/google.strategy.ts` | Passport Google — ใช้ `GOOGLE_CALLBACK_URL` |
| `auth/strategies/jwt.strategy.ts` | อ่าน JWT จาก cookie `access_token` |
| `party/party.service.ts` | คำนวณ + บันทึก party ลง DB (logic ตรงกับ client) |
| `prisma/schema.prisma` | User, Party, Item, Participant, Consumption, History |

### Database models (สั้นๆ)

```
User ──< History >── Party ──< Item
                      └──< Participant ──< Consumption >── Item
```

---

## 5. Environment Variables

### Vercel (frontend)

```env
NEXT_PUBLIC_API_URL=https://<your-api>.onrender.com
```

ใช้สำหรับ **rewrite เท่านั้น** — browser ไม่เรียก URL นี้ตรง

### Render (backend)

```env
DATABASE_URL=...                    # Supabase (แนะนำ Session pooler จาก Render)
FRONTEND_URL=https://<your-app>.vercel.app
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=https://<your-app>.vercel.app/api/auth/google/callback
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
# ตั้งใน render.yaml แล้ว: NODE_ENV, COOKIE_SAME_SITE=none, JWT TTL
```

### Google Cloud Console

| ช่อง | ค่า |
|------|-----|
| JavaScript origins | `https://<your-app>.vercel.app` |
| Redirect URIs | `https://<your-app>.vercel.app/api/auth/google/callback` |

**สามค่านี้ต้องตรงกันทุกตัวอักษร:** Google redirect URI = Render `GOOGLE_CALLBACK_URL` = path ที่ OAuth ใช้จริง

---

## 6. ขั้นตอน Deploy (สรุป)

| Phase | ทำอะไร |
|-------|--------|
| **0** | ลบ Render service เก่า (Starter) — อย่าโดนคิดเงิน ~$7/mo |
| **1** | สร้าง Supabase project (Singapore) → เก็บ `DATABASE_URL` |
| **2** | Render Blueprint จาก `render.yaml` → service `cleft-api` (**Free**) → ใส่ env |
| **3** | Vercel import repo, Root = `frontend`, ใส่ `NEXT_PUBLIC_API_URL` |
| **4** | Google OAuth client + redirect URI ผ่าน Vercel `/api/...` |
| **5** | ทดสอบ login, profile, items → members → summary → confirm, history |

**Deploy โค้ดใหม่**

```bash
git add .
git commit -m "..."
git push origin main
```

- แก้ **frontend** (UI/logic) → Vercel auto-deploy
- แก้ **backend** → Render auto-deploy
- แก้ **env** บน dashboard → ต้อง save + redeploy เอง

---

## 7. ปัญหาที่พบบ่อยและวิธีแก้

### Auth / Login

| อาการ | สาเหตุ | แก้ |
|--------|--------|-----|
| Login แล้วยังเป็น Guest, `/auth/session` 401 | เรียก API cross-origin ตรง → cookie ไม่ส่ง | ใช้ `/api` proxy (มีใน `next.config.mjs` แล้ว) |
| `Error 400: redirect_uri_mismatch` | Google redirect URI ไม่ตรงกับ `GOOGLE_CALLBACK_URL` | ใส่ `https://<app>.vercel.app/api/auth/google/callback` ทั้ง Google Console และ Render |
| Cookie มีแต่ session ยัง 401 | `FRONTEND_URL` ผิด / มี slash ท้าย | ตั้ง `https://<your-app>.vercel.app` ไม่มี `/` ท้าย |
| Access blocked (Testing) | OAuth ยังไม่ publish | เพิ่ม email เป็น **Test user** ใน consent screen |
| `invalid_client` | Client ID/Secret ไม่ตรง client ใน Google | copy จาก OAuth client `cleft-web` ตัวเดียวกัน |

### Database

| อาการ | สาเหตุ | แก้ |
|--------|--------|-----|
| Prisma P1001 จาก Render | Supabase direct `:5432` บล็อกจาก Render | ใช้ **Session pooler** URI จาก Supabase |
| ตารางไม่มี | ยังไม่ push schema | Dockerfile รัน `prisma db push` ตอน start หรือใช้ `scripts/prisma-push-prod.sh` |

### Render / Billing

| อาการ | สาเหตุ | แก้ |
|--------|--------|-----|
| โดนคิดเงิน ~$5–7 | เลือก **Starter** แทน Free | ลบ service → สร้างใหม่ `plan: free` (Phase 0) |
| Request แรกช้า 30–60 วิ | Render Free **cold start** | รอ — ไม่ใช่ bug |
| API ไม่ขึ้น | Dockerfile path ผิด | Root Directory = `.`, Dockerfile = `Dockerfile` (root) |

### CORS / Cookie

| อาการ | สาเหตุ | แก้ |
|--------|--------|-----|
| CORS error | `FRONTEND_URL` ไม่ตรง domain Vercel | แก้ env Render + redeploy |
| Cookie ไม่ secure บน Render | อยู่หลัง TLS proxy | `trust proxy` ใน `main.ts` (มีแล้ว) |
| `COOKIE_SAME_SITE` | production ต้อง `none` + HTTPS | ตั้งใน `render.yaml` แล้ว |

### UI / Mobile

| อาการ | สาเหตุ | แก้ |
|--------|--------|-----|
| Profile popup เบี้ยวซ้าย/ขวาบนมือถือ | `backdrop-blur` บน header ทำให้ `fixed` อ้างอิงผิด | ใช้ `createPortal` ไป `document.body` (มีแล้ว) |
| Favicon / tab icon ดูเบี้ยว | graphic ชิดขอบ + ใช้ PNG ที่ crop ผิด | ใช้ `icon.svg` พร้อม safe padding + `object-contain` ใน header |
| แก้ design แล้ว production ไม่เปลี่ยน | ยังไม่ deploy Vercel | `git push` → รอ Vercel build (~1–2 นาที) |

### ความปลอดภัย

- **อย่า commit** `.env`, `DATABASE_URL`, JWT secrets, Google secrets
- ใส่ secrets เฉพาะใน Vercel / Render / Supabase dashboard
- อย่าใส่ quote รอบค่า env บน Render (`https://...` ตรงๆ ไม่ต้อง `"..."`)

---

## 8. Local Development

```bash
# ทั้ง stack
docker compose up --build

# แยก
cd backend && npm install && npx prisma migrate dev && npm run start:dev
cd frontend && npm install && npm run dev

# preview UI อย่างเดียว (ไม่มี backend)
cd edit_front_end && npm run dev
```

| บริการ | URL |
|--------|-----|
| Frontend | http://localhost:3000 |
| Backend | http://localhost:4000 |
| UI preview | http://localhost:5173 |

Local ไม่ใช้ `/api` proxy — `NEXT_PUBLIC_API_URL=http://localhost:4000` เรียก backend ตรง

---

## 9. Checklist หลัง deploy / แก้โค้ด

- [ ] Vercel + Render deploy สำเร็จ (สีเขียว)
- [ ] Login Google → ไม่ใช่ Guest
- [ ] `/api/auth/session` → 200
- [ ] Profile save ได้
- [ ] Items → Members → Summary → Confirm → History
- [ ] Render Instance Type = **Free**
- [ ] Google redirect URI ตรง `GOOGLE_CALLBACK_URL`
- [ ] ไม่มี secrets ใน Git

---

## 10. เอกสารที่เกี่ยวข้อง

| ไฟล์ | เนื้อหา |
|------|---------|
| [`DEPLOY.md`](./DEPLOY.md) | Deploy ทีละ phase (ภาษาไทย, ละเอียด) |
| [`stack_structure`](./stack_structure) | Stack, design system, UI logic, split algorithm |
| [`render.env.example`](./render.env.example) | Template env Render |
| [`frontend/.env.example`](./frontend/.env.example) | Template env frontend |
| [`backend/.env.example`](./backend/.env.example) | Template env backend local |
