import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCardDto {
  @IsString()
  @MinLength(6)
  @MaxLength(200)
  token: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  status?: string;

  @IsOptional()
  riderId?: number;
}
