import { Type } from 'class-transformer';
import { IsEmail, IsNumber, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';

/** Body for PATCH /auth/me — self-service profile (not role, type, or isActive). */
export class UpdateMyProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  username?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @IsOptional()
  @ValidateIf((_dto, value) => value !== null && value !== undefined)
  @Type(() => Number)
  @IsNumber()
  latitude?: number | null;

  @IsOptional()
  @ValidateIf((_dto, value) => value !== null && value !== undefined)
  @Type(() => Number)
  @IsNumber()
  longitude?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  image?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password?: string;

  /** Required when `password` is set; must match the current password. */
  @ValidateIf((dto: UpdateMyProfileDto) => dto.password !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  currentPassword?: string;
}