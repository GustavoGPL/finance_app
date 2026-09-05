import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  OWNER_TYPES,
  RECURRENCE_TYPES,
  TRANSACTION_STATUSES,
  TRANSACTION_TYPES,
  type OwnerType,
  type Recurrence,
  type TransactionStatus,
  type TransactionType,
} from '@finance/shared';

export class CreateTransactionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  description: string;

  @IsInt()
  @Min(1)
  amountCents: number;

  @IsEnum(TRANSACTION_TYPES)
  type: TransactionType;

  @IsDateString()
  date: string;

  @IsEnum(OWNER_TYPES)
  ownerType: OwnerType;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsString()
  creditCardId?: string;

  @IsOptional()
  @IsString()
  transferToAccountId?: string;

  @IsOptional()
  @IsString()
  paidById?: string;

  @IsOptional()
  @IsEnum(TRANSACTION_STATUSES)
  status?: TransactionStatus;

  @IsOptional()
  @IsEnum(RECURRENCE_TYPES)
  recurrence?: Recurrence;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(48)
  installments?: number;
}
