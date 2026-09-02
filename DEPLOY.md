# cleft — Fresh Deploy (Free Plan Only)

Deploy ใหม่ทั้งหมดด้วย **$0/เดือน** — ไม่ใช้ Starter, ไม่ใช้ Render Postgres, ไม่ใส่ Persistent Disk

| ส่วน | ผู้ให้บริการ | แผน | ค่าใช้จ่าย |
|------|-------------|-----|-----------|
| Frontend | [Vercel](https://vercel.com) | Hobby | **$0** |
| Backend API | [Render](https://render.com) | **Free** Web Service | **$0** |
| Database | [Supabase](https://supabase.com) | Free | **$0** |

**ข้อจำกัดที่ต้องยอมรับ (Free):**

- Render API **sleep หลัง idle ~15 นาที** → request แรกหลังตื่นรอ ~30–60 วินาที (cold start)
- Slip รูปเก็บใน container disk ชั่วคราว — redeploy แล้วอาจหาย
- Supabase Free มี quota connection/storage (พอสำหรับ hobby)

---

## Phase 0 — เคลียร์ deploy เก่า (สำคัญ)

ถ้าเคย deploy แล้วโดน Starter ($0.0097/ชม.) ให้ทำก่อน:

1. เข้า [Render Dashboard](https://dashboard.render.com) → **Billing**
2. ถ้า workspace **Suspended** และมี invoice ค้าง (เช่น ~$5) — **จ่าย invoice** หรือติดต่อ Render support เพื่อเคลียร์บัญชี
3. ลบ web service เก่า (เช่น `drinksplit` / `drinksplit-api` ที่เป็น **Starter**):
   - Service → **Settings** → เลื่อนลง → **Delete Web Service**
4. **อย่าสร้าง** Render Postgres — ใช้ Supabase แทน (Render DB = paid)
5. ตรวจว่าไม่มี service อื่นที่เป็น Starter/Standard

> **อย่าเลือก Starter** ตอนสร้าง service ใหม่ — Starter = ~$7/เดือน แม้ workspace จะเป็น Hobby (ฟรี)

---

## Phase 1 — Supabase (Database)

1. สมัคร [supabase.com](https://supabase.com) → **New project**
2. Region: **Singapore (ap-southeast-1)** (latency ดีจากไทย)
3. ตั้งรหัส DB password แล้วเก็บไว้
4. รอ project พร้อม (~2 นาที)
5. **Project Settings → Database → Connection string → URI**
6. คัดลอก `postgresql://postgres.[ref]:[PASSWORD]@...supabase.co:5432/postgres`
7. เก็บเป็น `DATABASE_URL` (ใช้บน Render เท่านั้น — **อย่า commit ลง Git**)

**หมายเหตุ Prisma:** repo ยังไม่มี `prisma/migrations/` — production ครั้งแรกใช้ `npx prisma db push`

---

## Phase 2 — Render (Backend, Free only)

### สิ่งที่เตรียมไว้ใน repo แล้ว

| ไฟล์ | ทำอะไร |
|------|--------|
| `render.yaml` | Blueprint — service `cleft-api`, `plan: free` |
| `Dockerfile` (root) | Build NestJS + รัน `prisma db push` ตอน start อัตโนมัติ |
| `render.env.example` | template env สำหรับ copy ใส่ Render Dashboard |
| `scripts/generate-jwt-secrets.sh` | สร้าง JWT secrets |
| `scripts/prisma-push-prod.sh` | push schema จากเครื่อง local (ถ้า deploy แล้วแต่ DB ยังไม่มีตาราง) |

---

### 2.1 — Push code ขึ้น GitHub

```bash
git add .
git commit -m "Prepare cleft Render deploy (Phase 2)"
git push origin main
```

Repo ต้องมีไฟล์ `render.yaml` และ `Dockerfile` ที่ root บน branch `main`

---

### 2.2 — สร้าง service ด้วย Blueprint

1. เข้า [dashboard.render.com](https://dashboard.render.com)
2. **New +** → **Blueprint**
3. Connect GitHub repo `ProC1240/drinksplit` (หรือ repo ที่ push ไว้)
4. Render อ่าน `render.yaml` → แสดง service **`cleft-api`**
5. กด **Apply** / **Create**

> ถ้าเคยมี service เก่า (`drinksplit`, Starter) ให้ลบก่อน — ดู Phase 0

---

### 2.3 — ใส่ Environment Variables

ไปที่ **cleft-api → Environment** แล้วเพิ่มทีละตัว:

**สร้าง JWT secrets บนเครื่อง:**

```bash
./scripts/generate-jwt-secrets.sh
```

**คัดลอกค่าจาก Phase 1 (Supabase) + Google Cloud:**

```env
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
FRONTEND_URL=https://YOUR_APP.vercel.app
GOOGLE_CLIENT_ID=<จาก Google Cloud>
GOOGLE_CLIENT_SECRET=<จาก Google Cloud>
GOOGLE_CALLBACK_URL=https://YOUR_APP.vercel.app/api/auth/google/callback
JWT_ACCESS_SECRET=<จาก generate-jwt-secrets.sh>
JWT_REFRESH_SECRET=<จาก generate-jwt-secrets.sh>
```

ดู template เต็มใน `render.env.example`

**หมายเหตุ `FRONTEND_URL`:** ถ้ายังไม่ deploy Vercel (Phase 3) ใส่ placeholder ชั่วคราวได้ เช่น `https://cleft.vercel.app` แล้วกลับมาแก้หลังได้ URL จริง → **Manual Deploy** backend อีกครั้ง

**หมายเหตุ `GOOGLE_CALLBACK_URL`:** ใช้ Vercel URL ผ่าน proxy — `https://<app>.vercel.app/api/auth/google/callback` (ไม่ใช่ Render URL โดยตรง)

ค่าเหล่านี้ตั้งใน `render.yaml` แล้ว (ไม่ต้องใส่ซ้ำ):

- `NODE_ENV=production`
- `COOKIE_SAME_SITE=none`
- `JWT_ACCESS_TTL=15m`
- `JWT_REFRESH_TTL=7d`

กด **Save Changes** → Render จะ redeploy อัตโนมัติ

---

### 2.4 — ตรวจว่าเป็น Free (สำคัญ)

1. **cleft-api → Settings → Instance Type**
2. ต้องเป็น **Free** — ถ้าเป็น **Starter** ให้เปลี่ยนเป็น Free ทันที
3. รอ deploy สีเขียว (Live)

---

### 2.5 — ทดสอบ

เปิดใน browser หรือ curl:

```text
GET https://<your-api>.onrender.com/health
```

ควรได้:

```json
{"ok":true}
```

> ครั้งแรกหลัง sleep อาจรอ 30–60 วินาที (cold start)

---

### 2.6 — Database schema

`Dockerfile` รัน `npx prisma db push` อัตโนมัติทุกครั้งที่ container start — ส่วนใหญ่ไม่ต้องทำเอง

ถ้า deploy สำเร็จแต่ API error เรื่อง DB ให้รันจากเครื่อง local:

```bash
DATABASE_URL='postgresql://...supabase...' ./scripts/prisma-push-prod.sh
```

---

### ถ้าสร้าง Web Service มือ (ไม่ใช้ Blueprint)

| การตั้งค่า | ค่า |
|-----------|-----|
| Runtime | **Docker** |
| Root Directory | `.` (repo root) |
| Dockerfile path | `Dockerfile` |
| **Instance Type** | **Free** ← สำคัญที่สุด |
| Branch | `main` |

ใส่ env เหมือน §2.3

### สิ่งที่ห้ามเปิด (จะเสียเงิน)

- Instance Type: **Starter** / Standard / Pro
- **Persistent Disk**
- Render **PostgreSQL** database
- Background Worker / Cron Job แยก (แต่ละตัวคิดเงิน)

### Checklist Phase 2 เสร็จ

- [ ] Service `cleft-api` สถานะ **Live**
- [ ] Instance Type = **Free**
- [ ] `/health` ตอบ `{"ok":true}`
- [ ] env ครบ 7 ตัว (DATABASE_URL, FRONTEND_URL, Google×3, JWT×2)
- [ ] Billing ไม่มี Starter ($0.0097/hr)

ต่อ **Phase 3 — Vercel** เมื่อ backend พร้อม

---

## Phase 3 — Vercel (Frontend)

1. [vercel.com](https://vercel.com) → **Add New Project** → import repo
2. **Root Directory:** `frontend` ← สำคัญ (monorepo)
3. Framework: Next.js (auto-detect)
4. **Environment Variables:**

```env
NEXT_PUBLIC_API_URL=https://<YOUR_RENDER_SERVICE>.onrender.com
```

Frontend เรียก API ผ่าน **`/api/*`** (same-origin proxy ใน `next.config.mjs`) — ไม่เรียก Render ตรงจาก browser เพื่อให้ cookie login ทำงาน

5. Deploy
6. คัดลอก URL เช่น `https://cleft.vercel.app` → กลับไปอัปเดต `FRONTEND_URL` และ `GOOGLE_CALLBACK_URL` บน Render → **Manual Deploy** backend อีกครั้ง

---

## Phase 4 — Google OAuth

[Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials → OAuth 2.0 Client (Web):

| ช่อง | ค่า |
|------|-----|
| Authorized JavaScript origins | `https://<YOUR_VERCEL_APP>.vercel.app` |
| Authorized redirect URIs | `https://<YOUR_VERCEL_APP>.vercel.app/api/auth/google/callback` |

ต้องตรงกับ `GOOGLE_CALLBACK_URL` บน Render (ผ่าน Vercel proxy ไม่ใช่ Render URL โดยตรง)

OAuth consent screen: ถ้ายัง Testing ให้เพิ่ม email ของตัวเองเป็น Test user

---

## Phase 5 — ตรวจสอบหลัง deploy

### Functional

- [ ] เปิด Vercel URL — หน้า Home โหลดได้
- [ ] Profile menu → Login with Google (อาจช้าครั้งแรกถ้า Render กำลัง cold start)
- [ ] แก้ profile + currency → Save → refresh แล้วยังอยู่
- [ ] Items → Members → Summary → Confirm
- [ ] History บน Home (ต้อง login)

### Billing ($0 check)

- [ ] Render → service → Settings → **Instance Type = Free**
- [ ] Render → Billing → ไม่มี line item **Starter** ($0.0097/hr)
- [ ] มีแค่ 1 web service (backend)
- [ ] ไม่มี Render Postgres service
- [ ] Vercel Hobby — ไม่เกิน free limits
- [ ] Supabase Free — ไม่เกิน quota

---

## Cold start (Free Render)

เมื่อ API sleep แล้ว user กด Login หรือเข้า Items:

1. Request แรกอาจค้าง 30–60 วินาที
2. Request ถัดไปเร็วปกติ
3. ถ้า idle อีก 15 นาที → sleep อีกรอบ

นี่คือ trade-off ของ Free — **ไม่ใช่ bug**

---

## Local development (อ้างอิง)

```bash
# Full stack local
docker compose up --build

# หรือแยก
cd backend && npm install && npx prisma migrate dev && npm run start:dev
cd frontend && npm install && npm run dev
```

Local env: ดู `backend/.env.example`, `frontend/.env.example`

---

## Troubleshooting

| ปัญหา | แก้ |
|-------|-----|
| Login ไม่ได้ / cookie หาย | ตรวจ `COOKIE_SAME_SITE=none`, HTTPS ทั้งคู่, `FRONTEND_URL` ตรง Vercel |
| CORS error | `FRONTEND_URL` บน Render ต้องตรง domain Vercel (ไม่มี slash ท้าย) |
| `open Dockerfile: no such file` | Root Directory = `.`, Dockerfile path = `Dockerfile` |
| โดนคิด Starter อีก | ลบ service → สร้างใหม่ด้วย Blueprint หรือเลือก **Free** ตอนสร้าง |
| Workspace Suspended | จ่าย invoice ค้าง → ลบ Starter service → deploy Free ใหม่ |
| Prisma connection fail | ใช้ Supabase URI ถูกต้อง, IP allow ใน Supabase (ปกติ allow all) |

---

## ความลับ

อย่า commit `.env`, Google secrets, JWT secrets, หรือ `DATABASE_URL` — ใส่ใน Environment ของ Vercel/Render/Supabase เท่านั้น
