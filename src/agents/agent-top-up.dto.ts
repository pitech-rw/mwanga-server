import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class AgentTopUpDto {
  @IsInt()
  @Min(1)
  walletId: number;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  idempotencyKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  discountCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsIn(['fr', 'en'])
  locale?: 'fr' | 'en';
}

export class TopUpTargetQueryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  q: string;
}