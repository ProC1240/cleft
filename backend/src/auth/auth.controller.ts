import { Controller, Get, HttpException, HttpStatus, Post, Req, Res, UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request, Response } from "express";
import { GoogleAuthGuard } from "./guards/google-auth.guard";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  private cookieOptions(maxAgeMs?: number) {
    const isProd = process.env.NODE_ENV === "production";
    const sameSiteRaw = (this.configService.get<string>("COOKIE_SAME_SITE") ?? "lax").toLowerCase();
    const sameSite = sameSiteRaw === "none" ? ("none" as const) : ("lax" as const);
    const secure = isProd || sameSite === "none";
    return {
      httpOnly: true,
      secure,
      sameSite,
      path: "/",
      ...(maxAgeMs !== undefined ? { maxAge: maxAgeMs } : {}),
    } as const;
  }

  private setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    const accessTtlMs = 15 * 60 * 1000;
    const refreshTtlMs = 7 * 24 * 60 * 60 * 1000;
    res.cookie("access_token", accessToken, this.cookieOptions(accessTtlMs));
    res.cookie("refresh_token", refreshToken, this.cookieOptions(refreshTtlMs));
  }

  @Get("google")
  @UseGuards(GoogleAuthGuard)
  googleAuth() {
    return;
  }

  @Get("google/callback")
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user as any;
    const { accessToken, refreshToken } = this.authService.createTokens(user);
    await this.authService.persistRefreshToken(user.id, refreshToken);
    this.setAuthCookies(res, accessToken, refreshToken);
    return res.redirect(this.configService.get<string>("FRONTEND_URL", "http://localhost:3000"));
  }

  @Post("refresh")
  async refresh(@Req() req: Request, @Res() res: Response) {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) {
      throw new HttpException("Refresh token missing", HttpStatus.UNAUTHORIZED);
    }

    try {
      const { accessToken, refreshToken: nextRefresh } = await this.authService.refreshAccessToken(refreshToken);
      this.setAuthCookies(res, accessToken, nextRefresh);
      return res.status(200).json({ success: true });
    } catch {
      throw new HttpException("Invalid refresh token", HttpStatus.UNAUTHORIZED);
    }
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  async logout(@Req() req: Request, @Res() res: Response) {
    const payload = req.user as { userId?: string } | undefined;
    if (payload?.userId) await this.authService.revokeRefreshToken(payload.userId);

    const clearCookie = this.cookieOptions();
    res.clearCookie("access_token", clearCookie);
    res.clearCookie("refresh_token", clearCookie);
    return res.status(200).json({ success: true });
  }

  @Get("session")
  @UseGuards(JwtAuthGuard)
  session(@Req() req: Request) {
    return { authenticated: true, user: req.user };
  }
}
