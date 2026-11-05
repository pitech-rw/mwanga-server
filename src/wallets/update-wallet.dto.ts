import { IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateWalletDto {
  @IsOptional()
  @IsNumber()
  userId?: number;

  @IsOptional()
  @IsNumber()
  balance?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;
}
