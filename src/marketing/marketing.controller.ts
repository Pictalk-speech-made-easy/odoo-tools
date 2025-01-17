import { Controller, Post, Body, Logger, UsePipes, ValidationPipe, Get, BadRequestException, UseGuards } from '@nestjs/common';
import axios from 'axios';
import { AdditionalProperties, User } from './User.type';
import { KeycloakService } from 'src/marketing/keycloak.service';
import { KeycloakOdooService } from './odoo.service';
import { CreateLeadDto } from './contact-lead.dto';
import { AuthenticatedUser, AuthGuard } from 'nest-keycloak-connect';
import { UserDto } from 'src/subscription/user.dto';

@Controller('marketing')
export class MarketingController {
  private readonly logger = new Logger(MarketingController.name);

  constructor(private keycloakService: KeycloakService, private readonly odooServices: KeycloakOdooService) {}

  @Get('activity')
  @UseGuards(AuthGuard)
  async getActivity(
    @AuthenticatedUser() user: UserDto
  ) {
    const email = user.email;
    const clientId = user.azp;
    if (!email || !clientId) {
      throw new BadRequestException();
    }
    if (clientId !== "pictime" && clientId !== "pictalk") {
      throw new BadRequestException();
    }
    const odooUser = await this.odooServices.getUserFromOdoo(email);
    if (clientId == "pictime") {
      return {
        lastActivity: odooUser.x_studio_dernire_connexion_agenda,
        connectionNumber: odooUser.x_studio_nombre_de_connexions_agenda,
        createdDate: odooUser.create_date,
      }
    } else if (clientId == "pictalk") {
      return {
        lastActivity: odooUser.x_studio_dernire_connexion_pictalk,
        connectionNumber: odooUser.x_studio_nombre_de_connexions_pictalk,
        createdDate: odooUser.create_date,
      }
    }
    throw new BadRequestException();
  }

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
          console.log(`${process.env.KEYCLOAK_BASE_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users/${userId}`)
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

    if (action === 'REGISTER'|| action === 'LOGIN') {
        this.logger.log(`Creating user with ID: ${user.id}`);
        await this.odooServices.syncUserToOdoo(user, additionalProperties);
    }
    return { message: 'Webhook processed successfully.' };
  }

  @Post('create-lead')
  @UsePipes(new ValidationPipe({ transform: true }))
  async handleBusinessWebhook(@Body() createLeadDto: CreateLeadDto) {
    console.log('Webhook body:', createLeadDto);
    await this.odooServices.createLead(createLeadDto);
    return { message: 'Webhook processed successfully.' };
  }
}