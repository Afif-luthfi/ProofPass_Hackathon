import { getNetwork } from './networks.mjs';

export function assertNetworkMatch(key, walletChain, rpcChain, walletGenesis, rpcGenesis) {
  const expected = BigInt(getNetwork(key).chainId);
  if (BigInt(rpcChain) !== expected) throw new Error('RPC resmi mengembalikan Chain ID yang tidak sesuai. Deploy diblokir.');
  if (BigInt(walletChain) !== expected) {
    throw new Error(`Wallet memakai Chain ID ${BigInt(walletChain)}. Pilih ${getNetwork(key).name} (${expected}) untuk situs ini.`);
  }
  if (!/^0x[0-9a-f]{64}$/i.test(walletGenesis ?? '') || !/^0x[0-9a-f]{64}$/i.test(rpcGenesis ?? '')) {
    throw new Error('Identitas jaringan belum dapat diperiksa. Coba cek koneksi lagi.');
  }
  if (walletGenesis.toLowerCase() !== rpcGenesis.toLowerCase()) {
    throw new Error('Chain ID sama tetapi blockchain berbeda. Periksa RPC jaringan di MetaMask; gunakan RPC BOT Chain resmi.');
  }
  if (rpcGenesis.toLowerCase() !== getNetwork(key).genesis) {
    throw new Error('Identitas RPC berubah dari konfigurasi BOT Chain yang diperiksa. Deploy diblokir.');
  }
}

export function assertAccount(accounts, expected) {
  if (!accounts?.[0] || accounts[0].toLowerCase() !== expected.toLowerCase()) {
    throw new Error('Akun wallet berubah atau terputus. Hubungkan dan periksa ulang.');
  }
}

export async function switchWallet(provider, key, parameters) {
  const network = getNetwork(key);
  try {
    await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: network.hexId }] });
  } catch (error) {
    const code = error.code ?? error.data?.originalError?.code;
    if (Number(code) !== 4902) throw error;
    await provider.request({ method: 'wallet_addEthereumChain', params: [parameters] });
    await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: network.hexId }] });
  }
}

export function friendlyError(error) {
  const code = error.code ?? error.info?.error?.code;
  if (Number(code) === 4001 || code === 'ACTION_REJECTED') return 'Permintaan dibatalkan di MetaMask. Tidak ada transaksi baru yang dikirim oleh alat ini.';
  if (Number(code) === -32002) return 'Ada permintaan MetaMask yang masih terbuka. Buka ekstensi MetaMask untuk menyelesaikannya.';
  return error.shortMessage ?? error.message ?? 'Pemeriksaan gagal. Coba lagi.';
}
