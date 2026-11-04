import { IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @MinLength(1)
  @MaxLength(255)
  @IsString()
  identifier: string;

  @MinLength(8)
  @MaxLength(128)
  @IsString()
  password: string;
}
