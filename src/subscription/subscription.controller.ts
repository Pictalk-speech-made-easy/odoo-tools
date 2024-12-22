import { Controller, Get, Logger, Post, UseGuards, Inject, UnauthorizedException, ForbiddenException } from '@nestjs/common';
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
  async obtainPlusSubscription(@AuthenticatedUser() user: UserDto) {
    // 1. Check subscription info from cache
    let subscriptionInfo: SubscriptionDto =
      await this.sharedCacheService.get(user.email) as SubscriptionDto;

    // 2. If no cached subscription, fetch from Odoo and cache it
    if (!subscriptionInfo) {
      subscriptionInfo = await this.subscriptionOdooService.checkUserSubscription(user.email);
      await this.sharedCacheService.set(user.email, subscriptionInfo);
    }

    // 3. If user already has Plus or Pro, throw an exception
    if (subscriptionInfo && (subscriptionInfo.tier === 'plus' || subscriptionInfo.tier === 'pro')) {
      throw new ForbiddenException('User already has a subscription');
    }

    // 4. Determine the expiry date
    const expiryDate = this.getOfferExpiryDate();

    // 5. Create the subscription
    return this.subscriptionOdooService.createAgendaPlusSubscription(user.email, 100, expiryDate);
  }

  private getOfferExpiryDate(): Date {
    const today = new Date();
    const firstMarch2025 = new Date(2025, 2, 1); // March is index 2 (0-based)

    // If today < March 1, 2025
    if (today < firstMarch2025) {
      // Expiry is April 1, 2025
      return new Date(2025, 3, 1); // April is index 3 (0-based)
    }

    // Else, one month from now
    const oneMonth = new Date();
    oneMonth.setMonth(oneMonth.getMonth() + 1);
    return oneMonth;
  }
}