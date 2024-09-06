import { Controller, Post, Body, Logger } from '@nestjs/common';
import { KeycloakHubspotService } from './keycloak-hubspot.service';
import axios from 'axios';
import { AdditionalProperties, User } from './User.type';
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
    const { action, userId, email, clientId, firstName, lastName, source } = body;

    console.log('Webhook body:', body);
    let user: User;
    let additionalProperties: AdditionalProperties;
    try {
      if ((!email || !firstName || !lastName) && action !== "NEWSLETTER") { // If newsletter is true, user will not exist in keycloak
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
        user = response.data;
        if (!user.email) {
          return;
        }
        } catch (error) {
          this.logger.error('Error fetching user from Keycloak', error.message);
          throw error;
        }
      } else {
        user = { email, firstName, lastName, id: userId };
      }

      if (clientId) {
        additionalProperties = { clientId };
      }

      if (source) {
        additionalProperties = { source };
      }

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
          await this.keycloakHubspotService.handleUserCreation(user, additionalProperties);
      }

      if (action === 'LOGIN') {
        this.logger.log(`User with ID: ${user.id} Logged in`);
        await this.keycloakHubspotService.handleUserCreation(user, additionalProperties);
      }
      
    } catch (error) {
      this.logger.error('Error handling webhook', error.message);
      this.logger.error(error.stack);
      throw error;
    }
    return { message: 'Webhook processed successfully.' };
  }
}