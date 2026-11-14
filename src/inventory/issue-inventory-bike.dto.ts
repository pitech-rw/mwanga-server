import { IsInt, IsOptional, Min } from 'class-validator';

export class IssueInventoryBikeDto {
  @IsInt()
  @Min(1)
  ownerId: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  userId?: number;
}