import { IsDateString, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class AddContributionDto {
  @IsInt()
  @Min(1)
  amountCents: number;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  notes?: string;
}
