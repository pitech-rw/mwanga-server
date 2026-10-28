import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateRiderDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9\s-]{7,20}$/)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  idNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  kycStatus?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  status?: string;

  @IsOptional()
  ownerId?: number;
}
