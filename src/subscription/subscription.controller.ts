import { Controller, Get, Logger, Post, UseGuards, Inject } from '@nestjs/common';
import { SubscriptionOdooService } from "./odoo.service";
import { AuthenticatedUser, AuthGuard } from 'nest-keycloak-connect';
import { UserDto } from './user.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
@Controller('subscription')
export class SubscriptionController {
  private readonly logger = new Logger(SubscriptionController.name);

  constructor(private subscriptionOdooService: SubscriptionOdooService, @Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  @Get()
  @UseGuards(AuthGuard)
  async getSubscription(
    @AuthenticatedUser() user: UserDto,
  ) {
    const cache = await this.cacheManager.get(user.email);
    if (cache) return cache;
    const subscription = await this.subscriptionOdooService.checkUserSubscription(user.email);
    await this.cacheManager.set(user.email, subscription);
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