/**
 * Upstash Redis Client
 *
 * Provides a Redis client interface using Upstash REST API.
 * This module handles connection management and basic Redis operations.
 */

/**
 * Redis client interface for Upstash
 */
export interface RedisClient {
  get(key: string): Promise<string | null>;
  set(
    key: string,
    value: string,
    options?: { nx?: boolean; px?: number }
  ): Promise<'OK' | null>;
  incr(key: string): Promise<number>;
  incrby(key: string, increment: number): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  del(key: string | string[]): Promise<number>;
  eval(script: string, keys: string[], args: string[]): Promise<any>;
  evalsha(sha: string, keys: string[], args: string[]): Promise<any>;
  ping(): Promise<boolean>;
}

/**
 * Configuration for Upstash Redis client
 */
export interface UpstashConfig {
  url: string;
  token: string;
}

/**
 * Upstash Redis client implementation using REST API
 */
export class UpstashClient implements RedisClient {
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(config: UpstashConfig) {
    this.baseUrl = config.url.replace(/\/$/, '');
    this.token = config.token;
  }

  /**
   * Execute a Redis command via Upstash REST API
   */
  private async command<T = any>(
    command: string[],
    options?: RequestInit
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: JSON.stringify(command),
      ...options,
    });

    if (!response.ok) {
      const error = await response.text().catch(() => 'Unknown error');
      throw new Error(`Redis command failed: ${error}`);
    }

    const result = await response.json();

    // Upstash returns the result directly
    return result as T;
  }

  /**
   * Get a value by key
   */
  async get(key: string): Promise<string | null> {
    const result = await this.command<string | null>(['GET', key]);
    return result;
  }

  /**
   * Set a key-value pair
   */
  async set(
    key: string,
    value: string,
    options?: { nx?: boolean; px?: number }
  ): Promise<'OK' | null> {
    const command: string[] = ['SET', key, value];

    if (options?.nx) {
      command.push('NX');
    }

    if (options?.px) {
      command.push('PX', options.px.toString());
    }

    const result = await this.command<string>(command);
    return result as 'OK' | null;
  }

  /**
   * Increment a key by 1
   */
  async incr(key: string): Promise<number> {
    const result = await this.command<number>(['INCR', key]);
    return result;
  }

  /**
   * Increment a key by a specific amount
   */
  async incrby(key: string, increment: number): Promise<number> {
    const result = await this.command<number>([
      'INCRBY',
      key,
      increment.toString(),
    ]);
    return result;
  }

  /**
   * Set expiration time for a key
   */
  async expire(key: string, seconds: number): Promise<number> {
    const result = await this.command<number>([
      'EXPIRE',
      key,
      seconds.toString(),
    ]);
    return result;
  }

  /**
   * Delete one or more keys
   */
  async del(key: string | string[]): Promise<number> {
    const keys = Array.isArray(key) ? key : [key];
    const result = await this.command<number>(['DEL', ...keys]);
    return result;
  }

  /**
   * Execute a Lua script
   */
  async eval(script: string, keys: string[], args: string[]): Promise<any> {
    const result = await this.command([
      'EVAL',
      script,
      keys.length.toString(),
      ...keys,
      ...args,
    ]);
    return result;
  }

  /**
   * Execute a Lua script by SHA
   */
  async evalsha(sha: string, keys: string[], args: string[]): Promise<any> {
    const result = await this.command([
      'EVALSHA',
      sha,
      keys.length.toString(),
      ...keys,
      ...args,
    ]);
    return result;
  }

  /**
   * Check if Redis connection is alive
   */
  async ping(): Promise<boolean> {
    try {
      const result = await this.command<string>(['PING']);
      return result === 'PONG';
    } catch {
      return false;
    }
  }
}

/**
 * Singleton Redis client instance
 */
let clientInstance: RedisClient | null = null;

/**
 * Initialize or get the Redis client singleton
 */
export function getRedisClient(): RedisClient | null {
  if (clientInstance) {
    return clientInstance;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    // Return null if not configured - allows graceful degradation
    return null;
  }

  clientInstance = new UpstashClient({ url, token });
  return clientInstance;
}

/**
 * Reset the Redis client singleton (useful for testing)
 */
export function resetRedisClient(): void {
  clientInstance = null;
}

/**
 * Check if Redis is properly configured
 */
export function isRedisConfigured(): boolean {
  return !!(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
}
