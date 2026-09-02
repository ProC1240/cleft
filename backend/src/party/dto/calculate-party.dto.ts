import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MinLength,
  ValidateNested,
} from "class-validator";

enum SplitTypeEnum {
  ALL = "ALL",
  PARTIAL = "PARTIAL",
}

class ItemInputDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsNumber()
  @IsPositive()
  price!: number;

  @IsOptional()
  @IsString()
  note?: string;
}

class ParticipantInputDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsEnum(SplitTypeEnum)
  splitType!: "ALL" | "PARTIAL";

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  itemNames?: string[];
}

export class CalculatePartyDto {
  @IsString()
  @MinLength(1)
  partyName!: string;

  @IsDateString()
  partyDate!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ItemInputDto)
  items!: ItemInputDto[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ParticipantInputDto)
  participants!: ParticipantInputDto[];
}
