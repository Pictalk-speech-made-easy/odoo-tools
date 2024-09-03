// src/redis/redis.module.ts
import { Module, Global } from '@nestjs/common';
import Redis from 'ioredis';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: () => {
        return new Redis({
          host: process.env.REDIS_HOST,
          port: parseInt(process.env.REDIS_PORT, 10),
          password: process.env.REDIS_PASSWORD,
        });
      },
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule {}