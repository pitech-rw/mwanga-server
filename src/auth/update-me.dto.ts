import { IsEmail, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';

/** Fields a signed-in user may change on their own account (not role, type, or admin flags). */
export class UpdateMeDto {
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
  @IsString()
  @MaxLength(500)
  image?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password?: string;

  /** Required when `password` is provided. */
  @ValidateIf((dto: UpdateMeDto) => dto.password !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  currentPassword?: string;
}