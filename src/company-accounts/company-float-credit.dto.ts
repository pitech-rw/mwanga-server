import { IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CompanyFloatCreditDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  externalReference: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}