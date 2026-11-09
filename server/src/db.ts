import pg from 'pg';
import { config } from './config.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;

export function createPool(url?: string) {
  const dbUrl = url || (process.env.NODE_ENV === 'test' ? config.testDatabaseUrl : config.databaseUrl);
  const isSsl = config.databaseSsl;
  return new Pool({
    connectionString: dbUrl,
    ssl: isSsl ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
  });
}

export const defaultPool = createPool();

/**
 * Execute query with optional wallet context for PostgreSQL Row Level Security (RLS)
 */
export async function query(
  text: string,
  params: any[] = [],
  walletAddress?: string | null,
  pool: pg.Pool = defaultPool
) {
  const client = await pool.connect();
  try {
    if (walletAddress) {
      await client.query(`SELECT set_config('app.current_wallet', $1, true)`, [walletAddress]);
    } else {
      await client.query(`SELECT set_config('app.current_wallet', '', true)`);
    }
    const res = await client.query(text, params);
    return res;
  } finally {
    client.release();
  }
}

/**
 * Transaction helper with wallet context
 */
export async function withTransaction<T>(
  callback: (client: pg.PoolClient) => Promise<T>,
  walletAddress?: string | null,
  pool: pg.Pool = defaultPool
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (walletAddress) {
      await client.query(`SELECT set_config('app.current_wallet', $1, true)`, [walletAddress]);
    } else {
      await client.query(`SELECT set_config('app.current_wallet', '', true)`);
    }
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Run migrations from database/migrations
 */
export async function runMigrations(pool: pg.Pool = defaultPool) {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Determine migrations folder path
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    let migrationsDir = path.resolve(__dirname, '../../database/migrations');
    if (!fs.existsSync(migrationsDir)) {
      migrationsDir = path.resolve(process.cwd(), 'database/migrations');
    }

    if (!fs.existsSync(migrationsDir)) {
      console.log(`[migrate] Migrations folder not found at ${migrationsDir}, skipping.`);
      return;
    }

    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

    for (const file of files) {
      const already = await client.query('SELECT 1 FROM _migrations WHERE name = $1', [file]);
      if (already.rowCount === 0) {
        console.log(`[migrate] Applying ${file}...`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`[migrate] ${file} applied successfully.`);
      }
    }
  } catch (err) {
    console.error('[migrate] Migration error:', err);
    throw err;
  } finally {
    client.release();
  }
}
