import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { MarketingModule } from './marketing/marketing.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard, ResourceGuard, RoleGuard } from 'nest-keycloak-connect';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [AiModule, MarketingModule, SubscriptionModule, ConfigModule.forRoot(), ScheduleModule.forRoot()],
  controllers: [],
  exports: [],
  providers: [
    
  ],
})
export class AppModule {}
