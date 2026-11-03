import { IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class UpdateBatteryDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  serialNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  manufacturer?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  model?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  batteryType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  status?: string;

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
  @IsNumber()
  stationId?: number;
}
