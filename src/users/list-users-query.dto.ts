import { IsIn, IsOptional } from 'class-validator';
import { USER_TYPE_NAMES, type UserTypeName } from '../auth/permission-catalog.js';

export class ListUsersQueryDto {
  /** When set, only users of this role type are returned (e.g. rider for bike assignment). */
  @IsOptional()
  @IsIn(USER_TYPE_NAMES)
  type?: UserTypeName;
}
