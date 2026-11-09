import { IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { BATTERY_STATUS_VALUES } from './battery-status.js';

export class CreateBatteryDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  serialNumber: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  manufacturer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  oem?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  model: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  batteryType?: string;

  @IsOptional()
  @IsIn(BATTERY_STATUS_VALUES)
  status?: (typeof BATTERY_STATUS_VALUES)[number];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  soc?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  soh?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  cycleCount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  voltage?: number;

  @IsOptional()
  @IsNumber()
  stationId?: number;

  @IsOptional()
  @IsString()
  Attached_to: string;

  
  @IsOptional()
  @IsString()
  Attached_by: string;
}
