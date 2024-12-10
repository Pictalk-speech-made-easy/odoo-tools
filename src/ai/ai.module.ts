import { ConfigModule } from "@nestjs/config";
import { Module } from "@nestjs/common";
import { AiController } from "./ai.controller";
import { KeycloakConnectModule } from "nest-keycloak-connect";
import keycloakConfig from "src/config/keycloak.config";
import { SubscriptionModule } from "src/subscription/subscription.module";

@Module({
    imports: [
      ConfigModule.forRoot(), 
      KeycloakConnectModule.register(keycloakConfig()),
      SubscriptionModule,
    ],
    controllers: [AiController],
    providers: [],
    exports: [ ],
  })
  export class AiModule {}
  