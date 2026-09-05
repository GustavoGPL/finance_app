import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { TRANSACTION_TYPES, VISIBILITIES, type TransactionType, type Visibility } from '@finance/shared';

export class QueryTransactionsDto {
  @IsOptional()
  @IsEnum(VISIBILITIES)
  visibility?: Visibility = 'SELF';

  @IsOptional()
  @IsInt()
  @Min(2000)
  year?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @IsOptional()
  @IsEnum(TRANSACTION_TYPES)
  type?: TransactionType;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
