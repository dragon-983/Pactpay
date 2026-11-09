import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { query } from './db.js';
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profiles.js';
import projectRoutes from './routes/projects.js';
import milestoneRoutes from './routes/milestones.js';
import disputeRoutes from './routes/disputes.js';
import transactionRoutes from './routes/transactions.js';
import notificationRoutes from './routes/notifications.js';
export function createApp(options = { rateLimits: true }) {
    const app = express();
    // Middleware
    app.use(cors({
        origin: true,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    }));
    app.use(express.json({ limit: '100kb' }));
    if (options.rateLimits) {
        const limiter = rateLimit({
            windowMs: 15 * 60 * 1000,
            max: 300,
            standardHeaders: true,
            legacyHeaders: false,
        });
        app.use('/api', limiter);
    }
    // Health check
    app.get('/api/health', async (req, res) => {
        try {
            const dbRes = await query('SELECT 1');
            res.json({
                ok: true,
                status: 'healthy',
                database: dbRes.rowCount > 0 ? 'connected' : 'disconnected',
                network: 'testnet',
                timestamp: new Date().toISOString(),
            });
        }
        catch (err) {
            res.status(503).json({
                ok: false,
                status: 'degraded',
                database: 'error',
                error: err.message,
            });
        }
    });
    // API Routes
    app.use('/api/auth', authRoutes);
    app.use('/api/profiles', profileRoutes);
    app.use('/api/projects', projectRoutes);
    app.use('/api/milestones', milestoneRoutes);
    app.use('/api', disputeRoutes);
    app.use('/api/transactions', transactionRoutes);
    app.use('/api/notifications', notificationRoutes);
    // Global error handler
    app.use((err, req, res, next) => {
        console.error('Unhandled server error:', err);
        res.status(err.status || 500).json({
            error: {
                code: err.code || 'internal_error',
                message: err.message || 'An unexpected error occurred',
            },
        });
    });
    return app;
}
