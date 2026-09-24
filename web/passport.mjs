import { Interface, keccak256, toUtf8Bytes, sha256, hexlify, formatEther } from '/vendor/ethers.js';
import { NETWORKS, getNetwork, walletParameters } from '/shared/networks.mjs';
import { switchWallet, friendlyError } from '/shared/guards.mjs';
import { normalizeMetadata, encodeEnvelope, decodeEnvelope } from '/shared/metadata.mjs';

const $ = id => document.getElementById(id);
const ABI = [
  'function registerProof(bytes32 metadataHash, bytes32 documentHash, bool hasDocument) returns (uint256 proofId)',
  'function getProof(uint256 proofId) view returns ((address recorder,uint64 recordedAt,bool hasDocument,bytes32 metadataHash,bytes32 documentHash))',
  'function proofCount(address recorder) view returns (uint256)',
  'function getProofIds(address recorder,uint256 offset,uint256 limit) view returns (uint256[])',
  'event ProofRegistered(uint256 indexed proofId,address indexed recorder,bytes32 indexed metadataHash,bytes32 documentHash,bool hasDocument,uint64 recordedAt)',
];
const iface = new Interface(ABI);
const storageKey = 'proofpass.records.v1';
const $notice = (message, error = false) => { $('notice').textContent = message; $('notice').dataset.error = String(error); };
const selected = () => $('network').value;
let provider, account, artifact, busy = false, pendingProof, viewed, records = {};
try { records = JSON.parse(localStorage.getItem(storageKey) || '{}'); if (!records || typeof records !== 'object' || Array.isArray(records)) records = {}; } catch { records = {}; }

async function read(key, method, params = []) {
  const response = await fetch(`/api/rpc/${key}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ method, params }), signal: AbortSignal.timeout(20000) });
  const body = await response.json();
  if (!response.ok || body.error) throw new Error(body.error || 'RPC tidak merespons.');
  return body.result;
}
const save = () => localStorage.setItem(storageKey, JSON.stringify(records));
function getProvider() {
  const announced = new Map();
  const listener = event => { if (event.detail?.info?.rdns === 'io.metamask') announced.set(event.detail.info.uuid, event.detail.provider); };
  window.addEventListener('eip6963:announceProvider', listener);
  window.dispatchEvent(new Event('eip6963:requestProvider'));
  window.removeEventListener('eip6963:announceProvider', listener);
  const candidates = [...announced.values()];
  if (candidates.length === 1) return candidates[0];
  const fallback = (window.ethereum?.providers || [window.ethereum]).filter(p => p?.isMetaMask && !p.isBraveWallet && !p.isRabby);
  if (candidates.length > 1 || fallback.length !== 1) throw new Error('MetaMask tidak ditemukan atau ada lebih dari satu. Buka halaman ini di browser yang memiliki satu ekstensi MetaMask aktif.');
  return fallback[0];
}
function walletHooks() {
  const changed = () => { account = undefined; $('wallet-state').textContent = 'Akun/jaringan berubah. Hubungkan kembali untuk memperbarui.'; $('workspace').hidden = true; };
  provider.on?.('accountsChanged', changed); provider.on?.('chainChanged', changed); provider.on?.('disconnect', changed);
}
async function requireChain(key = selected()) {
  if (!provider || !account) throw new Error('Hubungkan MetaMask terlebih dahulu.');
  const n = getNetwork(key);
  const [walletChain, remoteChain, walletGenesis, remoteGenesis] = await Promise.all([
    provider.request({ method: 'eth_chainId' }), read(key, 'eth_chainId'),
    provider.request({ method: 'eth_getBlockByNumber', params: ['0x0', false] }), read(key, 'eth_getBlockByNumber', ['0x0', false]),
  ]);
  if (BigInt(walletChain) !== BigInt(n.chainId) || BigInt(remoteChain) !== BigInt(n.chainId) || walletGenesis?.hash?.toLowerCase() !== n.genesis || remoteGenesis?.hash?.toLowerCase() !== n.genesis) {
    $('chain-status').textContent = `MetaMask harus berada di ${n.name} (chain ${n.chainId}) dan cocok dengan RPC resmi.`;
    throw new Error(`Ganti MetaMask ke ${n.name} (chain ${n.chainId}) sebelum melanjutkan.`);
  }
  $('chain-status').textContent = `${n.name}: Chain ID dan blok awal cocok dengan RPC resmi.`;
}
function contractAddress() {
  const address = $('contract').value.trim();
  if (!/^0x[0-9a-f]{40}$/i.test(address)) throw new Error('Masukkan alamat contract ProofPass yang sudah di-deploy.');
  return address;
}
async function verifyCode(key, address) {
  const code = await read(key, 'eth_getCode', [address, 'latest']);
  if (!code || code === '0x' || code.toLowerCase() !== artifact.deployedBytecode.toLowerCase()) throw new Error('Bytecode di alamat ini tidak cocok dengan ProofPass pada repo. Periksa jaringan dan alamat deployment.');
  return code;
}
async function call(key, address, method, args = []) {
  const data = iface.encodeFunctionData(method, args);
  const result = await read(key, 'eth_call', [{ to: address, data }, 'latest']);
  return iface.decodeFunctionResult(method, result);
}
function accountRecords() { return records[`${selected()}:${account?.toLowerCase()}`] || {}; }

async function loadRecords() {
  if (!provider || !account) return;
  const key = selected(), address = contractAddress();
  await requireChain(key); await verifyCode(key, address);
  $('records').innerHTML = '<p class="empty">Membaca catatan dari blockchain...</p>';
  const [countResult, idsResult] = await Promise.all([
    call(key, address, 'proofCount', [account]), call(key, address, 'getProofIds', [account, 0, 100]),
  ]);
  const count = Number(countResult[0]); const ids = idsResult[0].map(Number);
  if (!ids.length) { $('records').innerHTML = '<p class="empty">Belum ada bukti tercatat untuk wallet ini.</p>'; return; }
  const local = accountRecords();
  const proofRows = await Promise.all(ids.reverse().map(async id => {
    const result = await call(key, address, 'getProof', [id]);
    const proof = result[0]; return { id, proof, local: local[id] };
  }));
  $('records').replaceChildren();
  if (count > 100) { const note = document.createElement('p'); note.className = 'hint'; note.textContent = `Menampilkan 100 dari ${count} catatan terbaru.`; $('records').append(note); }
  for (const row of proofRows) {
    const item = document.createElement('article'); item.className = 'record';
    const heading = document.createElement('h3'); heading.textContent = row.local?.metadata?.title || `Bukti #${row.id}`;
    const detail = document.createElement('p'); detail.textContent = row.local?.metadata?.issuer || 'Metadata tidak ada di browser ini. Pemilik bisa membuka tautan data bukti.';
    const hash = document.createElement('code'); hash.textContent = row.proof.metadataHash;
    const date = document.createElement('p'); date.className = 'hint'; date.textContent = `#${row.id} · Dicatat ${new Date(Number(row.proof.recordedAt) * 1000).toLocaleString('id-ID')}`;
    const actions = document.createElement('div'); actions.className = 'actions';
    if (row.local) { const link = document.createElement('button'); link.className = 'secondary'; link.type = 'button'; link.textContent = 'Salin tautan verifikasi'; link.onclick = () => copyProof(row.id, row.local.metadata, row.proof); actions.append(link); }
    const explorer = document.createElement('a'); explorer.className = 'secondary link-button'; explorer.target = '_blank'; explorer.rel = 'noopener noreferrer'; explorer.href = `${getNetwork(key).explorer}/address/${address}`; explorer.textContent = 'Lihat contract'; actions.append(explorer);
    item.append(heading, detail, date, hash, actions); $('records').append(item);
  }
}

function envelopeFor(id, metadata, proof) {
  return { v: 1, network: selected(), chainId: getNetwork(selected()).chainId, contract: contractAddress(), id, owner: account, metadata, metadataHash: proof.metadataHash, documentHash: proof.documentHash, transactionHash: accountRecords()[id]?.transactionHash || null };
}
async function copyProof(id, metadata, proof) {
  const data = encodeEnvelope(envelopeFor(id, metadata, proof));
  const url = new URL('/passport.html', location.origin); url.searchParams.set('data', data);
  if (data.length > 11000 || url.href.length > 16000) { downloadJson(envelopeFor(id, metadata, proof), `proofpass-${id}.json`); throw new Error('Tautan terlalu panjang. Data JSON diunduh sebagai alternatif.'); }
  await navigator.clipboard.writeText(url.href); $notice('Tautan verifikasi tersalin. Siapa pun yang membukanya dapat melihat metadata yang disertakan.');
}
function downloadJson(data, name) { const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }

async function sha256File(file) {
  if (file.size > 5 * 1024 * 1024) throw new Error('Ukuran file maksimal 5 MB.');
  const allowed = ['application/pdf', 'image/png', 'image/jpeg'];
  if (!allowed.includes(file.type)) throw new Error('File harus PDF, PNG, atau JPG.');
  return sha256(hexlify(new Uint8Array(await file.arrayBuffer())));
}
function showReview(metadata, metadataHash, key, address) {
  $('review').hidden = false;
  const lines = [
    `Jaringan: ${getNetwork(key).name}`, `Contract: ${address}`, `Judul: ${metadata.title}`,
    `Penerbit tertulis: ${metadata.issuer || '(kosong)'}`, `Tanggal klaim: ${metadata.date || '(kosong)'}`,
    `Ringkasan publik: ${metadata.summary || '(kosong)'}`, `Skill: ${metadata.skills.join(', ') || '(kosong)'}`,
    `SHA-256 file: ${metadata.documentHash || '(tanpa file)'}`, `Hash metadata: ${metadataHash}`,
    'Konten file tidak diunggah; hanya hash yang dicatat on-chain.', 'Penerbit dan isi sertifikat tidak diverifikasi oleh ProofPass.',
  ];
  $('review').replaceChildren(); const title = document.createElement('strong'); title.textContent = 'Periksa data sebelum meminta transaksi MetaMask';
  const list = document.createElement('ul'); for (const line of lines) { const li = document.createElement('li'); li.textContent = line; list.append(li); }
  $('review').append(title, list); $('submit').textContent = 'Kirim transaksi pencatatan';
  pendingProof = { metadata, metadataHash, key, address };
}

async function inspectSharedLink() {
  const encoded = new URLSearchParams(location.search).get('data');
  if (!encoded) return;
  $('viewer').hidden = false; $('workspace').hidden = true;
  try {
    const data = decodeEnvelope(encoded); viewed = data;
    if (!Object.hasOwn(NETWORKS, data.network) || data.chainId !== getNetwork(data.network).chainId || !/^0x[0-9a-f]{40}$/i.test(data.contract) || !Number.isSafeInteger(data.id) || data.id < 1) throw new Error('Jaringan, alamat, atau ID bukti pada tautan tidak valid.');
    const canonical = normalizeMetadata(data.metadata); const computed = keccak256(toUtf8Bytes(JSON.stringify(canonical)));
    if (computed.toLowerCase() !== data.metadataHash?.toLowerCase()) throw new Error('Hash metadata tidak cocok dengan data pada tautan.');
    const [chain, genesis] = await Promise.all([read(data.network, 'eth_chainId'), read(data.network, 'eth_getBlockByNumber', ['0x0', false])]);
    if (BigInt(chain) !== BigInt(data.chainId) || genesis?.hash?.toLowerCase() !== getNetwork(data.network).genesis) throw new Error('Identitas jaringan dari RPC resmi tidak cocok.');
    if (!artifact) throw new Error('Artifact kontrak belum tersedia. Jalankan npm run compile.');
    await verifyCode(data.network, data.contract);
    const result = await call(data.network, data.contract, 'getProof', [data.id]); const proof = result[0];
    const checks = [
      ['Metadata', proof.metadataHash.toLowerCase() === computed.toLowerCase() ? 'Hash cocok' : 'Hash tidak cocok'],
      ['Wallet pencatat', proof.recorder.toLowerCase() === data.owner?.toLowerCase() ? proof.recorder : 'Wallet berbeda'],
      ['File', proof.hasDocument ? 'Hash file tercatat; pilih file untuk mencocokkan.' : 'Tidak ada file pada catatan'],
      ['Penerbit', 'Tidak diverifikasi oleh ProofPass'],
    ];
    $('verification').replaceChildren();
    for (const [label, value] of checks) { const div = document.createElement('div'); const strong = document.createElement('strong'); strong.textContent = label; const span = document.createElement('span'); span.textContent = value; div.append(strong, span); $('verification').append(div); }
    $('viewer-title').textContent = 'Data dan catatan blockchain cocok';
    if (proof.metadataHash.toLowerCase() !== computed.toLowerCase() || proof.recorder.toLowerCase() !== data.owner?.toLowerCase() || proof.documentHash.toLowerCase() !== (data.documentHash || `0x${'0'.repeat(64)}`).toLowerCase()) throw new Error('Detail pada tautan tidak cocok dengan catatan di blockchain.');
    const box = document.createElement('div'); box.className = 'shared-details';
    for (const [label, value] of [['Pencapaian', canonical.title], ['Penerbit tertulis', canonical.issuer || '—'], ['Tanggal', canonical.date || '—'], ['Ringkasan', canonical.summary || '—'], ['Skill', canonical.skills.join(', ') || '—'], ['Wallet', proof.recorder], ['Dicatat pada', new Date(Number(proof.recordedAt) * 1000).toLocaleString('id-ID')], ['Hash dokumen', proof.hasDocument ? proof.documentHash : 'Tidak ada']]) { const p = document.createElement('p'); const b = document.createElement('strong'); b.textContent = `${label}: `; p.append(b, document.createTextNode(value)); box.append(p); }
    $('proof-view').replaceChildren(box);
    $('verify-file').disabled = !proof.hasDocument;
    $('copy-view').onclick = async () => { await navigator.clipboard.writeText(location.href); $notice('Tautan bukti tersalin.'); };
    $('verify-file').onchange = async event => { const file = event.target.files?.[0]; if (!file) return; const digest = await sha256File(file); if (digest.toLowerCase() === proof.documentHash.toLowerCase()) $notice('File cocok byte-per-byte dengan hash yang tercatat di blockchain.'); else $notice('File tidak cocok dengan hash yang tercatat.', true); };
  } catch (error) { $('viewer-title').textContent = 'Bukti belum dapat diverifikasi'; $notice(error.message, true); }
}

$('connect').onclick = async () => {
  if (busy) return; busy = true; $('connect').disabled = true;
  try {
    provider = getProvider(); walletHooks();
    const accounts = await provider.request({ method: 'eth_requestAccounts' }); account = accounts[0];
    if (!account) throw new Error('MetaMask tidak memberikan akses akun.');
    $('wallet-state').textContent = account; $('workspace').hidden = false;
    $('contract').value = localStorage.getItem(`proofpass.contract.${selected()}`) || '';
    $notice('Wallet tersambung. Pilih jaringan, masukkan alamat deployment, lalu muat catatan.');
    if ($('contract').value) await loadRecords();
  } catch (error) { $notice(friendlyError(error), true); } finally { busy = false; $('connect').disabled = false; }
};
$('network').onchange = async () => { if (provider) { $('contract').value = localStorage.getItem(`proofpass.contract.${selected()}`) || ''; if ($('contract').value) await loadRecords().catch(e => $notice(e.message, true)); } };
$('contract').onchange = () => { try { localStorage.setItem(`proofpass.contract.${selected()}`, contractAddress()); } catch {} };
$('switch').onclick = async () => { try { await switchWallet(provider, selected(), walletParameters(selected())); await requireChain(); } catch (error) { $notice(friendlyError(error), true); } };
$('refresh').onclick = () => loadRecords().catch(error => $notice(error.message, true));
$('proof-form').onsubmit = async event => {
  event.preventDefault(); if (busy) return;
  try {
    if (!pendingProof) {
      const key = selected(), address = contractAddress(); await requireChain(key); await verifyCode(key, address);
      const file = $('document').files?.[0]; const documentHash = file ? await sha256File(file) : null;
      const metadata = normalizeMetadata({ title: $('title').value, issuer: $('issuer').value, date: $('date').value, summary: $('summary').value, skills: $('skills').value, documentHash });
      const metadataHash = keccak256(toUtf8Bytes(JSON.stringify(metadata)));
      showReview(metadata, metadataHash, key, address); $notice('Review data publik di atas. Centang persetujuan, lalu klik kirim untuk meminta transaksi di MetaMask.'); return;
    }
    if (!$('consent').checked) throw new Error('Centang persetujuan setelah memeriksa ringkasan publik.');
    busy = true; $('submit').disabled = true;
    const p = pendingProof; await requireChain(p.key); await verifyCode(p.key, p.address);
    const documentHash = p.metadata.documentHash || `0x${'0'.repeat(64)}`;
    const data = iface.encodeFunctionData('registerProof', [p.metadataHash, documentHash, Boolean(p.metadata.documentHash)]);
    const gas = await read(p.key, 'eth_estimateGas', [{ from: account, to: p.address, data }]);
    const balance = BigInt(await provider.request({ method: 'eth_getBalance', params: [account, 'latest'] }));
    const price = BigInt(await read(p.key, 'eth_gasPrice'));
    if (balance < BigInt(gas) * price) throw new Error(`Saldo BOT tidak cukup untuk gas di ${getNetwork(p.key).name}.`);
    $notice(`Estimasi ${formatEther(BigInt(gas) * price)} BOT untuk gas. Periksa dan setujui transaksi di MetaMask.`);
    const txHash = await provider.request({ method: 'eth_sendTransaction', params: [{ from: account, to: p.address, data, value: '0x0' }] });
    if (!/^0x[0-9a-f]{64}$/i.test(txHash)) throw new Error('Hash transaksi dari wallet tidak valid. Periksa aktivitas MetaMask sebelum mencoba ulang.');
    const key = `${p.key}:${account.toLowerCase()}`; records[key] ||= {}; records[key]._pending = { transactionHash: txHash, metadata: p.metadata, metadataHash: p.metadataHash, contract: p.address }; save();
    $notice(`Transaksi ${txHash} dikirim. Menunggu konfirmasi...`);
    let receipt;
    for (let i = 0; i < 40; i++) { receipt = await read(p.key, 'eth_getTransactionReceipt', [txHash]); if (receipt) break; await new Promise(resolve => setTimeout(resolve, 3000)); }
    if (!receipt) { pendingProof = null; throw new Error(`Transaksi masih pending. Hash: ${txHash}. Klik Muat ulang setelah konfirmasi.`); }
    if (receipt.status !== '0x1') throw new Error('Transaksi gagal di blockchain. Periksa transaksi di explorer.');
    const event = receipt.logs.map(log => { try { return iface.parseLog(log); } catch { return null; } }).find(log => log?.name === 'ProofRegistered' && log.args.recorder.toLowerCase() === account.toLowerCase() && log.args.metadataHash.toLowerCase() === p.metadataHash.toLowerCase());
    if (!event) throw new Error(`Receipt sukses, tetapi event ProofRegistered yang cocok tidak ditemukan. Tx: ${txHash}`);
    const id = Number(event.args.proofId); const onchain = (await call(p.key, p.address, 'getProof', [id]))[0];
    if (onchain.metadataHash.toLowerCase() !== p.metadataHash.toLowerCase() || onchain.documentHash.toLowerCase() !== documentHash.toLowerCase() || onchain.recorder.toLowerCase() !== account.toLowerCase()) throw new Error('Data receipt tidak cocok dengan data bukti yang disiapkan.');
    records[key][id] = { transactionHash: txHash, contract: p.address, metadata: p.metadata, metadataHash: p.metadataHash }; delete records[key]._pending; save();
    pendingProof = null; $('review').hidden = true; $('proof-form').reset(); $('submit').textContent = 'Periksa dan catat'; $('consent').checked = false;
    await loadRecords(); await copyProof(id, p.metadata, onchain);
    $notice(`Bukti #${id} terkonfirmasi di blockchain. Tautan verifikasi sudah disalin.`);
  } catch (error) { $notice(error.message || friendlyError(error), true); }
  finally { busy = false; $('submit').disabled = false; }
};
$('theme').onclick = () => { const dark = document.documentElement.dataset.theme !== 'dark'; document.documentElement.dataset.theme = dark ? 'dark' : 'light'; $('theme').textContent = dark ? 'Tema terang' : 'Tema gelap'; };
try { const response = await fetch('/artifact.json'); if (response.ok) artifact = await response.json(); } catch {}
await inspectSharedLink();
