import {
  IsEnum,
  IsHexColor,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import type { TransactionType } from '@finance/shared';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name: string;

  @IsEnum(['INCOME', 'EXPENSE'] as const)
  type: TransactionType;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  icon?: string;

  @IsOptional()
  @IsHexColor()
  color?: string;
}
