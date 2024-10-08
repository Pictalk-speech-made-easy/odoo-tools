import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";
import { User } from "./User.type";

@Injectable()
export class KeycloakService {
  private readonly logger = new Logger(KeycloakService.name);
  private keycloakToken: string | null = null;
  private tokenExpiration: number | null = null;
  constructor() {}

  private async fetchKeycloakToken(): Promise<string> {
    try {
      console.log('fetching keycloak token');
      const response = await axios.post(
        `${process.env.KEYCLOAK_BASE_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token`,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: process.env.KEYCLOAK_CLIENT_ID,
          client_secret: process.env.KEYCLOAK_CLIENT_SECRET,
        }),
      );
      this.keycloakToken = response.data.access_token;
      this.tokenExpiration = Date.now() + response.data.expires_in * 1000;
      return this.keycloakToken;
    } catch (error) {
      this.logger.error('Error fetching Keycloak token', error.message);
      throw error;
    }
  }

  async getKeycloakToken(): Promise<string> {
    if (this.keycloakToken && this.tokenExpiration && Date.now() < this.tokenExpiration) {
      return this.keycloakToken;
    }
    return this.fetchKeycloakToken();
  }

  async getKeycloakUsers(): Promise<User[]> {
    try {
      const token = await this.getKeycloakToken();
      const response = await axios.get(
        `${process.env.KEYCLOAK_BASE_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const users: User[] = response.data;
      return users;
    } catch (error) {
      this.logger.error('Error fetching users from Keycloak', error.message);
      throw error;
    }
  }

}