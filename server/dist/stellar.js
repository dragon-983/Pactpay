import { Keypair, StrKey, Horizon, rpc } from '@stellar/stellar-sdk';
import { config } from './config.js';
import crypto from 'crypto';
let customHorizonServer = null;
let customSorobanServer = null;
export function getHorizonServer() {
    return customHorizonServer || new Horizon.Server(config.horizonUrl);
}
export function getSorobanServer() {
    return customSorobanServer || new rpc.Server(config.sorobanRpcUrl);
}
export function setMockServers(horizon, soroban) {
    customHorizonServer = horizon;
    customSorobanServer = soroban;
}
export function isValidStellarAddress(address) {
    if (typeof address !== 'string')
        return false;
    return StrKey.isValidEd25519PublicKey(address);
}
export function isValidTxHash(hash) {
    return typeof hash === 'string' && /^[0-9a-fA-F]{64}$/.test(hash.trim());
}
/**
 * Generates an authentication challenge nonce for wallet sign-in
 */
export function generateChallengeNonce(walletAddress) {
    const randomBytes = crypto.randomBytes(32).toString('hex');
    const timestamp = Date.now();
    return `PactPay-Auth:${walletAddress}:${timestamp}:${randomBytes}`;
}
/**
 * Verifies that the provided Ed25519 signature was signed by walletAddress for the challenge message.
 */
export function verifyWalletSignature(walletAddress, message, signatureBase64) {
    if (!isValidStellarAddress(walletAddress))
        return false;
    try {
        const keypair = Keypair.fromPublicKey(walletAddress);
        const messageBuffer = Buffer.from(message, 'utf-8');
        const signatureBuffer = Buffer.from(signatureBase64, 'base64');
        return keypair.verify(messageBuffer, signatureBuffer);
    }
    catch (err) {
        console.error('Signature verification error:', err);
        return false;
    }
}
/**
 * Independently fetches and verifies a transaction on Stellar Soroban RPC or Horizon.
 */
export async function verifyOnChainTransaction(txHash) {
    if (!isValidTxHash(txHash)) {
        return { successful: false, ledger: 0, txHash, error: 'Invalid transaction hash format' };
    }
    const cleanHash = txHash.trim().toLowerCase();
    const soroban = getSorobanServer();
    try {
        // 1. Try Soroban RPC getTransaction
        const txResponse = await soroban.getTransaction(cleanHash);
        if (txResponse.status === rpc.Api.GetTransactionStatus.SUCCESS) {
            return {
                successful: true,
                ledger: txResponse.latestLedger || 0,
                txHash: cleanHash,
            };
        }
        else if (txResponse.status === rpc.Api.GetTransactionStatus.FAILED) {
            return {
                successful: false,
                ledger: txResponse.latestLedger || 0,
                txHash: cleanHash,
                error: 'Transaction execution failed on-chain',
            };
        }
        else {
            // Pending or not found yet on Soroban RPC, fallback to Horizon
            const horizon = getHorizonServer();
            const hTx = await horizon.transactions().transaction(cleanHash).call();
            return {
                successful: hTx.successful,
                ledger: hTx.ledger_attr,
                txHash: cleanHash,
            };
        }
    }
    catch (err) {
        // If not found or error, attempt Horizon direct check
        try {
            const horizon = getHorizonServer();
            const hTx = await horizon.transactions().transaction(cleanHash).call();
            return {
                successful: hTx.successful,
                ledger: hTx.ledger_attr,
                txHash: cleanHash,
            };
        }
        catch (hErr) {
            return {
                successful: false,
                ledger: 0,
                txHash: cleanHash,
                error: err?.message || 'Transaction not found on Stellar Testnet',
            };
        }
    }
}
