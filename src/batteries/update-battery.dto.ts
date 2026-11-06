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
  @MaxLength(80)
  oem?: string;

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
  @IsInt()
  @Min(0)
  cycleCount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  voltage?: number;

  @IsOptional()
  @IsNumber()
  stationId?: number | null;

  /**
   * When set, assigns this battery as the bike's current pack and clears any station
   * assignment. Omit both `bikeId` and `stationId` to leave location unchanged.
   * Do not send a non-null `bikeId` and non-null `stationId` in the same request.
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  bikeId?: number | null;
}
