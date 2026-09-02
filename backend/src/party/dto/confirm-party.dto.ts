import { IsDateString, IsOptional, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { CalculatePartyDto } from "./calculate-party.dto";

export class ConfirmPartyDto {
  @ValidateNested()
  @Type(() => CalculatePartyDto)
  party!: CalculatePartyDto;

  @IsDateString()
  confirmedAt!: string;

  @IsOptional()
  @IsString()
  slipUrl?: string;
}
