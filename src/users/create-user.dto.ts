import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { USER_TYPE_NAMES } from '../auth/permission-catalog.js';

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  username: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  firstName: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  lastName: string;

  @IsEmail()
  email: string;

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
  @MaxLength(40)
  nationalId?: string;

  /** Must match a seeded Role.name; roleId is derived from this value */
  @IsIn(USER_TYPE_NAMES)
  type: (typeof USER_TYPE_NAMES)[number];

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  ownerId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  kycStatus?: string;
}
