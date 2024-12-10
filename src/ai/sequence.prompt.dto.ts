import { IsIn, IsNumber, IsString, Max, Min } from 'class-validator';

export class SequencePromptDto {
  @IsString()
  instruction: string;

  @IsNumber()
  @Max(5)
  @Min(1)
  level: string;
    
  @IsString()
  @IsIn(['EN', 'FR', 'ES', 'PT', 'IT', 'DE'])
  language: string;
}