import freighter from '@stellar/freighter-api';
import { StrKey } from '@stellar/stellar-sdk';

const freighterApi = (freighter as any)?.freighterApi || (freighter as any)?.default || freighter;

export interface WalletState {
  connected: boolean;
  address: string | null;
  network: string | null;
  isTestnet: boolean;
  balanceXlm: string | null;
  error: string | null;
}

export function isValidStellarAddress(address: string): boolean {
  if (typeof address !== 'string') return false;
  return StrKey.isValidEd25519PublicKey(address);
}

export function shortAddress(address: string | null | undefined): string {
  if (!address) return '';
  if (address.length <= 10) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export function formatXlm(amount: string | number | bigint | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return '0.00 XLM';
  const num = typeof amount === 'bigint' ? Number(amount) / 10_000_000 : Number(amount);
  if (isNaN(num)) return '0.00 XLM';
  return `${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 7 })} XLM`;
}

export function getExplorerUrl(txHash: string): string {
  return `https://stellar.expert/explorer/testnet/tx/${txHash}`;
}

export function getAccountExplorerUrl(address: string): string {
  return `https://stellar.expert/explorer/testnet/account/${address}`;
}

/**
 * Checks if Freighter extension is installed in the user's browser
 */
export async function isFreighterAvailable(): Promise<boolean> {
  try {
    if (!freighterApi?.isConnected) return false;
    const res = await freighterApi.isConnected();
    return !!res;
  } catch (err) {
    return false;
  }
}

/**
 * Connects to Freighter, requests permission, and verifies Testnet network
 */
export async function connectFreighter(): Promise<{ address: string; network: string; isTestnet: boolean }> {
  const available = await isFreighterAvailable();
  if (!available) {
    throw new Error('Freighter wallet extension was not detected. Please install Freighter from freighter.app.');
  }

  // Request wallet access
  const accessObj = await freighterApi.requestAccess();
  if (accessObj.error) {
    throw new Error(accessObj.error);
  }

  const addressObj = await freighterApi.getAddress();
  if (addressObj.error || !addressObj.address) {
    throw new Error(addressObj.error || 'Failed to retrieve public key from Freighter.');
  }

  const networkDetails = await freighterApi.getNetworkDetails();
  const network = networkDetails.network || 'UNKNOWN';
  const isTestnet = network.toUpperCase().includes('TESTNET');

  return {
    address: addressObj.address,
    network,
    isTestnet,
  };
}

/**
 * Signs an authentication challenge message with Freighter
 */
export async function signAuthMessage(message: string): Promise<string> {
  const res = await freighterApi.signMessage(message);
  if (res.error) {
    throw new Error(res.error || 'Message signing was rejected by the user.');
  }
  return res.signedMessage ? res.signedMessage.toString() : '';
}

/**
 * Fetches native XLM balance on Stellar Testnet for an address
 */
export async function fetchTestnetBalance(address: string): Promise<string> {
  try {
    const res = await fetch(`https://horizon-testnet.stellar.org/accounts/${address}`);
    if (!res.ok) return '0.00';
    const data = await res.json();
    const nativeBalance = data.balances?.find((b: any) => b.asset_type === 'native');
    return nativeBalance ? nativeBalance.balance : '0.00';
  } catch (err) {
    return '0.00';
  }
}

/**
 * Signs and submits a Stellar / Soroban transaction XDR through Freighter
 */
export async function signAndSubmitTransaction(xdr: string): Promise<string> {
  const res = await freighterApi.signTransaction(xdr, {
    networkPassphrase: 'Test SDF Network ; September 2015',
  });

  if (res.error) {
    throw new Error(res.error || 'Transaction signing rejected');
  }

  // Submit signed transaction XDR to Testnet Horizon
  const submitRes = await fetch('https://horizon-testnet.stellar.org/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `tx=${encodeURIComponent(res.signedTxXdr)}`,
  });

  const submitData = await submitRes.json();
  if (!submitRes.ok) {
    throw new Error(submitData.extras?.result_codes?.transaction || submitData.title || 'Transaction submission failed');
  }

  return submitData.hash;
}
