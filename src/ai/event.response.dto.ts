import { IsString, IsNotEmpty, IsArray, ArrayMinSize } from 'class-validator';

export class EventResponseDto {
    @IsArray()
    @IsString({ each: true })
    @ArrayMinSize(1)
    @IsNotEmpty()
    words: string[];

    @IsString()
    @IsNotEmpty()
    description: string;
}