import { Controller, Post, Body, Logger } from '@nestjs/common';
import { KeycloakHubspotService } from './keycloak-hubspot.service';

@Controller('keycloak-hubspot')
export class KeycloakHubspotController {
  private readonly logger = new Logger(KeycloakHubspotController.name);

  constructor(private readonly keycloakHubspotService: KeycloakHubspotService) {}

  @Post('sync')
  async syncUsers() {
    try {
      await this.keycloakHubspotService.syncUsers();
      return { message: 'User sync completed successfully.' };
    } catch (error) {
      this.logger.error('Error syncing users', error.message);
      return { message: 'Error syncing users.' };
    }
  }

  @Post('webhook')
  async handleWebhook(@Body() body: any) {
    const { action, userId } = body;

    if (action === 'DELETE') {
      await this.keycloakHubspotService.handleUserDeletion(userId);
    }

    if (action === 'DELETE_ACCOUNT') {
        await this.keycloakHubspotService.handleUserDeletion(userId);
      }

    if (action === 'REGISTER') {
        await this.keycloakHubspotService.handleUserCreation(userId);
    }
    return { message: 'Webhook processed successfully.' };
  }
}