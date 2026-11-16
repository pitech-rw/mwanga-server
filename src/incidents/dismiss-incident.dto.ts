import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DismissIncidentDto {
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  note?: string;
}