import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from 'cache-manager';
import { Body, Controller, Get, Inject, Logger, Post, UnauthorizedException, UseGuards, UsePipes, ValidationPipe } from "@nestjs/common";
import OpenAI from 'openai';
import { AuthenticatedUser, AuthGuard } from "nest-keycloak-connect";
import { UserDto } from "src/subscription/user.dto";
import { system_prompt } from "./sequence.prompt";
import { SequencePromptDto } from "./sequence.prompt.dto";
import { SharedCacheService } from "src/subscription/shared.cache.service";
import { SubscriptionDto } from "src/subscription/subscription.dto";

@Controller('ai')
export class AiController {
  private readonly logger = new Logger(AiController.name);
  private readonly apiKey = process.env.OPENAI_API_KEY;
  private openai = new OpenAI({
    apiKey: this.apiKey,
  });

  constructor(private sharedCacheService: SharedCacheService) {}
  
  @Post('sequences')
  @UseGuards(AuthGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async generateSequence(
    @Body() body: SequencePromptDto,
    @AuthenticatedUser() user: UserDto,) {
    const subscription: SubscriptionDto = await this.sharedCacheService.get(user.email) as SubscriptionDto;
    console.log(subscription);
    if (!subscription || subscription.tier === 'free') throw new UnauthorizedException('You need to be a subscriber to use this feature');
    const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [system_prompt, 
            {
                role: "user",
                content: `Instruction: ${body.instruction}\nLevel: ${body.level}\nLanguage: ${body.language}`
            }
        ],
        temperature: 0.7,
        
    });
    return response;
  }

  @Post('board')
  @UseGuards(AuthGuard)
  async generateBoard(@Body() body: any) {
  }

  @Post('agenda')
  @UseGuards(AuthGuard)
  async generateAgenda(@Body() body: any) {
  }
}