import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { Request } from "express";
import { FileInterceptor } from "@nestjs/platform-express";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { diskStorage } from "multer";
import { extname } from "path";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CalculatePartyDto } from "./dto/calculate-party.dto";
import { ConfirmPartyDto } from "./dto/confirm-party.dto";
import { PartyService } from "./party.service";

@Controller("party")
@UseGuards(JwtAuthGuard)
export class PartyController {
  constructor(private readonly partyService: PartyService) {}

  @Post("calculate")
  calculate(@Body() dto: CalculatePartyDto) {
    return this.partyService.calculate(dto);
  }

  @Get("history")
  history(@Req() req: Request, @Query("all") all?: string) {
    const user = req.user as { userId: string };
    return this.partyService.getHistory(user.userId, all === "true");
  }

  @Post("confirm")
  @UseInterceptors(
    FileInterceptor("slip", {
      storage: diskStorage({
        destination: "./uploads",
        filename: (
          _req: Request,
          file: Express.Multer.File,
          cb: (error: Error | null, filename: string) => void,
        ) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowedExtensions = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]);
        const extension = extname(file.originalname).toLowerCase();
        const isImage = file.mimetype.startsWith("image/") && allowedExtensions.has(extension);
        cb(isImage ? null : new BadRequestException("Slip must be a JPG, PNG, GIF, or WebP image"), isImage);
      },
    }),
  )
  async confirm(@Req() req: Request, @Body("payload") payload?: string, @UploadedFile() file?: Express.Multer.File) {
    const user = req.user as { userId: string };
    if (!payload) throw new BadRequestException("Party payload is required");

    let parsed: unknown;
    try {
      parsed = JSON.parse(payload);
    } catch {
      throw new BadRequestException("Party payload must be valid JSON");
    }

    const dto = plainToInstance(ConfirmPartyDto, parsed);
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    if (errors.length > 0) throw new BadRequestException("Party payload is invalid");

    const slipUrl = file ? `/uploads/${file.filename}` : dto.slipUrl;
    return this.partyService.confirm(user.userId, dto, slipUrl);
  }
}
