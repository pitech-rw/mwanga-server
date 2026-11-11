import { IsInt, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class AgentTopUpDto {
  @IsInt()
  @Min(1)
  walletId: number;

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

export class TopUpTargetQueryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  phone: string;
}
