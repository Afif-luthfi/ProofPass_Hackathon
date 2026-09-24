const clean = (value, max) => String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, max);

export function normalizeMetadata(input) {
  const title = clean(input.title, 120);
  if (!title) throw new Error('Judul bukti wajib diisi.');
  const date = clean(input.date, 10);
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Tanggal harus memakai format YYYY-MM-DD.');
  const skills = [...new Set(String(input.skills ?? '').split(/[\n,]/).map(v => clean(v, 40)).filter(Boolean))].slice(0, 12);
  return { v: 1, title, issuer: clean(input.issuer, 120), date, summary: clean(input.summary, 700), skills, documentHash: input.documentHash || null };
}

export function encodeEnvelope(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function decodeEnvelope(value) {
  if (typeof value !== 'string' || value.length > 12000 || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Tautan bukti tidak valid atau terlalu panjang.');
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  const parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  if (!parsed || parsed.v !== 1 || typeof parsed.metadata !== 'object' || typeof parsed.contract !== 'string') throw new Error('Format tautan bukti tidak didukung.');
  return parsed;
}
