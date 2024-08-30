import { Module } from '@nestjs/common';
import { KeycloakHubspotService } from './keycloak-hubspot/keycloak-hubspot.service';
import { KeycloakHubspotController } from './keycloak-hubspot/keycloak-hubspot.controller';

@Module({
  imports: [],
  controllers: [KeycloakHubspotController],
  providers: [KeycloakHubspotService],
})
export class AppModule {}
