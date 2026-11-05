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
  chassisNumber?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  serialNumber?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  model?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  image?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  status?: string;

  @IsOptional()
  userId?: number;

  @IsOptional()
  currentBatteryId?: number;
}
