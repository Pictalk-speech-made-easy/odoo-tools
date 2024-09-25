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
      
      const locale = mapLocale(user.attributes?.locale?.[0] || 'fr');
      const marketingOptIn =
        user.attributes?.marketingOptIn?.[0] === 'on' ? true : false;
      const analyticsConsent =
        user.attributes?.analyticsConsent?.[0] === 'on' ? true : false;
      const userType = user.attributes?.userType?.[0] || null;
      const sourceMedium = user.attributes?.sourceMedium?.[0] || null;

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
                'x_studio_dernire_connexion_pictalk',
                'x_studio_nombre_de_connexions_pictalk',
                'x_studio_frquence_de_connexion_pictalk'
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
        ...(sourceMedium ? { x_studio_source: sourceMedium } : {}),
        x_studio_marketing: marketingOptIn,
        ...(userType ? { x_studio_type_dutilisateur: userType } : {}),
        ...(locale ? { lang: locale } : {}),
      };

      const clientId = additionalProperties?.clientId;
      if (clientId) {
        const lastLoginFieldMap = {
          pictime: 'x_studio_dernire_connexion_agenda',
          maker: 'x_studio_lastlogin_creator',
          pictalk: 'x_studio_dernire_connexion_pictalk',
          pictranslate: 'x_studio_lastlogin_pictranslate',
        };

        const creationDateFieldMap = {
          pictime: 'x_studio_cration_du_compte_keycloak',
          pictalk: 'x_studio_cration_du_compte_pictalk'
        }

        const nombreConnexionsFieldMap = {
          pictime: 'x_studio_nombre_de_connexions_agenda',
          pictalk: 'x_studio_nombre_de_connexions_pictalk'
        };

        const frequenceConnexionsFieldMap = {
          pictime: 'x_studio_frquence_de_connexion_agenda',
          pictalk: 'x_studio_frquence_de_connexion_pictalk'
        };

        const lastLoginField = lastLoginFieldMap[clientId];
        if (lastLoginField) {
          contactObj[lastLoginField] = formattedDate;
        }

        let formattedCreatedDate;
        if (clientId === "pictime") formattedCreatedDate = format(new Date(user.createdTimestamp * 1000), 'yyyy-MM-dd HH:mm:ss');
        if (clientId === "pictalk") formattedCreatedDate = format(user.createdTimestamp, 'yyyy-MM-dd HH:mm:ss');
        const createdDateField = creationDateFieldMap[clientId];
        if (createdDateField && formattedCreatedDate){  
          contactObj[createdDateField] = formattedCreatedDate;
        }

        if (clientId === 'pictime' || clientId === 'pictalk') {
          let nombreDeConnexions =
            existingContacts[0]?.[nombreConnexionsFieldMap[clientId]] || 0;
          let derniereConnexion =
            existingContacts[0]?.[lastLoginFieldMap[clientId]];
          let frequenceDeConnexion =
            existingContacts[0]?.[frequenceConnexionsFieldMap[clientId]] || 0;
          nombreDeConnexions += 1;

          if (derniereConnexion) {
            const lastLoginDate = parseISO(derniereConnexion);
            const daysSinceLastLogin = differenceInDays(
              new Date(),
              lastLoginDate,
            );
            if (daysSinceLastLogin > 0) {
              frequenceDeConnexion = nombreDeConnexions / daysSinceLastLogin;
            }
          } else {
            frequenceDeConnexion = 1;
          }

          contactObj = {
            ...contactObj,
            [nombreConnexionsFieldMap[clientId]]: nombreDeConnexions,
            [frequenceConnexionsFieldMap[clientId]]: frequenceDeConnexion,
          };
        }
      }

      if (existingContacts.length > 0) {
        const contactId = existingContacts[0].id;

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
        if (clientId === 'pictime') {
          contactObj = {
            ...contactObj,
            x_studio_nombre_de_connexions_agenda: 1,
            x_studio_frquence_de_connexion_agenda: 1,
            x_studio_dernire_connexion_agenda: formattedDate,
          };
        }

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

function mapLocale(locale: string): string {
  const localeMap: { [key: string]: string } = {
    'en': 'en_US',
    'fr': 'fr_FR',
    'de': 'de_DE',
    'es': 'es_ES',
    'it': 'it_IT',
    'pt': 'pt_PT',
  };

  if (locale === 'en_US' || locale === 'fr_FR' || locale === 'de_DE' || locale === 'es_ES' || locale === 'it_IT' || locale === 'pt_PT') {
    return locale;
  }

  return localeMap[locale] || 'en_US'; // Default to 'en_US' if not found
}