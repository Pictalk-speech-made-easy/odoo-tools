// dto/create-lead.dto.ts
import { IsEmail, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateLeadDto {
  @IsNotEmpty()
  firstname: string;

  @IsNotEmpty()
  lastname: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsOptional()
  company?: string | undefined;

  @IsOptional()
  companySize?: string | undefined;

  @IsOptional()
  profession?: string | undefined;

  @IsOptional()
  country?: string | undefined;

  @IsOptional()
  message?: string | undefined;
}