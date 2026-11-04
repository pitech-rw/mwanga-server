import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** Self-service registration creates a rider account only */
export class SignUpDto {
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

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}
