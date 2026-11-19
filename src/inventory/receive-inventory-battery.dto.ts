import { IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class ReceiveInventoryBatteryDto {
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

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  model?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  capacity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  batteryType?: string;

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
  @IsString()
  @MaxLength(2000)
  notes?: string;
}