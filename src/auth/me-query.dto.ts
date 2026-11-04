import { IsIn, IsOptional } from 'class-validator';

export class MeQueryDto {
  /**
   * persona (default): fields appropriate for User.type
   * full: all non-secret profile fields
   */
  @IsOptional()
  @IsIn(['persona', 'full'])
  view?: 'persona' | 'full';
}
