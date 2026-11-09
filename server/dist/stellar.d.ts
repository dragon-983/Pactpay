import { Horizon, rpc } from '@stellar/stellar-sdk';
export declare function getHorizonServer(): Horizon.Server;
export declare function getSorobanServer(): rpc.Server;
export declare function setMockServers(horizon: Horizon.Server | null, soroban: rpc.Server | null): void;
export declare function isValidStellarAddress(address: string): boolean;
export declare function isValidTxHash(hash: string): boolean;
/**
 * Generates an authentication challenge nonce for wallet sign-in
 */
export declare function generateChallengeNonce(walletAddress: string): string;
/**
 * Verifies that the provided Ed25519 signature was signed by walletAddress for the challenge message.
 */
export declare function verifyWalletSignature(walletAddress: string, message: string, signatureBase64: string): boolean;
export interface VerifiedTxResult {
    successful: boolean;
    ledger: number;
    txHash: string;
    contractId?: string;
    eventType?: string;
    eventData?: any;
    error?: string;
}
/**
 * Independently fetches and verifies a transaction on Stellar Soroban RPC or Horizon.
 */
export declare function verifyOnChainTransaction(txHash: string): Promise<VerifiedTxResult>;
