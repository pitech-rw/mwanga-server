import { IsInt, Min } from 'class-validator';

export class IssueInventoryBatteryBikeDto {
  @IsInt()
  @Min(1)
  bikeId: number;
}