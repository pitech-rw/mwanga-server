import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, IsString, MaxLength, Min, MinLength } from 'class-validator';

/** Body for POST /swaps/lookup — scan or type the returning pack serial before assign. */
export class SwapLookupDto {
  @ApiProperty({ description: 'Swap operator user id (must be allowed to operate swaps)', example: 42 })
  @IsInt()
  @Min(1)
  swapperId: number;

  @ApiProperty({ description: 'Station where the swap happens', example: 3 })
  @IsNumber()
  stationId: number;

  @ApiProperty({ description: 'Bike id (incoming pack must match bike.currentBatteryId)', example: 7 })
  @IsNumber()
  bikeId: number;

  @ApiProperty({
    description:
      'Physical serial / barcode on the pack the rider is returning (must match the bike’s current battery)',
    example: 'BAT-1042',
    maxLength: 200,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  serialNumber: string;
}
