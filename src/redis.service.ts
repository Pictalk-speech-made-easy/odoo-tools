// src/redis.service.ts
import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService {
  constructor(@Inject('REDIS_CLIENT') private readonly redisClient: Redis) {}

  async setLastLogin(userId: string, timestamp: number): Promise<void> {
    await this.redisClient.set(`user:lastLogin:${userId}`, timestamp.toString());
  }

  async getLastLogin(userId: string): Promise<number | null> {
    const timestamp = await this.redisClient.get(`user:lastLogin:${userId}`);
    return timestamp ? parseInt(timestamp, 10) : null;
  }
}