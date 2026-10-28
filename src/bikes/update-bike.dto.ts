import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateBikeDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  plateNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  vin?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  model?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  status?: string;

  @IsOptional()
  ownerId?: number;

  @IsOptional()
  riderId?: number;

  @IsOptional()
  currentBatteryId?: number;
}
