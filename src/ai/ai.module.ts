import { ConfigModule } from "@nestjs/config";
import { Module } from "@nestjs/common";
import { AiController } from "./ai.controller";
import { KeycloakConnectModule } from "nest-keycloak-connect";
import keycloakConfig from "src/config/keycloak.config";
import { SubscriptionModule } from "src/subscription/subscription.module";
import { ThrottlerModule } from "@nestjs/throttler";

@Module({
    imports: [
      ConfigModule.forRoot(), 
      KeycloakConnectModule.register(keycloakConfig()),
      SubscriptionModule,
      ThrottlerModule.forRoot([{
        ttl: 60000,
        limit: 10,
      }]),
    ],
    controllers: [AiController],
    providers: [],
    exports: [ ],
  })
  export class AiModule {}
  