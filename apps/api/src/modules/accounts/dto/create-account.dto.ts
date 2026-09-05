import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ACCOUNT_TYPES, OWNER_TYPES, type AccountType, type OwnerType } from '@finance/shared';

export class CreateAccountDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name: string;

  @IsEnum(ACCOUNT_TYPES)
  type: AccountType;

  @IsEnum(OWNER_TYPES)
  ownerType: OwnerType;

  @IsOptional()
  @IsInt()
  @Min(0)
  initialBalanceCents?: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  creditLimitCents?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  closingDay?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  dueDay?: number;
}
