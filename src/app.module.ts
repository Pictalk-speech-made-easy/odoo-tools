import { Module } from '@nestjs/common';
import { KeycloakHubspotService } from './keycloak-hubspot/keycloak-hubspot.service';
import { KeycloakHubspotController } from './keycloak-hubspot/keycloak-hubspot.controller';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule.forRoot()],
  controllers: [KeycloakHubspotController],
  providers: [KeycloakHubspotService],
})
export class AppModule {}
