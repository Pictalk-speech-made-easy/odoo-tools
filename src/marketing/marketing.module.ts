import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { KeycloakService } from "./keycloak.service";
import { MarketingController } from "./marketing.controller";
import { KeycloakOdooService } from "./odoo.service";
import { Module } from "@nestjs/common";
import { SubscriptionModule } from "src/subscription/subscription.module";
import { CacheModule } from "@nestjs/cache-manager";
import { KeycloakConnectModule } from "nest-keycloak-connect";
import keycloakConfig from "src/config/keycloak.config";

@Module({
  imports: [CacheModule.register(), ConfigModule.forRoot(), ScheduleModule.forRoot(), SubscriptionModule, KeycloakConnectModule.register(keycloakConfig()),],
  controllers: [MarketingController],
  providers: [KeycloakService, KeycloakOdooService],
  exports: [ KeycloakService],
})
export class MarketingModule {}
