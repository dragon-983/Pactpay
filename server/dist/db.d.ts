import pg from 'pg';
export declare function createPool(url?: string): import("pg").Pool;
export declare const defaultPool: import("pg").Pool;
/**
 * Execute query with optional wallet context for PostgreSQL Row Level Security (RLS)
 */
export declare function query(text: string, params?: any[], walletAddress?: string | null, pool?: pg.Pool): Promise<import("pg").QueryResult<any>>;
/**
 * Transaction helper with wallet context
 */
export declare function withTransaction<T>(callback: (client: pg.PoolClient) => Promise<T>, walletAddress?: string | null, pool?: pg.Pool): Promise<T>;
/**
 * Run migrations from database/migrations
 */
export declare function runMigrations(pool?: pg.Pool): Promise<void>;
