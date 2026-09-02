# cleft — Dataflow

> เส้นทางข้อมูลจาก Browser → Next.js `/api` proxy → NestJS → PostgreSQL  
> Production: Frontend `<your-app>.vercel.app` · API `<your-api>.onrender.com` · DB Supabase

---

## 1. ภาพรวมระบบ

Frontend **ไม่เรียก Render ตรง** เพราะ cookie login จะถูกบล็อก (third-party cookie)  
ทุก request ไปที่ `/api` บนโดเมน Vercel แล้ว rewrite ไป backend

```
Browser (Vercel)
    │  same-origin: /api/*
    ▼
Next.js rewrite  (next.config.mjs)
    │  proxy → NEXT_PUBLIC_API_URL
    ▼
NestJS API  (Render)
    │  Prisma
    ▼
PostgreSQL  (Supabase)
```

| ชั้น | Production | Local |
|------|------------|--------|
| UI | `<your-app>.vercel.app` | Next.js |
| API | `<your-api>.onrender.com` (ผ่าน `/api` rewrite) | NestJS |
| DB | Supabase PostgreSQL | Docker Postgres |

**ทำไมต้องมี `/api` proxy?**  
Frontend อยู่บน Vercel, API อยู่บน Render — ถ้าเรียก API ตรง cookie จะไม่ถูกส่ง → `/auth/session` ได้ 401

---

## 2. Auth (Google OAuth + JWT cookie)

```
1. User กด Login
       │
       ▼
2. GET /api/auth/google          (Vercel → proxy NestJS)
       │
       ▼
3. Google OAuth consent
       │
       ▼
4. Callback /api/auth/google/callback
       │
       ▼
5. NestJS upsert User (googleId, email, username)
       │
       ▼
6. Set httpOnly cookies (access_token, refresh_token)
       │  redirect FRONTEND_URL
       ▼
7. GET /api/auth/session         (cookie same-origin กับ Vercel)
       │
       ▼
8. authenticated: true
```

หลัง login:

- Home เรียก `/users/profile` (currency) และ `/party/history` (Recent History)
- `/items`, `/members`, `/summary` ถูก `AuthGuard` กัน — ไม่ login จะ redirect
- Access token หมดอายุ → interceptor เรียก `POST /auth/refresh`

---

## 3. Draft party (ยังไม่ลง DB)

ระหว่างกรอกบิล ข้อมูลอยู่แค่ฝั่ง client ใน `localStorage` key `cleft-session`

```
Items page          Members page           Summary page
  │                    │                      │
  │  items + price     │  name + ALL/PARTIAL  │  computePayerAmounts()
  └────────┬───────────┴──────────┬───────────┘
           ▼                      ▼
     usePartySession()      bill-display.ts
           │
           ▼
     localStorage["cleft-session"]
     { partyName, partyDate, items[], members[] }
```

| หน้า | ข้อมูลที่เขียน |
|------|----------------|
| Items | รายการ + ราคา |
| Members | ชื่อ + split `ALL` / `PARTIAL` |
| Summary | คำนวณยอด + กด confirm |

การแบ่งเงินคำนวณฝั่ง client ด้วย `computePayerAmounts()` — logic เดียวกับ backend `PartyService.calculate()`

- **ALL** = หารทุกรายการ
- **PARTIAL** = หารเฉพาะรายการที่เลือก

---

## 4. Confirm → บันทึกลง DB

กดยืนยันที่ Summary → `POST /api/party/confirm`  
(multipart: JSON payload + ไฟล์สลิป optional)

```
localStorage draft
       │
       ▼
POST /party/confirm   (JwtAuthGuard)
       │
       ▼
สร้าง Party  (name, date, totalAmount, slipUrl)
       │
       ├── สร้าง Items
       ├── สร้าง Participants  (splitType ALL | PARTIAL)
       └── สร้าง Consumption   (ใครกินอะไร — สำหรับ PARTIAL)
       │
       ▼
สร้าง History  ผูก userId + partyId
       │
       ▼
Home → GET /party/history  → Recent History
```

---

## 5. Database models

```
User ──< History >── Party ──< Item
                      └──< Participant ──< Consumption >── Item
```

| Model | หน้าที่ |
|-------|--------|
| User | Google account, currency, refresh token hash |
| Party | ชื่อปาร์ตี้, วันที่, ยอดรวม, slip |
| Item | รายการในปาร์ตี้ |
| Participant | สมาชิกในปาร์ตี้ + split type |
| Consumption | ใครกินรายการไหน (PARTIAL) |
| History | ลิงก์ user กับ party ที่ confirm แล้ว |

---

## 6. API ที่เกี่ยวกับข้อมูลหลัก

| Method | Path | Auth | ข้อมูลไหลไปไหน |
|--------|------|------|----------------|
| GET | `/auth/google` → callback | — | Google → User ใน DB + cookies |
| GET | `/auth/session` | cookie | อ่าน JWT จาก cookie |
| POST | `/auth/refresh` | cookie | ต่ออายุ access token |
| POST | `/auth/logout` | cookie | ลบ cookies |
| GET / PATCH | `/users/profile` | JWT | อ่าน/แก้ username, avatar, currency |
| POST | `/party/calculate` | JWT | คำนวณยอด ไม่ persist |
| POST | `/party/confirm` | JWT | persist Party + History |
| GET | `/party/history` | JWT | รายการปาร์ตี้ของ user (default 3 รายการ) |
| GET | `/health` | — | health check |

---

## 7. สรุปเส้นทางข้อมูล

1. **Guest** — เห็นหน้า Home + ปุ่ม login เท่านั้น ไม่มี draft บน server
2. **Login** — Google → User ใน Postgres → JWT cookie บนโดเมน Vercel
3. **Draft** — Items / Members / Summary เขียน `localStorage` ไม่แตะ DB
4. **Confirm** — ส่ง draft + สลิปไป NestJS → Party / Item / Participant / Consumption / History
5. **History** — Home อ่าน `/party/history` จาก Postgres แสดง Recent History

**Draft อยู่ใน browser → login ผ่าน cookie บนโดเมนเดียวกัน → confirm ค่อยเขียน Postgres และโผล่ใน history**
