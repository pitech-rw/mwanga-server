import { IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateIncidentDto {
  @IsInt()
  @Min(1)
  batteryId: number;

  @IsString()
  @MinLength(2)
  @MaxLength(4000)
  description: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  image?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  swapTransactionId?: number;
}