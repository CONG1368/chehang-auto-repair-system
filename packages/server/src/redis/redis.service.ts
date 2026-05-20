import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService extends Redis implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });
  }

  async onModuleInit() {
    console.log('✅ Redis 连接成功');
  }

  async onModuleDestroy() {
    await this.quit();
  }

  async setJson(key: string, value: any, seconds?: number): Promise<void> {
    const data = JSON.stringify(value);
    if (seconds) {
      await this.setex(key, seconds, data);
    } else {
      await this.set(key, data);
    }
  }

  async getJson<T = any>(key: string): Promise<T | null> {
    const data = await this.get(key);
    return data ? JSON.parse(data) : null;
  }
}
