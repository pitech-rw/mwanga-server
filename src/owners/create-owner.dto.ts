import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CreateOwnerBikeDto } from './create-owner-bike.dto.js';

export class CreateOwnerDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  status?: string;

  /** Portal login user; optional when the buyer has no app account yet */
  @IsOptional()
  @IsInt()
  @Min(1)
  userId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  /** Optional fleet bikes to register on this owner in the same transaction. */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOwnerBikeDto)
  bikes?: CreateOwnerBikeDto[];
}
