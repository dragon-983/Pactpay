import { createApp } from './app.js';
import { config } from './config.js';
import { runMigrations } from './db.js';
async function startServer() {
    try {
        console.log('[server] Checking and running database migrations...');
        await runMigrations();
        console.log('[server] Migrations up to date.');
        const app = createApp({ rateLimits: true });
        app.listen(config.port, () => {
            console.log(`[server] PactPay API server running on http://localhost:${config.port}`);
            console.log(`[server] Stellar Network: ${config.stellarNetwork}`);
        });
    }
    catch (err) {
        console.error('[server] Fatal startup error:', err);
        process.exit(1);
    }
}
startServer();
