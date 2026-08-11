export interface RedisOptions {
  host: string;
  port: number;
  username?: string;
  password?: string;
  db?: number;
  tls?: boolean;
}
