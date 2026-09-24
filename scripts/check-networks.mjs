import { NETWORKS } from '../shared/networks.mjs';
import { rpc } from './rpc.mjs';

await Promise.all(Object.values(NETWORKS).map(async n => {
  try {
    const [chain, genesis, latest] = await Promise.all([
      rpc(n.key, 'eth_chainId'), rpc(n.key, 'eth_getBlockByNumber', ['0x0', false]),
      rpc(n.key, 'eth_getBlockByNumber', ['latest', false]),
    ]);
    if (BigInt(chain) !== BigInt(n.chainId) || !genesis?.hash || !latest?.hash) throw new Error('Network response mismatch');
    console.log(JSON.stringify({ network: n.name, rpc: n.rpc, chainId: Number(BigInt(chain)),
      genesis: genesis.hash, latestBlock: Number(BigInt(latest.number)),
      latestAt: new Date(Number(BigInt(latest.timestamp)) * 1000).toISOString() }));
  } catch (error) {
    console.error(`${n.name}: ${error.message}`);
    process.exitCode = 1;
  }
}));
