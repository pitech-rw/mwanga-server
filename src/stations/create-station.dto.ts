import { IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateStationDto {
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  code: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  createdAT: Date
  updatedAt: Date
 
  @IsString()
  type: string
 
  @IsString()
  model: string
  
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  address?: string
  
  @IsOptional()
  @IsString()
  @MaxLength(20)
  status?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  capacity?: number;
}
