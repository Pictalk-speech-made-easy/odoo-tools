import { Injectable, Logger } from '@nestjs/common';
import { Client } from "@hubspot/api-client";
import axios from 'axios';

@Injectable()
export class KeycloakHubspotService {
  private readonly logger = new Logger(KeycloakHubspotService.name);
  private hubspotClient: any;

  constructor() {
    this.hubspotClient = new Client({
      accessToken: process.env.HUBSPOT_ACCESS_TOKEN,
    });
  }

  async getKeycloakToken(): Promise<string> {
    try {
      const response = await axios.post(
        `${process.env.KEYCLOAK_BASE_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token`,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: process.env.KEYCLOAK_CLIENT_ID,
          client_secret: process.env.KEYCLOAK_CLIENT_SECRET,
        }),
      );
      return response.data.access_token;
    } catch (error) {
      this.logger.error('Error fetching Keycloak token', error.message);
      throw error;
    }
  }

  async getKeycloakUsers(token: string): Promise<any[]> {
    try {
      const response = await axios.get(
        `${process.env.KEYCLOAK_BASE_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      return response.data;
    } catch (error) {
      this.logger.error('Error fetching users from Keycloak', error.message);
      throw error;
    }
  }

  async deleteUserFromHubSpot(email: string): Promise<void> {
    try {
      const contact = await this.hubspotClient.crm.contacts.basicApi.getByEmail(email);

      if (contact.body.id) {
        await this.hubspotClient.crm.contacts.basicApi.archive(contact.body.id);
        this.logger.log(`Deleted user from HubSpot: ${email}`);
      } else {
        this.logger.log(`No user found in HubSpot with email: ${email}`);
      }
    } catch (error) {
      this.logger.error('Error deleting user from HubSpot', error.message);
      throw error;
    }
  }

  async syncUserToHubSpot(user: any): Promise<void> {
    try {
      const contactObj = {
        properties: {
          email: user.email,
          firstname: user.firstName,
          lastname: user.lastName,
        },
      };

      const existingContact = await this.hubspotClient.crm.contacts.basicApi.getByEmail(user.email);

      if (existingContact.body.id) {
        await this.hubspotClient.crm.contacts.basicApi.update(existingContact.body.id, contactObj);
        this.logger.log(`Updated contact in HubSpot: ${user.email}`);
      } else {
        await this.hubspotClient.crm.contacts.basicApi.create(contactObj);
        this.logger.log(`Created new contact in HubSpot: ${user.email}`);
      }
    } catch (error) {
      this.logger.error('Error syncing user to HubSpot', error.message);
      throw error;
    }
  }

  async handleUserDeletion(userId: string): Promise<void> {
    try {
      const token = await this.getKeycloakToken();

      const response = await axios.get(
        `${process.env.KEYCLOAK_BASE_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const userEmail = response.data.email;

      if (userEmail) {
        await this.deleteUserFromHubSpot(userEmail);
      }
    } catch (error) {
      this.logger.error('Error handling user deletion', error.message);
      throw error;
    }
  }

  async handleUserCreation(userId: string): Promise<void> {
    try {
      const token = await this.getKeycloakToken();

      const response = await axios.get(
        `${process.env.KEYCLOAK_BASE_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const user = response.data;

      if (user.email) {
        await this.syncUserToHubSpot(user);
      }
    } catch (error) {
      this.logger.error('Error handling user creation', error.message);
      throw error;
    }
  }

  async syncUsers(): Promise<void> {
    try {
      const token = await this.getKeycloakToken();
      const users = await this.getKeycloakUsers(token);

      for (const user of users) {
        await this.syncUserToHubSpot(user);
      }
    } catch (error) {
      this.logger.error('Error syncing users', error.message);
    }
  }
}