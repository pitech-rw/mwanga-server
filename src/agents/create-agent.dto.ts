import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateAgentDto {
  /** Existing user account with type agent (created under Users first). */
  @IsInt()
  @Min(1)
  userId: number;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;
}
