import { Module } from '@nestjs/common';
import { KeycloakHubspotService } from './keycloak-hubspot/keycloak-hubspot.service';
import { KeycloakHubspotController } from './keycloak-hubspot/keycloak-hubspot.controller';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';
import { RedisService } from './redis.service';
import { CronService } from './cron';
import { RedisModule } from './redis.module';
import { ScheduleModule } from '@nestjs/schedule';
import { KeycloakService } from './keycloak.service';

@Module({
  imports: [ConfigModule.forRoot(), ScheduleModule.forRoot()],
  controllers: [KeycloakHubspotController],
  providers: [KeycloakHubspotService, KeycloakService],
  exports: [ KeycloakService],
})
export class AppModule {}
