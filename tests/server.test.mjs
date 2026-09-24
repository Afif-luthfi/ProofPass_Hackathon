import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAppServer, validReadRequest } from '../scripts/server.mjs';

test('RPC proxy permits only fixed read-only calls and deployment gas simulation', () => {
  assert.equal(validReadRequest('eth_sendTransaction', [{}]), false);
  assert.equal(validReadRequest('eth_sendRawTransaction', ['0x']), false);
  assert.equal(validReadRequest('personal_sign', ['secret']), false);
  assert.equal(validReadRequest('eth_chainId', []), true);
  assert.equal(validReadRequest('eth_getBalance', ['0x' + '12'.repeat(20), 'latest']), true);
  assert.equal(validReadRequest('eth_estimateGas', [{ from: '0x' + '12'.repeat(20), data: '0x6000', value: '0x0' }]), true);
  assert.equal(validReadRequest('eth_estimateGas', [{ from: '0x' + '12'.repeat(20), to: '0x' + '34'.repeat(20), data: '0x6000', value: '0x1' }]), false);
});

test('local server denies external origins, unknown files and transaction submission', async t => {
  const server = createAppServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(base)).status, 200);
  assert.equal((await fetch(`${base}/.env`)).status, 404);
  assert.equal((await fetch(`${base}/package.json`)).status, 404);
  assert.equal((await fetch(base, { headers: { Origin: 'https://unrelated.example' } })).status, 403);
  assert.equal((await fetch(`${base}/api/rpc/testnet`, { method: 'POST', body: JSON.stringify({ method: 'eth_sendTransaction', params: [{}] }) })).status, 400);
});
