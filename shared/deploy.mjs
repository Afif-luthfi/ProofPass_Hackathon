import { getNetwork } from './networks.mjs';
import { assertNetworkMatch, assertAccount } from './guards.mjs';

export async function inspectWallet(provider, key, read) {
  const accounts = await provider.request({ method: 'eth_accounts' });
  if (!accounts[0]) throw new Error('Hubungkan MetaMask terlebih dahulu.');
  const [chain, officialChain, genesis, officialGenesis] = await Promise.all([
    provider.request({ method: 'eth_chainId' }), read(key, 'eth_chainId'),
    provider.request({ method: 'eth_getBlockByNumber', params: ['0x0', false] }),
    read(key, 'eth_getBlockByNumber', ['0x0', false]),
  ]);
  assertNetworkMatch(key, chain, officialChain, genesis?.hash, officialGenesis?.hash);
  assertAccount(await provider.request({ method: 'eth_accounts' }), accounts[0]);
  const balance = await read(key, 'eth_getBalance', [accounts[0], 'latest']);
  return { key, account: accounts[0], chain, balance };
}

export async function prepareDeployment(provider, key, artifact, read) {
  const snapshot = await inspectWallet(provider, key, read);
  const transaction = { from: snapshot.account, data: artifact.bytecode, value: '0x0' };
  const [gasHex, priceHex] = await Promise.all([
    read(key, 'eth_estimateGas', [transaction]), read(key, 'eth_gasPrice'),
  ]);
  const gas = (BigInt(gasHex) * 120n + 99n) / 100n;
  const price = BigInt(priceHex);
  const maximumFee = gas * price;
  if (gas <= 0n || price <= 0n) throw new Error('Estimasi gas tidak valid. Coba periksa jaringan lagi.');
  if (BigInt(snapshot.balance) < maximumFee) throw new Error(`Saldo ${getNetwork(key).name} tidak cukup untuk estimasi gas. Saldo jaringan lain tidak dapat digunakan.`);
  return {
    ...snapshot, maximumFee: maximumFee.toString(), preparedAt: Date.now(),
    transaction: { ...transaction, chainId: getNetwork(key).hexId, gas: `0x${gas.toString(16)}`, gasPrice: `0x${price.toString(16)}` },
  };
}

export async function sendDeployment(provider, plan, read) {
  if (Date.now() - plan.preparedAt > 120000) throw new Error('Estimasi sudah kedaluwarsa. Periksa biaya deploy lagi.');
  const fresh = await inspectWallet(provider, plan.key, read);
  assertAccount([fresh.account], plan.account);
  if (BigInt(fresh.balance) < BigInt(plan.maximumFee)) throw new Error('Saldo berubah dan tidak cukup. Periksa biaya deploy lagi.');
  const chain = await provider.request({ method: 'eth_chainId' });
  if (BigInt(chain) !== BigInt(plan.chain)) throw new Error('Jaringan berubah. Periksa koneksi lagi.');
  assertAccount(await provider.request({ method: 'eth_accounts' }), plan.account);
  return provider.request({ method: 'eth_sendTransaction', params: [plan.transaction] });
}

export async function verifyDeployment(record, artifact, read) {
  const receipt = await read(record.key, 'eth_getTransactionReceipt', [record.hash]);
  if (!receipt) return { state: 'pending' };
  if (BigInt(receipt.status) !== 1n) return { state: 'failed' };
  if (!receipt.contractAddress) throw new Error('Transaksi bukan deployment contract.');
  const [code, tx, genesis, chain] = await Promise.all([
    read(record.key, 'eth_getCode', [receipt.contractAddress, 'latest']),
    read(record.key, 'eth_getTransactionByHash', [record.hash]),
    read(record.key, 'eth_getBlockByNumber', ['0x0', false]), read(record.key, 'eth_chainId'),
  ]);
  const n = getNetwork(record.key);
  assertNetworkMatch(record.key, n.hexId, chain, n.genesis, genesis?.hash);
  if (!tx || tx.to || tx.from?.toLowerCase() !== record.account.toLowerCase()
    || tx.input?.toLowerCase() !== artifact.bytecode.toLowerCase()
    || code.toLowerCase() !== artifact.deployedBytecode.toLowerCase()) {
    throw new Error('Transaksi atau bytecode tidak cocok dengan build ProofPass ini. Jangan deploy ulang sebelum memeriksa explorer.');
  }
  return { state: 'confirmed', address: receipt.contractAddress, blockNumber: Number(BigInt(receipt.blockNumber)), gasUsed: BigInt(receipt.gasUsed).toString() };
}
