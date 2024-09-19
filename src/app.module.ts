import { Module } from '@nestjs/common';
import { KeycloakHubspotController } from './keycloak-hubspot/keycloak-hubspot.controller';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { KeycloakService } from './keycloak.service';
import { KeycloakOdooService } from './keycloak-hubspot/odoo.service';

@Module({
  imports: [ConfigModule.forRoot(), ScheduleModule.forRoot()],
  controllers: [KeycloakHubspotController],
  providers: [KeycloakService, KeycloakOdooService],
  exports: [ KeycloakService],
})
export class AppModule {}
