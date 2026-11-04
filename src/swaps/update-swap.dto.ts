import { IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateSwapDto {
  @IsOptional()
  @IsNumber()
  riderId?: number;

  @IsOptional()
  @IsNumber()
  bikeId?: number;

  @IsOptional()
  @IsNumber()
  stationId?: number;

  @IsOptional()
  @IsNumber()
  cardId?: number;

  @IsOptional()
  @IsNumber()
  oldBatteryId?: number;

  @IsOptional()
  @IsNumber()
  newBatteryId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  paymentStatus?: string;

  @IsOptional()
  @IsNumber()
  fee?: number;

  @IsOptional()
  @IsNumber()
  walletBalanceAfter?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  paymentReference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  completedAt?: Date;
}
