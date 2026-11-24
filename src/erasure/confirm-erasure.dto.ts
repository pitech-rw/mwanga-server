import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ConfirmErasureDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;

  @IsOptional()
  @IsBoolean()
  acknowledgeBalanceForfeiture?: boolean;
}