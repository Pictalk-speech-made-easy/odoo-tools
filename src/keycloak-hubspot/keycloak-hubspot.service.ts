import { Injectable, Logger } from '@nestjs/common';
import * as hubspot from '@hubspot/api-client'
import axios from 'axios';
import { FilterOperatorEnum, SimplePublicObjectInputForCreate } from '@hubspot/api-client/lib/codegen/crm/contacts';
import { User } from './User.type';

@Injectable()
export class KeycloakHubspotService {
  private readonly logger = new Logger(KeycloakHubspotService.name);
  private hubspotClient: hubspot.Client;

  constructor() {
    this.hubspotClient = new hubspot.Client({
      accessToken: process.env.HUBSPOT_ACCESS_TOKEN,
    });
  }

  async deleteUserFromHubSpot(email: string): Promise<void> {
    try {
      console.log('[KeycloakHubspotService] deleteUserFromHubSpot', email);
      const response = await this.hubspotClient.crm.contacts.searchApi.doSearch({
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'email',
                operator: FilterOperatorEnum.Eq,
                value: email,
              },
            ],
          },
        ],
        properties: ['email'],
        limit: 1,
        after: "0",
        sorts: ["-createdate"],
      });
      console.log('[KeycloakHubspotService] response', response);
      const contact = response.results[0];
      if (contact.id) {
        await this.hubspotClient.crm.contacts.basicApi.archive(contact.id);
        this.logger.log(`Deleted user from HubSpot: ${email}`);
      } else {
        this.logger.log(`No user found in HubSpot with email: ${email}`);
      }
    } catch (error) {
      this.logger.error('Error deleting user from HubSpot', error.message);
      throw error;
    }
  }

  async syncUserToHubSpot(user: User): Promise<void> {
    try {
      const contactObj: SimplePublicObjectInputForCreate = {
        properties: {
          email: user.email,
          firstname: user.firstName,
          lastname: user.lastName,
          //lastlogin: new Date().toISOString(),
        },
        associations: [],
      };

      const response = await this.hubspotClient.crm.contacts.searchApi.doSearch({
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'email',
                operator: FilterOperatorEnum.Eq,
                value: user.email,
              },
            ],
          },
        ],
        properties: ['email'],
        limit: 1,
        after: "0",
        sorts: ["-createdate"],
      });
      const existingContact = response.results[0];
      if (existingContact && existingContact.id) {
        await this.hubspotClient.crm.contacts.basicApi.update(existingContact.id, contactObj);
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

  async handleUserDeletion(user: User): Promise<void> {
    try {
      console.log('[KeycloakHubspotService] handleUserDeletion', user);
      if (user.email) {
        await this.deleteUserFromHubSpot(user.email);
      }
    } catch (error) {
      this.logger.error('Error handling user deletion', error.message);
      throw error;
    }
  }

  async handleUserCreation(user: User): Promise<void> {
    try {
      console.log('[KeycloakHubspotService] handleUserCreation', user);
      if (user.email) {
        await this.syncUserToHubSpot(user);
      }
    } catch (error) {
      this.logger.error('Error handling user creation', error.message);
      throw error;
    }
  }

  

  async submitFormToHubSpot(portalId: string, formId: string, user: User): Promise<void> {
    try {
      console.log('[KeycloakHubspotService] submitFormToHubSpot', portalId, formId, user);
      const url = `https://api.hsforms.com/submissions/v3/integration/secure/submit/${portalId}/${formId}`;
      
      const payload = {
        submittedAt: Date.now(),
        fields: [
          { objectTypeId: "0-1", name: "email", value: user.email },
          { objectTypeId: "0-1", name: "firstname", value: user.firstName },
          { objectTypeId: "0-1", name: "lastname", value: user.lastName }
        ],
        context: {
          pageName: "automated-form-submission"
        },
        legalConsentOptions: {
          consent: {
            consentToProcess: true,
            text: "I agree to allow Pictalk Speech Made Easy to store and process my personal data.",
            communications: [
              {
                value: true,
                subscriptionTypeId: 999,
                text: "I agree to receive marketing communications from Example Company."
              }
            ]
          }
        }
      };

      await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`
        }
      });

      this.logger.log(`Submitted form to HubSpot: ${formId}`);
    } catch (error) {
      this.logger.error('Error submitting form to HubSpot', error.message);
      throw error;
    }
  }
}