import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

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

  /** Required when the bike still has a mounted battery (same serial as `GET /batteries/serial/:serial`). */
  @ApiPropertyOptional({
    description:
      'Scanned serial of the incoming pack. Required when the bike has `currentBatteryId`; must match the pack returned from **GET /batteries/serial/:serial** and the bike’s current battery.',
    example: 'BAT-1042',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  incomingBatterySerialNumber?: string;
}
