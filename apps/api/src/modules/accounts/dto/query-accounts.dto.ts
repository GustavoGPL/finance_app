import { IsEnum, IsOptional } from 'class-validator';
import { VISIBILITIES, type Visibility } from '@finance/shared';

export class QueryAccountsDto {
  @IsOptional()
  @IsEnum(VISIBILITIES)
  visibility?: Visibility = 'SELF';
}
