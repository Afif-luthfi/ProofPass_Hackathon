# Memeriksa wallet dan deploy ProofPass

## Mulai

1. Buka http://127.0.0.1:4173 pada browser yang memiliki MetaMask. Gunakan profil browser yang sama dengan wallet kamu.
2. Klik **Hubungkan MetaMask** dan setujui koneksi situs lokal. Ini belum mengirim transaksi.
3. Lihat **Chain ID dari wallet**, **saldo testnet**, dan **saldo mainnet**. Hasil saldo dibaca langsung dari masing-masing RPC resmi.

Jika halaman tidak bisa dibuka, jalankan `npm start` dari folder proyek. Server hanya berjalan pada komputer ini. Jika MetaMask tidak ditemukan di browser dalam aplikasi Codex, salin URL ke browser yang tadi dipakai untuk Remix.

## Memahami hasil pemeriksaan

| Hasil | Makna dan langkah berikutnya |
|---|---|
| Chain ID 1 | Situs ini masih terhubung ke Ethereum. Pilih testnet lalu klik **Pilih jaringan ini di MetaMask**. |
| Chain ID 968 dan blok awal cocok | Wallet terhubung ke BOT Chain Testnet sesuai RPC yang diperiksa. |
| Chain ID 677 dan blok awal cocok | Wallet terhubung ke BOT Chain Mainnet sesuai RPC yang diperiksa. |
| Chain ID sama, blockchain berbeda | Buka pengaturan jaringan MetaMask dan periksa RPC. ID saja belum cukup. |
| Testnet berisi 10 BOT, mainnet nol | Saldo testnet terpisah; minta alokasi mainnet ke panitia saat diperlukan. |
| RPC tidak bisa dibaca | Saldo belum diketahui. Jangan mengartikan kegagalan koneksi sebagai saldo nol. |

Konfigurasi resmi testnet: RPC `https://rpc.bohr.life`, Chain ID `968`, simbol `BOT`, explorer `https://scan.bohr.life`.

Konfigurasi resmi mainnet: RPC `https://rpc.botchain.ai`, Chain ID `677`, simbol `BOT`, explorer `https://scan.botchain.ai`.

Label atau simbol ETH di Remix bukan bukti tunggal bahwa jaringan salah. Filter token MetaMask juga belum tentu menentukan jaringan yang aktif untuk situs. Peringatan nama jaringan Datagram belum terbukti menyebabkan masalah Remix; alat ini memeriksa jawaban wallet secara langsung.

## Deploy ke testnet

1. Pilih **BOT Chain Testnet (968)**.
2. Klik **Pilih jaringan ini di MetaMask**, lalu setujui jika diminta.
3. Pastikan identitas jaringan cocok dan saldo cukup. Faucet resmi: https://faucet.botchain.ai/basic.
4. Klik **Periksa biaya deploy**. Tidak ada transaksi yang dikirim pada langkah ini.
5. Periksa biaya serta jaringan, lalu centang persetujuan.
6. Klik **Kirim permintaan deploy**. Di MetaMask, periksa jaringan dan gas sebelum mengonfirmasi. Nilai kiriman contract adalah 0 BOT; gas tetap dibayar.
7. Klik **Cek status transaksi** sampai receipt tersedia. Jika pending, jangan deploy ulang.
8. Setelah berhasil dan bytecode cocok, klik **Unduh catatan deployment**.

Halaman menyimpan hash transaksi agar refresh tidak mengirim ulang. Jika halaman kehilangan catatan, buka **Pulihkan transaksi dengan hash**, hubungkan wallet pengirim, pilih jaringan yang benar, dan tempel hash dari aktivitas MetaMask. Jangan langsung mengulang deploy jika permintaan sebelumnya sudah disetujui tetapi halaman kehilangan koneksi.

## Setelah testnet

Pengujian contract lokal sudah disediakan, tetapi pemakaian testnet melalui wallet kamu tetap perlu dikonfirmasi. Untuk mainnet, halaman memerlukan deployment testnet dari build yang sama terlebih dahulu. Mainnet memakai saldo dan biaya gas mainnet; hubungi panitia untuk alokasi BOT bila saldonya kosong.

Simpan alamat dan hash transaksi kedua jaringan ke bagian Deployment pada README. Deploy contract saja belum menyelesaikan aplikasi ProofPass: frontend passport, AI dan metadata persisten masih merupakan pekerjaan berikutnya.
