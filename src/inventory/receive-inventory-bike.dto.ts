import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ReceiveInventoryBikeDto {
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

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}