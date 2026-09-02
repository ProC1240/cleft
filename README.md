# cleft

แอปแบ่งบิลแบบ Full Stack: Next.js frontend, NestJS backend, PostgreSQL และ Prisma

แนะนำ Node.js 22 สำหรับการรันแบบ native หรือ Docker Desktop สำหรับการรันทั้งระบบด้วย Compose

## รันด้วย Docker

1. สร้างไฟล์ค่าระบบจากตัวอย่าง:

   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

2. ใส่ Google OAuth Client ID/Secret ใน `backend/.env` และเพิ่ม Authorized redirect URI นี้ใน Google Cloud Console:

   ```text
   http://localhost:3000/api/auth/google/callback
   ```

3. เปิดระบบ:

   ```bash
   docker compose up -d --build
   ```

4. เข้าใช้งานที่ `http://localhost:3000` และตรวจ API ได้ที่ `http://localhost:3000/api/health`

Migration จะทำงานอัตโนมัติก่อน Backend เริ่มรับ request

## ตรวจคุณภาพ

```bash
cd frontend
npm run typecheck
npm run build

cd ../backend
npm run typecheck
npm run lint
npm run build
npm run test:smoke
```

`test:smoke` ตรวจ health, authenticated session, profile, bill calculation, confirm และ history โดยสร้างและลบข้อมูลทดสอบให้อัตโนมัติ

## ค่าที่ต้องตั้งตอน Deploy

- Frontend build: `API_PROXY_TARGET=https://your-backend.example.com`
- Backend: `DATABASE_URL`, `FRONTEND_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- `GOOGLE_CALLBACK_URL` ต้องชี้กลับผ่าน Frontend เช่น `https://your-frontend.example.com/api/auth/google/callback`
- JWT secrets สำหรับ production ต้องยาวอย่างน้อย 32 ตัวอักษร
