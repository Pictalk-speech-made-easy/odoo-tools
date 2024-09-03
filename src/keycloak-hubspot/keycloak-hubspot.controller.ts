import { Controller, Post, Body, Logger } from '@nestjs/common';
import { KeycloakHubspotService } from './keycloak-hubspot.service';
import axios from 'axios';
import { User } from './User.type';
import { KeycloakService } from 'src/keycloak.service';
import { EmailService } from 'src/email.service';

@Controller('keycloak-hubspot')
export class KeycloakHubspotController {
  private readonly logger = new Logger(KeycloakHubspotController.name);
  private keycloakToken: string | null = null;
  private tokenExpiration: number | null = null;

  constructor(private keycloakService: KeycloakService, private readonly keycloakHubspotService: KeycloakHubspotService) {}

  @Post('webhook')
  async handleWebhook(@Body() body: any) {
    const { action, userId } = body;

    try {
      const token = await this.keycloakService.getKeycloakToken();

      const response = await axios.get(
        `${process.env.KEYCLOAK_BASE_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const user: User = response.data;

      if (action === 'DELETE') {
        this.logger.log(`Deleting user with ID: ${user.id}`);
        await this.keycloakHubspotService.handleUserDeletion(user);
      }

      if (action === 'DELETE_ACCOUNT') {
          this.logger.log(`Deleting account with ID: ${user.id}`);
          await this.keycloakHubspotService.handleUserDeletion(user);
        }

      if (action === 'REGISTER') {
          this.logger.log(`Creating user with ID: ${user.id}`);
          await this.keycloakHubspotService.handleUserCreation(user);
          
      }

      if (action === 'LOGIN') {
        this.logger.log(`User with ID: ${user.id} Logged in`);
        await this.keycloakHubspotService.handleUserCreation(user);
      }
      
    } catch (error) {
      this.logger.error('Error handling webhook', error.message);
      throw error;
    }
    return { message: 'Webhook processed successfully.' };
  }
}