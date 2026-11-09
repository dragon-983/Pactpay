import dotenv from 'dotenv';
dotenv.config();
export const config = {
    port: parseInt(process.env.PORT || '3002', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    databaseUrl: process.env.DATABASE_URL || 'postgresql:///pactpay?host=/var/run/postgresql',
    testDatabaseUrl: process.env.TEST_DATABASE_URL || 'postgresql:///pactpay_test?host=/var/run/postgresql',
    databaseSsl: process.env.DATABASE_SSL === 'true',
    // Stellar / Soroban configuration
    stellarNetwork: process.env.STELLAR_NETWORK || 'testnet',
    networkPassphrase: process.env.STELLAR_NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015',
    horizonUrl: process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org',
    sorobanRpcUrl: process.env.STELLAR_SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org',
    // Default Platform Arbiter
    platformArbiterAddress: process.env.PLATFORM_ARBITER_ADDRESS || 'GDG2Y3KGYX465W2MDT34D7EQ54D2V33GZZUWWF5FGLA2X44S7W67O274',
    // Escrow contract ID on Testnet
    escrowContractId: process.env.ESCROW_CONTRACT_ID || '',
    // Native XLM SAC (Stellar Asset Contract) address on Testnet:
    // Native asset contract address can be derived or set
    nativeTokenAddress: process.env.NATIVE_TOKEN_ADDRESS || 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
};
