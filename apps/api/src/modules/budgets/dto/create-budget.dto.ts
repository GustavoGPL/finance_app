import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateBudgetDto {
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @IsInt()
  @Min(1)
  month: number;

  @IsInt()
  @Min(2000)
  year: number;

  @IsInt()
  @Min(1)
  limitCents: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
