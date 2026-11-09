import { IsInt, IsNumber, IsOptional, IsString, Min, MinLength, MaxLength } from 'class-validator';

export class FloatCreditDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsInt()
  @Min(1)
  companyAccountId: number;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  externalReference: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
