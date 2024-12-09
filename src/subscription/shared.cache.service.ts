import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class SharedCacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async get(key: string) {
    return this.cacheManager.get(key);
  }

  async set(key: string, value: any, ttl = 86400000) { // 1 day default TTL
    return this.cacheManager.set(key, value, ttl);
  }
}