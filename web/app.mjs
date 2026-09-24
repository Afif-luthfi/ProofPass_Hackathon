import { formatEther } from '/vendor/ethers.js';
import { NETWORKS, getNetwork, walletParameters } from '/shared/networks.mjs';
import { switchWallet, friendlyError } from '/shared/guards.mjs';
import { inspectWallet, prepareDeployment, sendDeployment, verifyDeployment } from '/shared/deploy.mjs';

const $ = id => document.getElementById(id);
const storageKey = 'proofpass.deployments.v1';
let provider, account, artifact, plan, busy = false, epoch = 0, expiry;
let records = {};
let storageAvailable = true;
try { records = JSON.parse(localStorage.getItem(storageKey) || '{}'); if (!records || Array.isArray(records) || typeof records !== 'object') records = {}; localStorage.setItem(storageKey, JSON.stringify(records)); }
catch { storageAvailable = false; }
for (const [key, r] of Object.entries(records)) {
  if (!Object.hasOwn(NETWORKS, key) || !r || r.key !== key || !/^0x[0-9a-f]{64}$/i.test(r.hash) || !/^0x[0-9a-f]{40}$/i.test(r.account)) delete records[key];
}
const selected = () => $('network').value;
const status = (text, error = false) => { $('status').textContent = text; $('status').dataset.error = String(error); };
const save = () => { try { localStorage.setItem(storageKey, JSON.stringify(records)); } catch { status('Transaksi sudah dikirim, tetapi penyimpanan browser gagal. Salin hash transaksi sebelum menutup halaman.', true); } };
const amount = hex => `${formatEther(BigInt(hex))} BOT`;

async function read(key, method, params = []) {
  const response = await fetch(`/api/rpc/${key}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, params }), signal: AbortSignal.timeout(20000),
  });
  const body = await response.json();
  if (!response.ok || body.error) throw new Error(body.error || 'RPC tidak merespons.');
  return body.result;
}

function invalidate() {
  epoch++;
  plan = undefined;
  clearTimeout(expiry);
  $('confirm').checked = false;
  $('fee').textContent = 'Periksa biaya deploy untuk jaringan dan akun yang aktif.';
  render();
}

function render() {
  const record = records[selected()];
  const blockedRecord = record && record.state !== 'failed';
  for (const button of document.querySelectorAll('[data-task]')) button.disabled = busy;
  for (const id of ['check', 'switch', 'restore']) $(id).disabled = busy || !provider || !account;
  $('estimate').disabled = busy || !provider || !account || !artifact || !storageAvailable || !!blockedRecord;
  $('confirm').disabled = busy || !plan;
  $('deploy').disabled = busy || !plan || !$('confirm').checked || !!blockedRecord;
  $('receipt-check').disabled = busy || !record || !artifact;
  $('download').disabled = busy || record?.state !== 'confirmed';
  $('rpc-label').textContent = getNetwork(selected()).rpc;
  $('mainnet-note').hidden = selected() !== 'mainnet';
  $('receipt-details').hidden = !record;
  if (!record) $('receipt-status').textContent = 'Belum ada transaksi untuk jaringan ini.';
  else {
    const states = { pending: 'Transaksi sudah dikirim. Menunggu konfirmasi; jangan deploy ulang.', failed: 'Transaksi gagal di blockchain. Periksa explorer sebelum mencoba lagi.', confirmed: 'Deployment berhasil. Bytecode cocok dengan build ProofPass ini.' };
    $('receipt-status').textContent = states[record.state] || 'Catatan perlu diperiksa kembali di RPC resmi.';
    $('tx-link').textContent = record.hash;
    $('tx-link').href = `${getNetwork(record.key).explorer}/tx/${record.hash}`;
    $('contract-address').textContent = record.address || 'Menunggu konfirmasi';
  }
}

async function task(fn) {
  if (busy) return;
  busy = true; render();
  try { await fn(); } catch (error) { invalidate(); status(friendlyError(error), true); }
  finally { busy = false; render(); }
}

const discovered = new Map();
window.addEventListener('eip6963:announceProvider', event => {
  const detail = event.detail;
  if (detail?.info?.rdns === 'io.metamask' && typeof detail.provider?.request === 'function') discovered.set(detail.info.uuid, detail.provider);
});
window.dispatchEvent(new Event('eip6963:requestProvider'));

function findMetaMask() {
  if (discovered.size > 1) throw new Error('Terdeteksi lebih dari satu MetaMask. Aktifkan satu ekstensi MetaMask pada browser ini.');
  if (discovered.size === 1) return [...discovered.values()][0];
  const choices = window.ethereum?.providers || [window.ethereum];
  const found = choices.filter(p => p?.isMetaMask && !p.isBraveWallet && !p.isRabby);
  if (found.length === 1) return found[0];
  throw new Error('MetaMask belum ditemukan. Buka URL ini di Chrome/Edge/Firefox tempat MetaMask terpasang, buka kunci wallet, lalu muat ulang. Browser dalam aplikasi Codex mungkin tidak memiliki ekstensi tersebut.');
}

function walletChanged() {
  invalidate();
  $('network-status').textContent = 'Akun atau jaringan berubah. Cek ulang koneksi sebelum deploy.';
  $('wallet-chain').textContent = 'Perlu diperiksa kembali';
  for (const key of Object.keys(NETWORKS)) { $(`balance-${key}`).textContent = 'Perlu diperiksa kembali.'; $(`explorer-${key}`).hidden = true; }
  status('MetaMask berubah. Klik Cek ulang koneksi & saldo.');
}

async function check() {
  invalidate();
  const generation = epoch;
  status('Membaca jaringan wallet dan saldo dari kedua RPC resmi...');
  const [accounts, chain] = await Promise.all([
    provider.request({ method: 'eth_accounts' }), provider.request({ method: 'eth_chainId' }),
  ]);
  account = accounts[0];
  $('account').textContent = account || 'Wallet terputus. Hubungkan kembali.';
  $('wallet-chain').textContent = `${Number(BigInt(chain))} (${chain})`;
  if (!account) throw new Error('Akses wallet belum diberikan. Klik Hubungkan MetaMask.');
  const checkingAccount = account;
  await Promise.all(Object.values(NETWORKS).map(async n => {
    $(`balance-${n.key}`).textContent = 'Membaca saldo...';
    try {
      const [remoteChain, genesis, balance] = await Promise.all([
        read(n.key, 'eth_chainId'), read(n.key, 'eth_getBlockByNumber', ['0x0', false]),
        read(n.key, 'eth_getBalance', [checkingAccount, 'latest']),
      ]);
      if (BigInt(remoteChain) !== BigInt(n.chainId) || genesis?.hash?.toLowerCase() !== n.genesis) throw new Error('Identitas RPC tidak cocok');
      if (generation !== epoch) return;
      $(`balance-${n.key}`).textContent = amount(balance);
      $(`explorer-${n.key}`).href = `${n.explorer}/address/${checkingAccount}`;
      $(`explorer-${n.key}`).hidden = false;
    } catch (error) { if (generation === epoch) $(`balance-${n.key}`).textContent = `Belum dapat dibaca: ${error.message}`; }
  }));
  if (generation !== epoch) throw new Error('Wallet berubah saat diperiksa. Cek ulang koneksi.');
  try {
    await inspectWallet(provider, selected(), read);
    if (generation !== epoch) throw new Error('Wallet berubah saat diperiksa.');
    $('network-status').textContent = `${getNetwork(selected()).name}: Chain ID dan blok awal cocok dengan RPC resmi.`;
    status('Pemeriksaan selesai. Perhatikan saldo testnet dan mainnet secara terpisah.');
  } catch (error) { $('network-status').textContent = error.message; throw error; }
}

$('connect').onclick = () => task(async () => {
  const next = findMetaMask();
  if (provider && provider !== next) { provider.removeListener?.('chainChanged', walletChanged); provider.removeListener?.('accountsChanged', walletChanged); provider.removeListener?.('disconnect', walletChanged); }
  if (provider !== next) { next.on?.('chainChanged', walletChanged); next.on?.('accountsChanged', walletChanged); next.on?.('disconnect', walletChanged); }
  provider = next;
  status('Buka MetaMask dan setujui koneksi untuk situs lokal ini.');
  await provider.request({ method: 'eth_requestAccounts' });
  await check();
});
$('check').onclick = () => task(check);
$('network').onchange = () => { invalidate(); $('network-status').textContent = 'Pilihan halaman berubah. Klik Pilih jaringan ini di MetaMask untuk mengubah jaringan wallet.'; };
$('switch').onclick = () => task(async () => {
  invalidate(); status('Menunggu persetujuan pergantian jaringan di MetaMask...');
  await switchWallet(provider, selected(), walletParameters(selected()));
  await check();
});
$('estimate').onclick = () => task(async () => {
  invalidate(); const generation = epoch; const key = selected();
  if (key === 'mainnet') {
    const testnet = records.testnet;
    if (!testnet || (await verifyDeployment(testnet, artifact, read)).state !== 'confirmed') throw new Error('Selesaikan deployment testnet untuk build ini terlebih dahulu.');
  }
  status('Memeriksa identitas jaringan dan memperkirakan biaya gas...');
  const prepared = await prepareDeployment(provider, key, artifact, read);
  if (generation !== epoch) throw new Error('Wallet berubah saat menghitung biaya. Periksa ulang.');
  plan = prepared;
  $('fee').textContent = `${getNetwork(key).name} (${getNetwork(key).chainId}). Batas biaya awal: ${amount(plan.maximumFee)}. Nilai kiriman: 0 BOT. Estimasi berlaku 2 menit; periksa biaya akhir di MetaMask.`;
  status('Estimasi siap. Periksa jaringan dan biaya sebelum mencentang persetujuan.');
  expiry = setTimeout(() => { invalidate(); status('Estimasi kedaluwarsa. Klik Periksa biaya deploy lagi.'); }, 120000);
});
$('confirm').onchange = render;
$('deploy').onclick = () => task(async () => {
  if (!plan || !$('confirm').checked) throw new Error('Periksa biaya dan centang persetujuan terlebih dahulu.');
  const prepared = plan;
  clearTimeout(expiry);
  status('Buka MetaMask untuk meninjau deployment. Contract tidak meminta kiriman BOT; hanya gas.');
  const hash = await sendDeployment(provider, prepared, read);
  if (!/^0x[0-9a-f]{64}$/i.test(hash)) throw new Error('Wallet tidak mengembalikan hash transaksi yang valid. Periksa aktivitas MetaMask sebelum mencoba lagi.');
  records[prepared.key] = { key: prepared.key, chainId: getNetwork(prepared.key).chainId, account: prepared.account, hash, state: 'pending', compiler: artifact.compiler, sourceSha256: artifact.sourceSha256, sentAt: new Date().toISOString() };
  save(); invalidate(); render();
  status(`Transaksi dikirim: ${hash}. Memeriksa konfirmasi...`);
  await checkReceipt(prepared.key);
});

async function checkReceipt(key = selected()) {
  const record = records[key];
  if (!record) throw new Error('Belum ada transaksi untuk diperiksa.');
  status('Memeriksa receipt dan bytecode melalui RPC resmi...');
  const verified = await verifyDeployment(record, artifact, read);
  records[key] = { ...record, ...verified }; save(); render();
  status(verified.state === 'confirmed' ? 'Deployment berhasil dan bytecode cocok. Unduh catatannya.' : verified.state === 'failed' ? 'Transaksi gagal. Lihat detail di explorer.' : 'Transaksi belum dikonfirmasi. Tunggu sebentar lalu klik Cek status transaksi.');
}
$('receipt-check').onclick = () => task(() => checkReceipt());
$('restore').onclick = () => task(async () => {
  const hash = $('restore-hash').value.trim();
  if (!/^0x[0-9a-f]{64}$/i.test(hash)) throw new Error('Hash transaksi harus berupa 0x diikuti 64 karakter heksadesimal.');
  const key = selected();
  if (records[key] && records[key].hash !== hash && records[key].state !== 'failed') throw new Error('Sudah ada transaksi tersimpan. Periksa transaksi tersebut terlebih dahulu.');
  const tx = await read(key, 'eth_getTransactionByHash', [hash]);
  if (!tx || tx.to || tx.from?.toLowerCase() !== account.toLowerCase() || tx.input?.toLowerCase() !== artifact.bytecode.toLowerCase()) throw new Error('Transaksi tidak ditemukan atau tidak cocok dengan wallet dan build ProofPass ini.');
  records[key] = { key, chainId: getNetwork(key).chainId, account, hash, state: 'pending', compiler: artifact.compiler, sourceSha256: artifact.sourceSha256 };
  save(); invalidate(); await checkReceipt(key);
});
$('download').onclick = () => {
  const record = records[selected()];
  if (record?.state !== 'confirmed') return;
  const blob = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob); const a = document.createElement('a');
  a.href = url; a.download = `proofpass-${record.key}-${record.address}.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
$('theme').onclick = () => {
  const dark = document.documentElement.dataset.theme !== 'dark';
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  $('theme').textContent = dark ? 'Tema terang' : 'Tema gelap';
  $('theme').setAttribute('aria-pressed', String(dark));
};

try {
  const response = await fetch('/artifact.json');
  if (!response.ok) throw new Error('Hasil compile belum tersedia. Jalankan npm run compile lalu muat ulang.');
  artifact = await response.json();
  $('build-info').textContent = `Solidity ${artifact.compiler.split('+')[0]} · EVM ${artifact.evmVersion} · Tanpa parameter constructor`;
  for (const record of Object.values(records)) { if (record.state === 'confirmed') record.state = 'unchecked'; }
} catch (error) { status(error.message, true); }
if (!storageAvailable) status('Penyimpanan browser tidak tersedia. Aktifkan penyimpanan situs lokal agar transaksi dapat dipulihkan setelah refresh.', true);
render();
