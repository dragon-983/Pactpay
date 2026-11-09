import { Request, Response, NextFunction } from 'express';
export interface AuthRequest extends Request {
    walletAddress?: string;
}
/**
 * Creates or gets an active challenge nonce for a wallet
 */
export declare function createAuthChallenge(walletAddress: string): Promise<string>;
/**
 * Verifies signed challenge nonce and issues a bearer session token
 */
export declare function verifyAuthSignature(walletAddress: string, nonce: string, signature: string): Promise<{
    token: string;
    walletAddress: string;
    expiresAt: Date;
}>;
/**
 * Express middleware to authenticate session token and establish RLS context
 */
export declare function requireAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
/**
 * Optional auth middleware: sets walletAddress if token provided, but doesn't block unauthenticated requests
 */
export declare function optionalAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
