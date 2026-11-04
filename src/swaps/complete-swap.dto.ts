import { IsInt, IsOptional, Min } from 'class-validator';

export class CompleteSwapDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  swapperId?: number;
}
