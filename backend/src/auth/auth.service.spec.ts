import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { describe, expect, it, vi } from "vitest";
import { PrismaService } from "../prisma/prisma.service";
import { AuthService } from "./auth.service";

function createService(allowedEmail = "Qiuteemtus@gmail.com") {
  const upsert = vi.fn().mockResolvedValue({
    id: "user-1",
    googleId: "google-1",
    email: "Qiuteemtus@gmail.com",
    username: "Portfolio Owner",
  });
  const prisma = { user: { upsert } } as unknown as PrismaService;
  const config = {
    get: vi.fn((key: string, fallback?: string) => (key === "ALLOWED_LOGIN_EMAIL" ? allowedEmail : fallback)),
  } as unknown as ConfigService;

  return {
    service: new AuthService(prisma, {} as JwtService, config),
    upsert,
  };
}

const googleProfile = {
  googleId: "google-1",
  email: "Qiuteemtus@gmail.com",
  username: "Portfolio Owner",
};

describe("AuthService.validateGoogleUser", () => {
  it("allows the configured email without case sensitivity", async () => {
    const { service, upsert } = createService("qiuteemtus@GMAIL.COM");

    await expect(service.validateGoogleUser(googleProfile)).resolves.toMatchObject({ id: "user-1" });
    expect(upsert).toHaveBeenCalledOnce();
  });

  it("rejects a different Google account before writing to the database", async () => {
    const { service, upsert } = createService();

    await expect(
      service.validateGoogleUser({ ...googleProfile, googleId: "google-2", email: "someone@example.com" }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("fails closed when no allowed email is configured", async () => {
    const { service, upsert } = createService("");

    await expect(service.validateGoogleUser(googleProfile)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(upsert).not.toHaveBeenCalled();
  });
});
