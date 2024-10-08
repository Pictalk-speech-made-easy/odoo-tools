// dto/create-lead.dto.ts
import { IsEmail, IsNotEmpty } from 'class-validator';

export class CreateLeadDto {
  @IsNotEmpty()
  firstname: string;

  @IsNotEmpty()
  lastname: string;

  @IsEmail()
  email: string;

  @IsNotEmpty()
  company: string;

  @IsNotEmpty()
  companySize: string;

  @IsNotEmpty()
  profession: string;

  @IsNotEmpty()
  country: string;
}