import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { KeycloakHubspotController } from './keycloak-hubspot/keycloak-hubspot.controller';
import { User } from './keycloak-hubspot/User.type';
import { EmailService } from './email.service';
import { KeycloakService } from './keycloak.service';
import { RedisService } from './redis.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(private readonly keycloakService: KeycloakService, private emailService: EmailService, private redisService: RedisService) {
    this.scheduleCronJob();
  }

    @Cron('24 11 * * *')
  private async scheduleCronJob() {
    // Schedule the cron job to run every day at midnight
      this.logger.log('Running cron job to check Keycloak users');
      await this.checkKeycloakUsers();
  }

  private async checkKeycloakUsers() {
    try {
      const users: User[] = await this.keycloakService.getKeycloakUsers();

      for (const user of users) {
        // Implement your logic to check user data here
        this.logger.log(`Checking data for user: ${user.username}`);
        // Example check: log if the email is not verified
        if (!user.emailVerified) {
            continue;
        }

        // Check if the user has created the account 3 days ago
        const accountCreatedDate = new Date(user.createdTimestamp);
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        if (accountCreatedDate < threeDaysAgo) {
            this.emailService.sendFollowupEmail(user);
        }

        // Check if the user has been absent for 2 weeks
        const lastLoginTimestamp = await this.redisService.getLastLogin(user.id);
        if (lastLoginTimestamp) {
            const lastLoginDate = new Date(lastLoginTimestamp); // Convert timestamp to Date
            const twoWeeksAgo = new Date();
            twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        
            if (lastLoginDate < twoWeeksAgo) {
              this.emailService.sendTwoWeeksAbsentEmail(user);
            }
          }
      }
    } catch (error) {
      this.logger.error('Error checking Keycloak users', error.message);
    }
  }
}