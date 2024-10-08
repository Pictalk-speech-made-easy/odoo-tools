import { Controller, Get, Body, Logger, Post, UseGuards } from '@nestjs/common';
import { SubscriptionOdooService } from "./odoo.service";
import { AuthenticatedUser, AuthGuard } from 'nest-keycloak-connect';
import { UserDto } from './user.dto';

@Controller('subscription')
export class SubscriptionController {
  private readonly logger = new Logger(SubscriptionController.name);

  constructor(private subscriptionOdooService: SubscriptionOdooService) {}

  @Get()
  @UseGuards(AuthGuard)
  async getSubscription(
    @AuthenticatedUser() user: UserDto,
  ) {
    console.log(user.email);
    return await this.subscriptionOdooService.checkUserSubscription(user.email);
  }

  @Post('plus')
  @UseGuards(AuthGuard)
  async obtainPlusSubscription(
    @AuthenticatedUser() user: UserDto,
  ) {
    return await this.subscriptionOdooService.createAgendaPlusSubscription(user.email);
  }
}