import { IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class AssignBatteryDto {
  @IsInt()
  @Min(1)
  swapperId: number;

  @IsNumber()
  userId: number;

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
