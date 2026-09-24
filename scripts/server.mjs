import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { rpc } from './rpc.mjs';

const root = new URL('../', import.meta.url);
const routes = {
  '/': ['web/index.html', 'text/html; charset=utf-8'],
  '/app.mjs': ['web/app.mjs', 'text/javascript'],
  '/style.css': ['web/style.css', 'text/css'],
  '/shared/networks.mjs': ['shared/networks.mjs', 'text/javascript'],
  '/shared/guards.mjs': ['shared/guards.mjs', 'text/javascript'],
  '/shared/deploy.mjs': ['shared/deploy.mjs', 'text/javascript'],
  '/artifact.json': ['artifacts/ProofPass.json', 'application/json'],
  '/ProofPass.sol': ['contracts/ProofPass.sol', 'text/plain; charset=utf-8'],
  '/vendor/ethers.js': ['node_modules/ethers/dist/ethers.min.js', 'text/javascript'],
};
const hex = /^0x[0-9a-f]+$/i;
const address = /^0x[0-9a-f]{40}$/i;
const hash = /^0x[0-9a-f]{64}$/i;
const tag = v => v === 'latest' || v === 'pending' || (typeof v === 'string' && hex.test(v));

export function validReadRequest(method, params) {
  if (!Array.isArray(params)) return false;
  if (['eth_chainId', 'eth_blockNumber', 'eth_gasPrice'].includes(method)) return params.length === 0;
  if (method === 'eth_getBlockByNumber') return params.length === 2 && tag(params[0]) && params[1] === false;
  if (['eth_getBalance', 'eth_getCode', 'eth_getTransactionCount'].includes(method)) return params.length === 2 && address.test(params[0]) && tag(params[1]);
  if (['eth_getTransactionReceipt', 'eth_getTransactionByHash'].includes(method)) return params.length === 1 && hash.test(params[0]);
  if (method === 'eth_estimateGas') {
    const tx = params[0];
    return params.length === 1 && tx && typeof tx === 'object' && !Array.isArray(tx)
      && Object.keys(tx).every(k => ['from', 'data', 'value'].includes(k))
      && address.test(tx.from) && typeof tx.data === 'string' && hex.test(tx.data)
      && tx.data.length % 2 === 0 && tx.data.length < 50000 && tx.value === '0x0';
  }
  return false;
}

export function createAppServer() {
  return createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
    const json = (status, value) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(value)); };
    if (!/^(127\.0\.0\.1|localhost):\d+$/.test(req.headers.host ?? '')) return json(403, { error: 'Local host only' });
    if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) return json(403, { error: 'Origin not allowed' });
    if (req.headers['sec-fetch-site'] === 'cross-site') return json(403, { error: 'Cross-site access not allowed' });
    const url = new URL(req.url, `http://${req.headers.host}`);
    try {
      const match = url.pathname.match(/^\/api\/rpc\/(testnet|mainnet)$/);
      if (req.method === 'POST' && match) {
        let body = '';
        for await (const chunk of req) {
          body += chunk;
          if (body.length > 60000) return json(413, { error: 'Request too large' });
        }
        const { method, params = [] } = JSON.parse(body);
        if (!validReadRequest(method, params)) return json(400, { error: 'Only supported read/simulation requests are allowed' });
        const result = await rpc(match[1], method, params);
        return json(200, { result });
      }
      if (req.method !== 'GET') return json(405, { error: 'Method not allowed' });
      if (url.pathname === '/favicon.ico') { res.writeHead(204); return res.end(); }
      const route = routes[url.pathname];
      if (!route) return json(404, { error: 'Not found' });
      const data = await readFile(new URL(route[0], root));
      res.writeHead(200, { 'Content-Type': route[1] });
      res.end(data);
    } catch (error) {
      json(error instanceof SyntaxError ? 400 : 502, { error: error.code === 'ENOENT' ? 'File belum tersedia. Jalankan npm run compile.' : error.message });
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PROOFPASS_PORT || 4173);
  const server = createAppServer();
  server.on('error', error => { console.error(error.message); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => console.log(`ProofPass wallet & deploy: http://127.0.0.1:${port}`));
}
