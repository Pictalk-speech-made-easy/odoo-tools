import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { User, AdditionalProperties } from './User.type';
import { format, differenceInDays, parseISO } from 'date-fns';

@Injectable()
export class KeycloakOdooService {
  private readonly logger = new Logger(KeycloakOdooService.name);
  private readonly odooUrl = process.env.ODOO_URL;
  private readonly odooDb = process.env.ODOO_DB;
  private readonly odooUsername = process.env.ODOO_USER;
  private readonly odooPassword = process.env.ODOO_API;

  /**
   * Authenticate with Odoo and get the user ID (uid)
   */
  private async authenticate(): Promise<number> {
    try {
      const response = await axios.post(`${this.odooUrl}/jsonrpc`, {
        jsonrpc: '2.0',
        method: 'call',
        params: {
          service: 'common',
          method: 'authenticate',
          args: [this.odooDb, this.odooUsername, this.odooPassword, {}],
        },
        id: new Date().getTime(),
      });
      const uid = response.data.result;
      if (!uid) {
        throw new Error('Failed to authenticate with Odoo');
      }
      return uid;
    } catch (error) {
      this.logger.error('Authentication failed', error.message);
      throw error;
    }
  }

  /**
   * Delete a user from Odoo based on their email
   */
  async deleteUserFromOdoo(email: string): Promise<void> {
    try {
      this.logger.log(`Deleting user from Odoo: ${email}`);
      const uid = await this.authenticate();

      // Search for the contact by email
      const searchResponse = await axios.post(`${this.odooUrl}/jsonrpc`, {
        jsonrpc: '2.0',
        method: 'call',
        params: {
          service: 'object',
          method: 'execute_kw',
          args: [
            this.odooDb,
            uid,
            this.odooPassword,
            'res.partner',
            'search',
            [[['email', '=', email]]],
          ],
        },
        id: new Date().getTime(),
      });

      const contactIds = searchResponse.data.result;
      if (contactIds && contactIds.length > 0) {
        // Delete the contact
        await axios.post(`${this.odooUrl}/jsonrpc`, {
          jsonrpc: '2.0',
          method: 'call',
          params: {
            service: 'object',
            method: 'execute_kw',
            args: [
              this.odooDb,
              uid,
              this.odooPassword,
              'res.partner',
              'unlink',
              [contactIds],
            ],
          },
          id: new Date().getTime(),
        });
        this.logger.log(`Deleted user from Odoo: ${email}`);
      } else {
        this.logger.log(`No user found in Odoo with email: ${email}`);
      }
    } catch (error) {
      this.logger.error('Error deleting user from Odoo', error.message);
      throw error;
    }
  }

  /**
   * Synchronize a user to Odoo (create or update contact)
   */
  async syncUserToOdoo(
    user: User,
    additionalProperties?: AdditionalProperties,
  ): Promise<void> {
    try {
      const uid = await this.authenticate();
      const formattedDate = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
      const formattedCreatedTimestamp = format(new Date(user.createdTimestamp), 'yyyy-MM-dd HH:mm:ss');
      // Search for existing contact and fetch specific fields
      const searchResponse = await axios.post(`${this.odooUrl}/jsonrpc`, {
        jsonrpc: '2.0',
        method: 'call',
        params: {
          service: 'object',
          method: 'execute_kw',
          args: [
            this.odooDb,
            uid,
            this.odooPassword,
            'res.partner',
            'search_read',
            [[['email', '=', user.email]]],
            {
              fields: [
                'id',
                'x_studio_nombre_de_connexions_agenda',
                'x_studio_dernire_connexion_agenda',
                'x_studio_frquence_de_connexion_agenda',
              ],
            },
          ],
        },
        id: new Date().getTime(),
      });

      const existingContacts = searchResponse.data.result;
      let contactObj: any = {
        name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
        email: user.email,
        x_studio_cration_du_compte_keycloak: formattedCreatedTimestamp,
        ...(user.attributes?.sourceMedium
          ? { x_studio_source: user.attributes.sourceMedium }
          : {}),
        ...(user.attributes?.marketingOptIn !== undefined
          ? { x_studio_marketing: user.attributes.marketingOptIn }
          : {}),
        ...(user.attributes?.userType
          ? { x_studio_type_dutilisateur: user.attributes?.userType }
          : {}),
        ...(user.attributes?.locale ? { lang: user.attributes.locale } : {}),
      };

      if (existingContacts.length > 0) {
        const contact = existingContacts[0];
        const contactId = contact.id;

        // Initialize variables
        let nombreDeConnexions = contact.x_studio_nombre_de_connexions_agenda || 0;
        let derniereConnexion = contact.x_studio_dernire_connexion_agenda;
        let frequenceDeConnexion = contact.x_studio_frquence_de_connexion_agenda || 0;

        // Update the number of connections
        nombreDeConnexions += 1;

        // Calculate the frequency of connections
        if (derniereConnexion) {
          const lastLoginDate = parseISO(derniereConnexion);
          const daysSinceLastLogin = differenceInDays(new Date(), lastLoginDate);
          if (daysSinceLastLogin > 0) {
            frequenceDeConnexion = nombreDeConnexions / daysSinceLastLogin;
          }
        } else {
          // First login, set frequency to 1
          frequenceDeConnexion = 1;
        }

        // Update contact object with computed values
        contactObj = {
          ...contactObj,
          x_studio_nombre_de_connexions_agenda: nombreDeConnexions,
          x_studio_frquence_de_connexion_agenda: frequenceDeConnexion,
          x_studio_dernire_connexion_agenda: formattedDate,
        };

        // Update the existing contact
        await axios.post(`${this.odooUrl}/jsonrpc`, {
          jsonrpc: '2.0',
          method: 'call',
          params: {
            service: 'object',
            method: 'execute_kw',
            args: [
              this.odooDb,
              uid,
              this.odooPassword,
              'res.partner',
              'write',
              [[contactId], contactObj],
            ],
          },
          id: new Date().getTime(),
        });
        this.logger.log(`Updated contact in Odoo: ${user.email}`);
      } else {
        // For new contacts, initialize the number of connections and frequency
        contactObj = {
          ...contactObj,
          x_studio_nombre_de_connexions_agenda: 1,
          x_studio_frquence_de_connexion_agenda: 1,
          x_studio_dernire_connexion_agenda: formattedDate,
        };

        // Create a new contact
        const createResponse = await axios.post(`${this.odooUrl}/jsonrpc`, {
          jsonrpc: '2.0',
          method: 'call',
          params: {
            service: 'object',
            method: 'execute_kw',
            args: [
              this.odooDb,
              uid,
              this.odooPassword,
              'res.partner',
              'create',
              [contactObj],
            ],
          },
          id: new Date().getTime(),
        });
        console.log(createResponse.data);
        const newContactId = createResponse.data.result;
        this.logger.log(
          `Created new contact in Odoo: ${user.email} with ID ${newContactId}`,
        );
      }
    } catch (error) {
      this.logger.error('Error syncing user to Odoo', error.message);
      throw error;
    }
  }
}