import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const userTypes = ['rider', 'office', 'swapper', 'agent', 'customer'] as const;

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

  @IsIn(userTypes)
  type: (typeof userTypes)[number];

  @IsInt()
  @Min(1)
  roleId: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
