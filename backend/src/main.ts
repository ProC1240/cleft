import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import { join } from "path";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Render/Vercel terminate TLS — required for Secure cookies (SameSite=none)
  app.getHttpAdapter().getInstance().set("trust proxy", 1);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );
  app.use(cookieParser());
  app.use("/uploads", express.static(join(process.cwd(), "uploads")));

  const frontendUrl = (configService.get<string>("FRONTEND_URL", "http://localhost:3000") ?? "").replace(/\/$/, "");
  app.enableCors({
    origin: frontendUrl,
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = configService.get<number>("PORT", 4000);
  await app.listen(port);
}

bootstrap();
