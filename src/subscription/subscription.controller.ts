import { Controller, Get, Logger, Post, UseGuards, Inject } from '@nestjs/common';
import { SubscriptionOdooService } from "./odoo.service";
import { AuthenticatedUser, AuthGuard } from 'nest-keycloak-connect';
import { UserDto } from './user.dto';
import { SharedCacheService } from './shared.cache.service';
import { SubscriptionDto } from './subscription.dto';
@Controller('subscription')
export class SubscriptionController {
  private readonly logger = new Logger(SubscriptionController.name);

  constructor(private subscriptionOdooService: SubscriptionOdooService, private sharedCacheService: SharedCacheService) {}

  @Get()
  @UseGuards(AuthGuard)
  async getSubscription(
    @AuthenticatedUser() user: UserDto,
  ):Promise<SubscriptionDto>  {
    const cache: SubscriptionDto = await this.sharedCacheService.get(user.email) as SubscriptionDto;
    if (cache) return cache;
    const subscription = await this.subscriptionOdooService.checkUserSubscription(user.email);
    await this.sharedCacheService.set(user.email, subscription);
    return subscription;
  } 

  @Get('plans')
  async getPlans(
    @AuthenticatedUser() user: UserDto,
  ) {
    return await this.subscriptionOdooService.getAgendaProductPrices();
  }

  @Post('plus')
  @UseGuards(AuthGuard)
  async obtainPlusSubscription(
    @AuthenticatedUser() user: UserDto,
  ) {
    return await this.subscriptionOdooService.createAgendaPlusSubscription(user.email);
  }
}