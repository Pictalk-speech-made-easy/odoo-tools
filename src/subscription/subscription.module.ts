import { Module } from "@nestjs/common";
import { SubscriptionController } from "./subscription.controller";
import { ConfigModule } from "@nestjs/config";
import { SubscriptionOdooService } from "./odoo.service";
import { KeycloakConnectModule } from "nest-keycloak-connect";
import keycloakConfig from "src/config/keycloak.config";

@Module({
    imports: [
        ConfigModule.forRoot({ load: [keycloakConfig] }),
        KeycloakConnectModule.register(keycloakConfig()),
    ],
    controllers: [SubscriptionController],
    providers: [SubscriptionOdooService],
    exports: [SubscriptionOdooService],
  })
  export class SubscriptionModule {}
  