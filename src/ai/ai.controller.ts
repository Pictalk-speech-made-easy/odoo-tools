import { BadRequestException, Body, Controller, ForbiddenException, Logger, Post, UnauthorizedException, UseGuards, UsePipes, ValidationPipe } from "@nestjs/common";
import OpenAI from 'openai';
import { ThrottlerGuard, Throttle } from "@nestjs/throttler"; // <-- Import
import { AuthenticatedUser, AuthGuard } from "nest-keycloak-connect";
import { UserDto } from "src/subscription/user.dto";
import { event_system_prompt, sequence_response_format, sequence_system_prompt } from "./sequence.prompt";
import { SequencePromptDto } from "./sequence.prompt.dto";
import { SharedCacheService } from "src/subscription/shared.cache.service";
import { SubscriptionDto } from "src/subscription/subscription.dto";
import { EventResponseDto } from "./event.response.dto";
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SequenceResponseDto } from "./sequence.response.dto";

@Controller('ai')
@UseGuards(ThrottlerGuard)
export class AiController {
  private readonly logger = new Logger(AiController.name);
  private readonly apiKey = process.env.OPENAI_API_KEY;
  private openai = new OpenAI({
    apiKey: this.apiKey,
  });

  constructor(private sharedCacheService: SharedCacheService) {}
  
  @Post('sequences')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseGuards(AuthGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async generateSequence(
    @Body() body: SequencePromptDto,
    @AuthenticatedUser() user: UserDto
  ): Promise<SequenceResponseDto> {
    const subscription: SubscriptionDto = await this.sharedCacheService.get(user.email) as SubscriptionDto;
    //if (!subscription || subscription.tier === 'free') throw new UnauthorizedException('You need to be a subscriber to use this feature');
    const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [sequence_system_prompt, 
            {
                role: "user",
                content: `Instruction: ${body.instruction}\nLevel: ${body.level}\nLanguage: ${body.language}`
            }
        ],
        response_format: sequence_response_format,
        temperature: 0.6,
    });
    if (response.choices[0].message.content.includes('error')) {
        throw new ForbiddenException(JSON.parse(response.choices[0].message.content)); 
    }

    const parsedContent = JSON.parse(response.choices[0].message.content);
    const eventResponse = plainToInstance(SequenceResponseDto, parsedContent);
    // Validate the transformed instance
    const errors = await validate(eventResponse);
    if (errors.length > 0) {
      throw new BadRequestException('Invalid response format');
    }

    return eventResponse;
  }

  @Post('board')
  @UseGuards(AuthGuard)
  async generateBoard(@Body() body: any) {
  }

  @Post('event')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @UseGuards(AuthGuard)
  async generateAgenda(
    @Body() body: SequencePromptDto,
    @AuthenticatedUser() user: UserDto
  ): Promise<EventResponseDto> {
    const subscription: SubscriptionDto = await this.sharedCacheService.get(user.email) as SubscriptionDto;
    if (!subscription || subscription.tier === 'free') throw new UnauthorizedException('You need to be a subscriber to use this feature');
    const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [event_system_prompt, 
            {
                role: "user",
                content: `Instruction: ${body.instruction}\nLevel: ${body.level}\nLanguage: ${body.language}`
            }
        ],
        temperature: 0.7,
        
    });
    // Check if response contains error
    if (response.choices[0].message.content.includes('error')) {
        throw new ForbiddenException(JSON.parse(response.choices[0].message.content)); 
    }
    const parsedContent = JSON.parse(response.choices[0].message.content);
    const eventResponse = plainToInstance(EventResponseDto, parsedContent);
    // Validate the transformed instance
    const errors = await validate(eventResponse);
    if (errors.length > 0) {
      throw new BadRequestException('Invalid response format');
    }

    return eventResponse;
  }
}