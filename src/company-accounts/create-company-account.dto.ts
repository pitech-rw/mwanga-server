import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCompanyAccountDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  bankName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  accountNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;
}
