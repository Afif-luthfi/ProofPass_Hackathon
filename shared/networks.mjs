export const NETWORKS = Object.freeze({
  testnet: Object.freeze({
    key: 'testnet', name: 'BOT Chain Testnet', chainId: 968, hexId: '0x3c8',
    rpc: 'https://rpc.bohr.life', explorer: 'https://scan.bohr.life',
    genesis: '0x395bd3d6583216495648e8322032761c1a377eddf04f59de0c693c7d6682aee6',
  }),
  mainnet: Object.freeze({
    key: 'mainnet', name: 'BOT Chain Mainnet', chainId: 677, hexId: '0x2a5',
    rpc: 'https://rpc.botchain.ai', explorer: 'https://scan.botchain.ai',
    genesis: '0x161a4ff8b4c95e95b314899c4ea8f9782c4ae8851362ffe0d47c0b8a05f7b784',
  }),
});

export function getNetwork(key) {
  if (!Object.hasOwn(NETWORKS, key)) throw new Error('Jaringan tidak didukung.');
  return NETWORKS[key];
}

export function walletParameters(key) {
  const n = getNetwork(key);
  return {
    chainId: n.hexId, chainName: n.name,
    nativeCurrency: { name: 'BOT', symbol: 'BOT', decimals: 18 },
    rpcUrls: [n.rpc], blockExplorerUrls: [n.explorer],
  };
}
