import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { NETWORKS } from '../../shared/networks.mjs';

const artifact = JSON.parse(await readFile(new URL('../../artifacts/ProofPass.json', import.meta.url), 'utf8'));
const account = '0x' + '12'.repeat(20);
const contractAddress = '0x' + '34'.repeat(20);
const hash = '0x' + 'ab'.repeat(32);

async function mockWallet(page, options = {}) {
  const state = { receipt: null, rpcDown: false, ...options };
  await page.addInitScript(({ networks, account, hash, options }) => {
    const listeners = {};
    const s = { chain: options.chain || networks.testnet.hexId, account, sent: 0, reject: !!options.reject, wrongGenesis: !!options.wrongGenesis, requests: [] };
    const provider = {
      isMetaMask: true,
      on: (name, callback) => { listeners[name] = callback; },
      removeListener: name => { delete listeners[name]; },
      request: async ({ method, params }) => {
        s.requests.push({ method, params });
        if (method === 'eth_requestAccounts' && s.reject) throw { code: 4001 };
        if (method === 'eth_requestAccounts' || method === 'eth_accounts') return [s.account];
        if (method === 'eth_chainId') return s.chain;
        if (method === 'eth_getBlockByNumber') return { hash: s.wrongGenesis ? '0x' + 'ff'.repeat(32) : Object.values(networks).find(n => n.hexId === s.chain)?.genesis || '0x' + '11'.repeat(32) };
        if (method === 'wallet_switchEthereumChain') { s.chain = params[0].chainId; listeners.chainChanged?.(s.chain); return null; }
        if (method === 'eth_sendTransaction') { if (s.reject) throw { code: 4001 }; s.sent++; return hash; }
        throw new Error(method);
      },
    };
    window.__wallet = s;
    window.__changeAccount = next => { s.account = next; listeners.accountsChanged?.([next]); };
    window.ethereum = provider;
    window.addEventListener('eip6963:requestProvider', () => window.dispatchEvent(new CustomEvent('eip6963:announceProvider', { detail: { info: { uuid: 'test-metamask', rdns: 'io.metamask', name: 'MetaMask' }, provider } })));
  }, { networks: NETWORKS, account, hash, options });
  await page.route('**/api/rpc/*', async route => {
    if (state.rpcDown) return route.fulfill({ status: 502, json: { error: 'RPC unavailable in test' } });
    const n = NETWORKS[route.request().url().split('/').at(-1)];
    const { method } = route.request().postDataJSON();
    const result = {
      eth_chainId: n.hexId,
      eth_getBlockByNumber: { hash: n.genesis },
      eth_getBalance: n.key === 'testnet' ? '0x8ac7230489e80000' : '0x0',
      eth_estimateGas: '0x7a120', eth_gasPrice: '0x3b9aca00',
      eth_getTransactionReceipt: state.receipt,
      eth_getTransactionByHash: { from: account, to: null, input: artifact.bytecode },
      eth_getCode: artifact.deployedBytecode,
    }[method];
    await route.fulfill({ json: { result } });
  });
  return state;
}

async function connect(page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Hubungkan MetaMask', exact: true }).click();
}

test('without wallet gives an actionable error; source and themes work', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Hubungkan MetaMask', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('MetaMask belum ditemukan');
  await expect(page.locator('#deploy')).toBeDisabled();
  await page.getByRole('button', { name: 'Tema gelap' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Tema terang' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  const source = await page.request.get('/ProofPass.sol');
  expect(await source.text()).toContain('contract ProofPass');
  expect(errors).toEqual([]);
});

test('reads independent balances and corrects a per-site Ethereum chain', async ({ page }) => {
  await mockWallet(page, { chain: '0x1' });
  await connect(page);
  await expect(page.locator('#balance-testnet')).toHaveText('10.0 BOT');
  await expect(page.locator('#balance-mainnet')).toHaveText('0.0 BOT');
  await expect(page.getByRole('status')).toContainText('Chain ID 1');
  await expect(page.locator('#deploy')).toBeDisabled();
  await page.getByRole('button', { name: 'Pilih jaringan ini di MetaMask' }).click();
  await expect(page.locator('#network-status')).toContainText('blok awal cocok');
  await expect(page.locator('#wallet-chain')).toHaveText('968 (0x3c8)');
  expect(await page.evaluate(() => window.__wallet.sent)).toBe(0);
  await page.getByRole('button', { name: 'Cek ulang koneksi & saldo' }).click();
  await expect(page.getByRole('status')).toContainText('Pemeriksaan selesai');
});

test('same chain ID with a different genesis cannot deploy', async ({ page }) => {
  await mockWallet(page, { wrongGenesis: true });
  await connect(page);
  await expect(page.getByRole('status')).toContainText('blockchain berbeda');
  await page.getByRole('button', { name: 'Periksa biaya deploy' }).click();
  await expect(page.getByRole('status')).toContainText('blockchain berbeda');
  await expect(page.locator('#deploy')).toBeDisabled();
  expect(await page.evaluate(() => window.__wallet.sent)).toBe(0);
});

test('deploy requires review, survives refresh, checks runtime and exports receipt', async ({ page }) => {
  const state = await mockWallet(page);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await connect(page);
  await expect(page.locator('#network-status')).toContainText('blok awal cocok');
  await page.getByRole('button', { name: 'Periksa biaya deploy' }).click();
  await expect(page.locator('#fee')).toContainText('0.0006 BOT');
  await expect(page.locator('#deploy')).toBeDisabled();
  await page.locator('#confirm').check();
  await page.getByRole('button', { name: 'Kirim permintaan deploy' }).click();
  await expect(page.locator('#receipt-status')).toContainText('Menunggu konfirmasi');
  expect(await page.evaluate(() => window.__wallet.sent)).toBe(1);
  const tx = await page.evaluate(() => window.__wallet.requests.find(r => r.method === 'eth_sendTransaction').params[0]);
  expect(tx.chainId).toBe('0x3c8'); expect(tx.value).toBe('0x0'); expect(tx.data).toBe(artifact.bytecode);
  await page.reload();
  await expect(page.locator('#receipt-status')).toContainText('Menunggu konfirmasi');
  expect(await page.evaluate(() => window.__wallet.sent)).toBe(0);
  state.receipt = { status: '0x1', contractAddress, blockNumber: '0x123', gasUsed: '0x10000' };
  await page.getByRole('button', { name: 'Cek status transaksi' }).click();
  await expect(page.locator('#receipt-status')).toContainText('Deployment berhasil');
  await expect(page.locator('#contract-address')).toHaveText(contractAddress);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Unduh catatan deployment' }).click();
  expect((await downloadPromise).suggestedFilename()).toContain('proofpass-testnet');
  expect(errors).toEqual([]);
});

test('account change invalidates prepared transaction and checkbox', async ({ page }) => {
  await mockWallet(page);
  await connect(page);
  await page.getByRole('button', { name: 'Periksa biaya deploy' }).click();
  await page.locator('#confirm').check();
  await page.evaluate(() => window.__changeAccount('0x' + '56'.repeat(20)));
  await expect(page.locator('#deploy')).toBeDisabled();
  await expect(page.locator('#confirm')).not.toBeChecked();
  expect(await page.evaluate(() => window.__wallet.sent)).toBe(0);
});

test('wallet rejection returns a useful message and sends nothing', async ({ page }) => {
  await mockWallet(page, { reject: true });
  await connect(page);
  await expect(page.getByRole('status')).toContainText('dibatalkan');
  await expect(page.locator('#deploy')).toBeDisabled();
  expect(await page.evaluate(() => window.__wallet.sent)).toBe(0);
});

test('mainnet requires completed testnet and cannot use the testnet balance', async ({ page }) => {
  await mockWallet(page);
  await connect(page);
  await page.locator('#network').selectOption('mainnet');
  await expect(page.locator('#mainnet-note')).toBeVisible();
  await page.getByRole('button', { name: 'Pilih jaringan ini di MetaMask' }).click();
  await expect(page.locator('#wallet-chain')).toHaveText('677 (0x2a5)');
  await page.getByRole('button', { name: 'Periksa biaya deploy' }).click();
  await expect(page.getByRole('status')).toContainText('Selesaikan deployment testnet');
  expect(await page.evaluate(() => window.__wallet.sent)).toBe(0);
});

test('RPC outage is not displayed as a zero balance or successful deployment', async ({ page }) => {
  await mockWallet(page, { rpcDown: true });
  await connect(page);
  await expect(page.locator('#balance-testnet')).toContainText('Belum dapat dibaca');
  await expect(page.getByRole('status')).toContainText('RPC unavailable');
  await expect(page.locator('#deploy')).toBeDisabled();
});

test('transaction restore validates hash and verifies a real matching fixture', async ({ page }) => {
  const state = await mockWallet(page);
  await connect(page);
  await page.locator('summary').click();
  await page.locator('#restore-hash').fill('wrong');
  await page.getByRole('button', { name: 'Periksa transaksi ini' }).click();
  await expect(page.getByRole('status')).toContainText('64 karakter');
  state.receipt = { status: '0x1', contractAddress, blockNumber: '0x123', gasUsed: '0x10000' };
  await page.locator('#restore-hash').fill(hash);
  await page.getByRole('button', { name: 'Periksa transaksi ini' }).click();
  await expect(page.locator('#receipt-status')).toContainText('Deployment berhasil');
  expect(await page.evaluate(() => window.__wallet.sent)).toBe(0);
});

test('mobile, desktop, both themes and keyboard focus remain usable', async ({ page }) => {
  await mockWallet(page);
  await connect(page);
  await expect(page.locator('#balance-testnet')).toHaveText('10.0 BOT');
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ['dark', 'light']) {
      await page.locator('#theme').click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `test-results/proofpass-${width}-${theme}.png`, fullPage: true });
    }
  }
  await page.locator('#connect').focus();
  await page.keyboard.press('Tab');
  await expect(page.locator('#check')).toBeFocused();
  expect(await page.locator('#check').evaluate(el => getComputedStyle(el).outlineStyle)).toBe('solid');
});
