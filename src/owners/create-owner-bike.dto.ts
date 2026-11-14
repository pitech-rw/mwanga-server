import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** Bike registered against a new owner (ownerId is set server-side). */
export class CreateOwnerBikeDto {
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
}