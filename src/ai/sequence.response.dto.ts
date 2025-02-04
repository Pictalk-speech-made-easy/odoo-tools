import { IsString, IsNotEmpty, IsArray, ArrayMinSize } from 'class-validator';

export class SequenceResponseDto {
    
    @IsArray()
    @ArrayMinSize(1)
    steps: { word: string, sentence: string }[];

    @IsArray()
    @ArrayMinSize(1)
    tags: string[];
}