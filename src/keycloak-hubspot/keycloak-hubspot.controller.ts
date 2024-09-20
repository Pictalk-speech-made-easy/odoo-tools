import { Controller, Post, Body, Logger } from '@nestjs/common';
import axios from 'axios';
import { AdditionalProperties, User } from './User.type';
import { KeycloakService } from 'src/keycloak.service';
import { KeycloakOdooService } from './odoo.service';

@Controller('keycloak-hubspot')
export class KeycloakHubspotController {
  private readonly logger = new Logger(KeycloakHubspotController.name);

  constructor(private keycloakService: KeycloakService, private readonly odooServices: KeycloakOdooService) {}

  @Post('webhook')
  async handleWebhook(@Body() body: any) {
    const { action, userId, email, clientId, firstName, lastName, source } = body;

    console.log('Webhook body:', body);
    let user: User;
    let additionalProperties: AdditionalProperties = {};
    try {
      if (action !== "NEWSLETTER") { // If newsletter is true, user will not exist in keycloak
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
        additionalProperties.clientId = clientId;
      }

      if (source) {
        additionalProperties.source = source;
      }
      console.log(user);
      if (action === 'DELETE' || action === 'DELETE_ACCOUNT') {
        this.logger.log(`Deleting user with ID: ${user.id}`);
        await this.odooServices.deleteUserFromOdoo(user.email);
      }

      if (action === 'REGISTER' || action === 'NEWSLETTER' || action === 'LOGIN') {
          this.logger.log(`Creating user with ID: ${user.id}`);
          await this.odooServices.syncUserToOdoo(user, additionalProperties);
      }
      
    } catch (error) {
      this.logger.error('Error handling webhook', error.message);
      this.logger.error(error.stack);
      throw error;
    }
    return { message: 'Webhook processed successfully.' };
  }

  @Post('pictalk-webhook')
  async handlePictalkWebhook(@Body() body: any) {
    const { action, userId, email, firstName, lastName, language, createdDate } = body;

    console.log('Webhook body:', body);
    let user: User = {};
    user.id = userId;
    user.attributes = {
      locale: [language]
    };
    user.firstName = firstName;
    user.lastName = lastName;
    user.email = email;
    user.createdTimestamp = createdDate;
    let additionalProperties: AdditionalProperties = {};
    additionalProperties.clientId = "pictalk";
    console.log(user);

    if (action === 'REGISTER'|| action === 'LOGIN') {
        this.logger.log(`Creating user with ID: ${user.id}`);
        await this.odooServices.syncUserToOdoo(user, additionalProperties);
    }
    return { message: 'Webhook processed successfully.' };
  }
}