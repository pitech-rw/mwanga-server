import { IsInt, Min } from 'class-validator';

export class IssueInventoryBatteryStationDto {
  @IsInt()
  @Min(1)
  stationId: number;
}