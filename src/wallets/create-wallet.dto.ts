import { IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateWalletDto {
  @IsNumber()
  ownerId: number;

  @IsOptional()
  @IsNumber()
  balance?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;
}
