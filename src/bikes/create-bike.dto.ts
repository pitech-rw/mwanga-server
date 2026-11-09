import { IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateBikeDto {
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  plateNumber: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  chassisNumber?: string;

  @IsString()
  @MinLength(3)
  @MaxLength(120)
  serialNumber: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  model: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  image?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  status?: string;

  @IsInt()
  @Min(1)
  ownerId: number;

  @IsOptional()
  userId?: number;

  @IsOptional()
  currentBatteryId?: number;
}
