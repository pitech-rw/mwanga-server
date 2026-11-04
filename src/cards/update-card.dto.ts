import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateCardDto {
  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(200)
  token?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  serialNumber?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  status?: string;

  @IsOptional()
  riderId?: number;
}
