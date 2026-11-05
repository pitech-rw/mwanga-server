import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { VIOLATION_SEVERITIES, VIOLATION_STATUSES } from './violation.constants.js';

export class UpdateViolationDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  trackId?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  reason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  image?: string;

  @IsOptional()
  @IsIn(VIOLATION_STATUSES)
  status?: (typeof VIOLATION_STATUSES)[number];

  @IsOptional()
  @IsIn(VIOLATION_SEVERITIES)
  severity?: (typeof VIOLATION_SEVERITIES)[number];

  @IsOptional()
  @IsDateString()
  occurredAt?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  stationId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  reporterId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  offenderId?: number;
}
