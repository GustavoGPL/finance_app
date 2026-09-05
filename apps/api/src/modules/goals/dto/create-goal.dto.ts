import { IsDateString, IsHexColor, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateGoalDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name: string;

  @IsInt()
  @Min(1)
  targetCents: number;

  @IsOptional()
  @IsDateString()
  deadline?: string;

  @IsOptional()
  @IsHexColor()
  color?: string;
}
