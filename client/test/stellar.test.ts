import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidStellarAddress,
  shortAddress,
  formatXlm,
  getExplorerUrl,
  getAccountExplorerUrl,
} from '../src/lib/stellar.js';

test('isValidStellarAddress correctly validates Ed25519 Stellar public keys', () => {
  const valid = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
  const valid2 = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';
  const invalid1 = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA'; // too short
  const invalid2 = 'SBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5'; // secret key prefix
  const invalid3 = 'not-an-address';
  const invalid4 = null;

  assert.equal(isValidStellarAddress(valid), true);
  assert.equal(isValidStellarAddress(valid2), true);
  assert.equal(isValidStellarAddress(invalid1), false);
  assert.equal(isValidStellarAddress(invalid2), false);
  assert.equal(isValidStellarAddress(invalid3), false);
  assert.equal(isValidStellarAddress(invalid4 as any), false);
});

test('shortAddress shortens 56-char public keys cleanly', () => {
  const addr = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
  assert.equal(shortAddress(addr), 'GBBD...FLA5');
  assert.equal(shortAddress(''), '');
  assert.equal(shortAddress(null), '');
  assert.equal(shortAddress('short'), 'short');
});

test('formatXlm formats amounts with exact decimals and XLM unit', () => {
  assert.equal(formatXlm('100'), '100.00 XLM');
  assert.equal(formatXlm('1000.5'), '1,000.50 XLM');
  assert.equal(formatXlm(10000000000n), '1,000.00 XLM'); // BigInt stroops
  assert.equal(formatXlm(10000000n), '1.00 XLM');
  assert.equal(formatXlm(0), '0.00 XLM');
  assert.equal(formatXlm(null), '0.00 XLM');
});

test('getExplorerUrl generates verified Stellar Expert Testnet URL', () => {
  const hash = 'a'.repeat(64);
  const url = getExplorerUrl(hash);
  assert.equal(url, `https://stellar.expert/explorer/testnet/tx/${hash}`);

  const addr = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
  const accountUrl = getAccountExplorerUrl(addr);
  assert.equal(accountUrl, `https://stellar.expert/explorer/testnet/account/${addr}`);
});

