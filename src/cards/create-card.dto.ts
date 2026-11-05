import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCardDto {
  @IsString()
  @MinLength(6)
  @MaxLength(200)
  token: string;

  @IsString()
  @MinLength(3)
  @MaxLength(120)
  serialNumber: string;

  @IsString()
  @MinLength(2)
  @MaxLength(30)
  type: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  status?: string;

  @IsOptional()
  userId?: number;
}
