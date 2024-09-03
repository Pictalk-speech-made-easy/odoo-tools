import { Injectable, Logger } from "@nestjs/common";
import { KeycloakHubspotService } from "src/keycloak-hubspot/keycloak-hubspot.service";
import sgMail = require('@sendgrid/mail');
import { User } from "src/keycloak-hubspot/User.type";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(KeycloakHubspotService.name);
  private sgmail;
  constructor() {
    this.sgmail = sgMail.setApiKey(process.env.SENDGRID_KEY);
  }
  
  async sendWelcomeEmail(user: User): Promise<void> {
    await this.sgmail.send({
        from: 'alex@pictalk.org', 
        to: user.username, 
        templateId: 'd-6c31975304834f739007b49d898aebfa',
      });
  }

  async sendFollowupEmail(user: User): Promise<void> {
    await this.sgmail.send({
        from: 'alex@pictalk.org', 
        to: user.username, 
        templateId: 'd-efb6b2c35a65412da13a27a0c9b1e23d',
      });
  }

  async sendTwoWeeksAbsentEmail(user: User): Promise<void> {
    await this.sgmail.send({
        from: 'alex@pictalk.org', 
        to: user.username, 
        templateId: 'd-dbe3b571c98547efbdb6b84e72beca32',
      });
  }
}