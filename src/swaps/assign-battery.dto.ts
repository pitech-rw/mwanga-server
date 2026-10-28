import { IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class AssignBatteryDto {
  @IsNumber()
  riderId: number;

  @IsNumber()
  stationId: number;

  @IsNumber()
  bikeId: number;

  @IsOptional()
  @IsNumber()
  fee?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
