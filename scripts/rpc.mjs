import { getNetwork } from '../shared/networks.mjs';

export async function rpc(key, method, params = []) {
  const response = await fetch(getNetwork(key).rpc, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`RPC ${key}: HTTP ${response.status}`);
  const body = await response.json();
  if (body.error) throw new Error(`RPC ${key}: ${body.error.message}`);
  if (!Object.hasOwn(body, 'result')) throw new Error(`RPC ${key}: invalid response`);
  return body.result;
}
