import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService, JwtSignOptions } from "@nestjs/jwt";
import { User } from "@prisma/client";
import { createHash } from "crypto";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateGoogleUser(googleProfile: { googleId: string; email: string; username: string; avatar?: string }) {
    const allowedEmail = this.configService.get<string>("ALLOWED_LOGIN_EMAIL", "").trim().toLowerCase();
    const profileEmail = googleProfile.email.trim().toLowerCase();

    if (!allowedEmail || profileEmail !== allowedEmail) {
      throw new UnauthorizedException("This Google account is not allowed");
    }

    const user = await this.prisma.user.upsert({
      where: { googleId: googleProfile.googleId },
      update: {
        email: googleProfile.email,
        username: googleProfile.username,
        avatar: googleProfile.avatar,
      },
      create: {
        googleId: googleProfile.googleId,
        email: googleProfile.email,
        username: googleProfile.username,
        avatar: googleProfile.avatar,
      },
    });

    return user;
  }

  createTokens(user: User) {
    const payload = { sub: user.id, email: user.email };
    const accessTtl = this.configService.get<string>("JWT_ACCESS_TTL", "15m") as JwtSignOptions["expiresIn"];
    const refreshTtl = this.configService.get<string>("JWT_REFRESH_TTL", "7d") as JwtSignOptions["expiresIn"];
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>("JWT_ACCESS_SECRET"),
      expiresIn: accessTtl,
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>("JWT_REFRESH_SECRET"),
      expiresIn: refreshTtl,
    });
    return { accessToken, refreshToken };
  }

  hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  async persistRefreshToken(userId: string, refreshToken: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: this.hashToken(refreshToken) },
    });
  }

  async refreshAccessToken(refreshToken: string) {
    const payload = this.jwtService.verify<{ sub: string; email: string }>(refreshToken, {
      secret: this.configService.get<string>("JWT_REFRESH_SECRET"),
    });

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw new Error("User not found");
    }

    const incomingHash = this.hashToken(refreshToken);
    if (!user.refreshTokenHash || user.refreshTokenHash !== incomingHash) {
      throw new Error("Refresh token revoked");
    }

    const rotated = this.createTokens(user);
    await this.persistRefreshToken(user.id, rotated.refreshToken);
    return rotated;
  }

  async revokeRefreshToken(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
  }
}
