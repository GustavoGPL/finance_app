import { IsEmail, IsNotEmpty, IsOptional, IsString, Length, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8, { message: 'A senha deve ter pelo menos 8 caracteres' })
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  householdName?: string;

  @IsOptional()
  @IsString()
  @Length(9, 9, { message: 'Código de convite inválido' })
  inviteCode?: string;
}
