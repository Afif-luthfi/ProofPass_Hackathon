import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NETWORKS, walletParameters } from '../shared/networks.mjs';
import { assertNetworkMatch, switchWallet } from '../shared/guards.mjs';
import { prepareDeployment, sendDeployment, verifyDeployment } from '../shared/deploy.mjs';

const account = '0x' + '12'.repeat(20);
const other = '0x' + '34'.repeat(20);
const txHash = '0x' + 'ab'.repeat(32);
const artifact = { bytecode: '0x6000', deployedBytecode: '0x6100' };
const n = NETWORKS.testnet;

function fixture(overrides = {}) {
  const state = { chain: n.hexId, genesis: n.genesis, account, balance: '0x8ac7230489e80000', sent: 0, ...overrides };
  const wallet = { request: async ({ method }) => {
    if (method === 'eth_accounts') return state.account ? [state.account] : [];
    if (method === 'eth_chainId') return state.chain;
    if (method === 'eth_getBlockByNumber') return { hash: state.genesis };
    if (method === 'eth_sendTransaction') { state.sent++; return txHash; }
    throw new Error(method);
  }};
  const read = async (key, method) => {
    if (method === 'eth_chainId') return n.hexId;
    if (method === 'eth_getBlockByNumber') return { hash: n.genesis };
    if (method === 'eth_getBalance') return state.balance;
    if (method === 'eth_estimateGas') return '0x186a0';
    if (method === 'eth_gasPrice') return '0x3b9aca00';
    throw new Error(method);
  };
  return { state, wallet, read };
}

test('wrong chain or a same-ID different blockchain cannot pass', () => {
  assertNetworkMatch('testnet', n.hexId, n.hexId, n.genesis, n.genesis);
  assert.throws(() => assertNetworkMatch('testnet', '0x1', n.hexId, n.genesis, n.genesis), /Chain ID 1/);
  assert.throws(() => assertNetworkMatch('testnet', n.hexId, n.hexId, '0x' + 'ff'.repeat(32), n.genesis), /blockchain berbeda/);
  assert.throws(() => assertNetworkMatch('testnet', n.hexId, n.hexId, null, n.genesis), /belum dapat/);
});

test('adding an unknown chain uses official RPC and switches again; user rejection is not swallowed', async () => {
  const calls = [];
  await switchWallet({ request: async request => { calls.push(request); if (calls.length === 1) throw { code: 4902 }; } }, 'testnet', walletParameters('testnet'));
  assert.deepEqual(calls.map(c => c.method), ['wallet_switchEthereumChain', 'wallet_addEthereumChain', 'wallet_switchEthereumChain']);
  assert.equal(calls[1].params[0].rpcUrls[0], n.rpc);
  await assert.rejects(switchWallet({ request: async () => { throw new Error('Rejected'); } }, 'testnet', walletParameters('testnet')), /Rejected/);
});

test('preparing never sends a transaction; send explicitly pins chain and zero transfer', async () => {
  const { state, wallet, read } = fixture();
  const plan = await prepareDeployment(wallet, 'testnet', artifact, read);
  assert.equal(state.sent, 0);
  assert.equal(plan.transaction.chainId, n.hexId);
  assert.equal(plan.transaction.value, '0x0');
  assert.equal(BigInt(plan.transaction.gas), 120000n);
  assert.equal(await sendDeployment(wallet, plan, read), txHash);
  assert.equal(state.sent, 1);
});

test('changed account, chain, insufficient balance and stale estimates block sending', async () => {
  for (const mutation of [s => s.account = other, s => s.chain = '0x1', s => s.balance = '0x0']) {
    const { state, wallet, read } = fixture();
    const plan = await prepareDeployment(wallet, 'testnet', artifact, read);
    mutation(state);
    await assert.rejects(sendDeployment(wallet, plan, read));
    assert.equal(state.sent, 0);
  }
  const { state, wallet, read } = fixture();
  const plan = await prepareDeployment(wallet, 'testnet', artifact, read);
  plan.preparedAt = Date.now() - 120001;
  await assert.rejects(sendDeployment(wallet, plan, read), /kedaluwarsa/);
  assert.equal(state.sent, 0);
  state.balance = '0x0';
  await assert.rejects(prepareDeployment(wallet, 'testnet', artifact, read), /tidak cukup/);
});

test('RPC failure never becomes a successful deployment', async () => {
  const { state, wallet } = fixture();
  await assert.rejects(prepareDeployment(wallet, 'testnet', artifact, async () => { throw new Error('RPC unavailable'); }), /RPC unavailable/);
  assert.equal(state.sent, 0);
});

test('receipt verification distinguishes pending, failed, confirmed and wrong bytecode', async () => {
  const record = { key: 'testnet', hash: txHash, account };
  assert.equal((await verifyDeployment(record, artifact, async () => null)).state, 'pending');
  assert.equal((await verifyDeployment(record, artifact, async () => ({ status: '0x0' }))).state, 'failed');
  const read = async (_, method) => ({
    eth_getTransactionReceipt: { status: '0x1', contractAddress: other, blockNumber: '0x5', gasUsed: '0x100' },
    eth_getTransactionByHash: { from: account, to: null, input: artifact.bytecode },
    eth_getCode: artifact.deployedBytecode,
    eth_chainId: n.hexId, eth_getBlockByNumber: { hash: n.genesis },
  })[method];
  assert.equal((await verifyDeployment(record, artifact, read)).address, other);
  await assert.rejects(verifyDeployment(record, artifact, (key, method) => method === 'eth_getCode' ? '0x' : read(key, method)), /tidak cocok/);
});
