import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(2048)
  token: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}