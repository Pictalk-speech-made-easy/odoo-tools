import { IsString, IsNotEmpty, IsArray, ArrayMinSize } from 'class-validator';

export class SequenceResponseDto {
    @IsString()    
    @IsNotEmpty()
    word: string;

    @IsString()
    @IsNotEmpty()
    sentence: string;
}