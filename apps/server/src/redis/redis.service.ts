import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private client: Redis;

  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: Number(process.env.REDIS_PORT || 6379),
      password: process.env.REDIS_PASS,
      db: Number(process.env.REDIS_DB || 0),
    });
  }

  getClient() {
    return this.client;
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}
