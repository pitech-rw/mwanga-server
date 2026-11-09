import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateWalletDto {
  @IsInt()
  @Min(1)
  ownerId: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;
}
