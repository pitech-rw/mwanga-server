import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';
import { USER_TYPE_NAMES, type UserTypeName } from '../auth/permission-catalog.js';

function parseQueryBoolean(value: unknown): boolean | undefined {
  if (value === true || value === 'true' || value === '1') {
    return true;
  }
  if (value === false || value === 'false' || value === '0') {
    return false;
  }
  return undefined;
}

export class ListUsersQueryDto {
  /** When set, only users of this role type are returned (e.g. rider for bike assignment). */
  @IsOptional()
  @IsIn(USER_TYPE_NAMES)
  type?: UserTypeName;

  /** When true, omit deactivated accounts (for assignment pickers). */
  @IsOptional()
  @Transform(({ value }) => parseQueryBoolean(value))
  @IsBoolean()
  activeOnly?: boolean;
}