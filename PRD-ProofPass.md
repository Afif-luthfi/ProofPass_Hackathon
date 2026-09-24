# PRD ProofPass

Versi: 1.0
Tanggal: 24 September 2026
Status: spesifikasi MVP hackathon; belum merupakan fitur yang sudah dibangun
Target: Build Week Hackathon Vol.2 — BOT Chain

## 1. Ringkasan produk

ProofPass membantu mahasiswa dan peserta pelatihan menyusun pencapaian beserta bukti pendukung menjadi profil skill yang dapat dibagikan. AI membantu membaca dokumen dan menyusun informasi. Pengguna meninjau hasilnya, lalu mencatat hash bukti di BOT Chain melalui wallet mereka.

Pengunjung dapat melihat profil dan memeriksa apakah suatu file sama dengan file yang didaftarkan. Status bukti harus menjelaskan secara tepat apa yang sudah diperiksa. Pencatatan blockchain tidak membuktikan bahwa pencapaian benar, pemilik wallet adalah penerima sertifikat, atau penerbit dokumen asli.

Keputusan cakupan: MVP berfokus pada pencatatan dan pemeriksaan integritas bukti. Konfirmasi oleh institusi penerbit menjadi pengembangan berikutnya.

## 2. Masalah dan hipotesis

Pencapaian pengguna tersebar di sertifikat, folder penyimpanan, dan teks CV. Orang yang meninjaunya perlu memahami konteks serta menemukan bukti pendukung. File juga dapat berubah setelah dibagikan.

Hipotesis yang perlu divalidasi:

- Peserta bersedia merapikan pencapaian jika hasilnya menjadi satu tautan profil yang berguna.
- Pemeriksa menghargai akses cepat ke bukti dan penjelasan status pemeriksaannya.
- Penyelenggara tertarik menerbitkan atau mengonfirmasi credential pada versi selanjutnya.

Hipotesis tersebut belum merupakan bukti permintaan pasar. Keberhasilan demo hackathon dan adopsi produk diukur terpisah.

## 3. Pengguna sasaran

| Pengguna | Kebutuhan | Peran MVP |
|---|---|---|
| Mahasiswa/peserta bootcamp atau hackathon | Mengumpulkan pencapaian dan membagikan bukti | Membuat dan membagikan passport |
| Recruiter, mentor, atau reviewer | Membaca pencapaian dan memeriksa kecocokan dokumen | Membuka profil tanpa wallet |
| Penyelenggara kegiatan | Mengonfirmasi credential yang diterbitkan | Sasaran validasi dan roadmap |

Kasus penggunaan pertama: peserta mencatat sertifikat penyelesaian kegiatan dan membagikan halaman bukti. ProofPass tidak menjadi platform rekrutmen atau pengganti LinkedIn pada MVP.

## 4. Tujuan dan non-tujuan

Tujuan MVP:

1. Satu alur lengkap dari dokumen ke transaksi BOT Chain yang berhasil.
2. Informasi pencapaian yang dapat diperiksa dan diperbaiki sebelum dicatat.
3. Profil publik yang dapat dibuka di perangkat lain tanpa login atau wallet.
4. Pemeriksaan file asli dan file berbeda dengan hasil yang jelas.
5. Pemisahan eksplisit antara klaim pengguna, saran AI, dan bukti pencatatan.

Di luar MVP: NFT, token insentif, pembayaran, penilaian kemampuan, ranking kandidat, marketplace, integrasi LinkedIn/GitHub, verifikasi identitas pemilik, validasi tanda tangan PDF, pemeriksaan otomatis situs penerbit, dan issuer attestation.

## 5. Alur utama

1. Pengguna membuka dashboard dan menghubungkan wallet.
2. Pengguna membuat pencapaian lewat teks, PDF, JPG, atau PNG.
3. Jika ada file, aplikasi menghitung hash dari byte file asli.
4. Pengguna dapat meminta AI membaca dokumen atau mengisi formulir manual.
5. Pengguna memeriksa judul, penerbit yang tercantum, tanggal, ringkasan, dan saran skill.
6. Aplikasi memperlihatkan data yang akan dipublikasikan serta menjelaskan bahwa dokumen tidak otomatis dipublikasikan.
7. Pengguna memilih “Catat di BOT Chain”, menyetujui transaksi wallet, dan menunggu konfirmasi.
8. Setelah transaksi berhasil, pencapaian muncul pada passport dengan tautan explorer.
9. Pengguna membagikan tautan profil atau halaman bukti.
10. Pengunjung memilih file di halaman bukti. Browser menghitung hash dan membandingkannya dengan catatan on-chain tanpa transaksi baru.

Pencapaian berbasis teks tetap diperbolehkan, tetapi tidak mempunyai pemeriksaan file jika tidak ada hash dokumen.

## 6. Ruang lingkup dan acceptance criteria

P0 wajib selesai untuk MVP. P1 dikerjakan hanya setelah P0 dan seluruh syarat submission terpenuhi.

| ID | Prioritas | Fitur | Acceptance criteria |
|---|---|---|---|
| F01 | P0 | Wallet dan jaringan | Wallet terhubung; alamat serta jaringan terlihat; aksi tulis meminta jaringan yang benar; penolakan pengguna tidak menghapus draft |
| F02 | P0 | Input manual | Pengguna dapat membuat pencapaian tanpa AI; judul wajib; panjang input dibatasi sebelum transaksi |
| F03 | P0 | Bukti dokumen | Satu PDF/JPG/PNG maksimal 5 MB; jenis dan ukuran salah ditolak; hash dihitung dari file asli |
| F04 | P0 | Ekstraksi AI | Hasil menjadi draft yang bisa diedit; field tak terbaca dibiarkan kosong; kegagalan AI menyediakan jalur manual |
| F05 | P0 | Review publikasi | Pengguna melihat field publik, saran AI, dan pilihan menghapus nama/data pribadi sebelum menyimpan |
| F06 | P0 | Pencatatan blockchain | Hash dokumen bila tersedia dan hash metadata dicatat oleh wallet aktif; sukses hanya ditampilkan setelah receipt berhasil |
| F07 | P0 | Pemulihan transaksi | Status pending, gagal, ditolak, dan berhasil berbeda; refresh tidak memicu transaksi ulang otomatis |
| F08 | P0 | Passport publik | Daftar pencapaian yang berhasil dicatat tersedia tanpa wallet di perangkat lain dan tetap ada setelah refresh |
| F09 | P0 | Halaman bukti | Menampilkan wallet pencatat, waktu blockchain, chain, ID catatan, hash, dan tautan transaksi |
| F10 | P0 | Pemeriksaan file | File identik menghasilkan “File cocok”; file berbeda menghasilkan “File berbeda”; pemeriksaan berjalan lokal tanpa gas |
| F11 | P0 | Gangguan data | RPC gagal menghasilkan status tidak dapat diperiksa, bukan status file berbeda; metadata hilang tidak menyembunyikan catatan on-chain |
| F12 | P0 | Publikasi hackathon | Domain aktif, branding dan tautan BOT Chain, pengumuman mainnet, README serta alamat deployment tersedia |
| F13 | P1 | QR dan salin tautan | QR membuka halaman bukti; tautan dapat disalin dengan umpan balik yang jelas |
| F14 | P1 | Pencarian profil | Pengguna dapat memfilter daftar pencapaian menurut judul atau skill |

## 7. Perilaku AI

Input: teks pengguna atau dokumen yang pengguna setujui untuk diproses layanan AI.

Output terstruktur: judul, nama penerima jika terbaca, nama penerbit jika terbaca, tanggal jika terbaca, ringkasan, skill yang disebut eksplisit, dan saran skill hasil inferensi.

Aturan:

- AI tidak menentukan keaslian sertifikat, validitas tanda tangan, atau tingkat kemampuan seseorang.
- Saran skill dibedakan dari skill yang tertulis pada dokumen; pengguna dapat menghapusnya.
- AI tidak mengarang nama penerbit, nomor sertifikat, tanggal, atau prestasi yang tidak ada di sumber.
- Semua hasil wajib ditinjau sebelum publikasi.
- Dokumen diperlakukan sebagai data, termasuk bila isinya mengandung instruksi kepada AI.
- API key hanya berada di server. Berikan batas pemakaian dan timeout; bila gagal, lanjutkan input manual.

## 8. Model kepercayaan dan bahasa status

Status tidak digabung menjadi satu badge “Verified”. Gunakan indikator terpisah agar satu keberhasilan tidak menyiratkan keberhasilan lain.

| Indikator | Arti | Ketersediaan |
|---|---|---|
| Klaim pengguna | Isi pencapaian berasal dari pengguna | MVP |
| Hash dokumen tercatat | Catatan menyertakan sidik jari dokumen | MVP |
| Tercatat di BOT Chain | Transaksi pencatatan telah berhasil | MVP |
| File cocok | File yang sedang diperiksa cocok dengan hash catatan | MVP, setelah pemeriksaan |
| Belum dikonfirmasi penerbit | Tidak ada pengesahan dari penerbit | MVP |
| Dikonfirmasi penerbit | Penerbit yang identitasnya telah diperiksa mengesahkan credential | Roadmap |

“File cocok” tidak ditampilkan hanya karena hash telah dibuat. Pemeriksaan terhadap file harus benar-benar dilakukan. “File berbeda” berarti byte file berbeda; aplikasi tidak boleh otomatis menyebutnya dokumen palsu.

Nama penerbit yang diekstrak adalah teks dari dokumen, bukan institusi yang sudah diautentikasi. Alamat wallet menunjukkan pencatat, bukan bukti identitas penerima sertifikat.

## 9. Halaman dan pengalaman pengguna

| Halaman | Isi utama | Aksi utama |
|---|---|---|
| Landing | Manfaat, contoh yang jelas berlabel contoh, cara kerja, batas verifikasi | Buat passport |
| Dashboard | Wallet aktif, draft, transaksi pending, pencapaian tercatat | Tambah pencapaian |
| Buat pencapaian | Input/file, analisis, review, ringkasan publikasi | Catat di BOT Chain |
| Passport publik | Identitas berbasis wallet dan daftar pencapaian | Buka bukti |
| Detail bukti | Metadata, indikator status, transaksi, pemeriksaan file | Periksa file |
| Pengumuman peluncuran | Pernyataan peluncuran di BOT Chain Mainnet dan tautan produk | Coba aplikasi |

UI berbahasa Inggris untuk demo dan evaluasi; PRD berbahasa Indonesia. Tampilan responsif, formulir memiliki label, dapat dipakai dengan keyboard, dan status tidak bergantung pada warna saja. Halaman publik tidak memaksa koneksi wallet.

State wajib: profil kosong, wallet tidak tersedia, jaringan salah, analisis berjalan, analisis gagal, menunggu konfirmasi wallet, transaksi pending, transaksi gagal, transaksi berhasil, RPC tidak tersedia, file cocok, dan file berbeda.

## 10. Data dan arsitektur

Arsitektur usulan, bukan keputusan framework final:

- Frontend: TypeScript dengan React; pustaka EVM untuk membaca contract dan meminta transaksi wallet.
- Backend kecil/serverless: memanggil AI, menyimpan metadata publik, dan melayani profil lintas perangkat.
- Penyimpanan persisten: metadata publik dan referensi transaksi. Local storage hanya untuk draft dan pemulihan lokal.
- Smart contract Solidity: pencatatan append-only pada BOT Chain.

Frontend statis dapat ditempatkan di GitHub Pages dengan domain sendiri sesuai alur guidebook. Endpoint AI dan penyimpanan berjalan terpisah. Pemilihan penyedia ditentukan saat implementasi.

### Data on-chain

ID catatan, wallet pencatat dari msg.sender, hash metadata, hash dokumen opsional beserta indikator keberadaannya, dan timestamp blockchain. Chain ID, alamat contract, dan ID catatan bersama-sama mengidentifikasi bukti secara unik.

Contract menyediakan pencatatan, pembacaan catatan, serta event untuk penelusuran pencapaian per wallet. Tidak ada penyimpanan dana pengguna atau fungsi mengubah catatan lama. Pengguna tetap memerlukan BOT untuk gas.

### Data off-chain

Judul, ringkasan, tanggal pencapaian yang diklaim, penerbit yang diklaim, skill, versi skema metadata, serta referensi catatan dan transaksi. Nama penerima bersifat opsional dan hanya dipublikasikan setelah review.

Metadata diserialisasi secara deterministik sebelum hashing. Pemeriksa dapat menghitung ulang hash metadata yang ditampilkan dan membandingkannya dengan contract. Algoritma serta format encoding didokumentasikan. Hash file menggunakan SHA-256 atas byte file asli, bukan teks hasil OCR.

Dokumen asli tidak disimpan permanen atau dibuka ke publik oleh aplikasi pada MVP. Untuk analisis AI, file boleh dikirim secara sementara setelah pemberitahuan pengguna; kebijakan retensi penyedia harus diperiksa saat memilih layanan. Pemeriksaan hash file berjalan lokal di browser. Reviewer perlu memiliki file yang dibagikan terpisah oleh pemilik.

### Konsistensi transaksi

1. Bekukan metadata hasil review dan simpan draft persisten sebelum meminta transaksi.
2. Hitung hash metadata dan dokumen.
3. Kirim transaksi dengan hash tersebut.
4. Setelah receipt berhasil, cocokkan event dengan wallet dan hash draft lalu tandai sebagai tercatat.
5. Jika penyimpanan atau indeks terlambat, rekonsiliasi dari receipt/event tanpa mengirim transaksi lagi.

Backend tidak boleh menetapkan pemilik hanya dari alamat yang dikirim form. Kepemilikan catatan bersumber dari contract. Endpoint mutasi privat, jika diperlukan, menggunakan autentikasi wallet bertanda tangan dengan nonce dan masa berlaku.

## 11. Konfigurasi BOT Chain

Nilai berikut berasal dari guidebook dan harus diperiksa kembali saat deployment.

| Konfigurasi | Testnet | Mainnet |
|---|---|---|
| Chain ID | 968 | 677 |
| RPC | https://rpc.bohr.life | https://rpc.botchain.ai |
| Explorer | https://scan.bohr.life | https://scan.botchain.ai |
| Token gas | BOT | BOT |

Alamat contract testnet dan mainnet disimpan dalam konfigurasi terpisah. Produk menunjukkan jaringan aktif dengan jelas. Faucet testnet: https://faucet.botchain.ai/basic. Alokasi BOT mainnet perlu dikoordinasikan dengan panitia.

## 12. Kebutuhan nonfungsional dan risiko

- Semua komunikasi layanan memakai HTTPS; tidak ada secret dalam frontend atau repository.
- Input, file, dan output AI divalidasi di batas layanan; teks pengguna tidak dirender sebagai HTML mentah.
- Jangan mencatat isi sertifikat atau data pribadi dalam log aplikasi.
- Metadata publik tidak dijanjikan sepenuhnya dapat dihapus jika pernah dibagikan; catatan on-chain tidak dapat dihapus dari blockchain.
- Profil tidak menghilang ketika pengguna berpindah browser. Penyimpanan persisten merupakan syarat P0.
- Kegagalan AI tidak menghalangi pencatatan manual. Kegagalan blockchain tidak ditutupi dengan tampilan sukses lokal.
- Waktu konfirmasi transaksi bergantung pada jaringan. UI menampilkan progres tanpa menjanjikan durasi pasti.

| Risiko | Penanganan |
|---|---|
| Klaim palsu dianggap sah | Pisahkan status pencatatan, kecocokan file, dan konfirmasi penerbit |
| AI menyimpulkan skill terlalu jauh | Tandai inferensi dan wajibkan review |
| Identitas pada sertifikat berbeda dari pemilik wallet | Jangan mengklaim keterkaitan identitas telah diverifikasi |
| File sensitif terpublikasi | Simpan hash saja; review metadata sebelum publikasi |
| Transaksi sukses tetapi profil belum diperbarui | Rekonsiliasi event/receipt dan sediakan tautan explorer |
| Demo terhambat gas atau jaringan | Siapkan saldo dan contoh catatan nyata; jelaskan bila memakai bukti yang sudah tercatat |
| Scope melebihi waktu | Tunda seluruh P1 dan roadmap; pertahankan alur manual sebagai fallback |

## 13. Skenario demo

Target narasi: sekitar dua menit, di luar variasi waktu konfirmasi jaringan.

1. Jelaskan masalah: pencapaian tersebar dan status buktinya tidak jelas.
2. Unggah sertifikat contoh milik tim yang diberi label demonstrasi.
3. Jalankan AI, tinjau hasil, dan tunjukkan bahwa skill masih dapat diedit.
4. Catat bukti melalui MetaMask di mainnet.
5. Buka passport publik dan tautan transaksi.
6. Periksa file asli: hasil “File cocok”.
7. Periksa salinan yang sudah diubah: hasil “File berbeda”.
8. Tunjukkan status “Belum dikonfirmasi penerbit” dan jelaskan batas produk.

Sediakan input manual jika AI tidak tersedia. Jangan menampilkan transaksi simulasi sebagai transaksi mainnet atau sertifikat contoh sebagai credential resmi.

## 14. Verifikasi dan ukuran keberhasilan

Gerbang kelulusan MVP:

- Pencatatan baru berhasil di testnet dan mainnet.
- Wallet kedua dapat membuat catatan miliknya sendiri.
- Passport dapat dibaca di sesi/perangkat lain tanpa wallet.
- Pemeriksaan file asli cocok dan file yang diubah berbeda.
- Metadata yang diubah setelah pencatatan terdeteksi tidak cocok.
- Penolakan wallet, jaringan salah, kegagalan AI, dan refresh saat pending ditangani tanpa sukses palsu atau transaksi ulang otomatis.
- Tidak ada badge yang menyatakan penerbit terverifikasi pada MVP.

Pengujian contract mencakup pemilik catatan dari msg.sender, penyimpanan hash yang tepat, ID unik, event, dan pembacaan catatan yang tidak ada. Pengujian integrasi mencakup hasil transaksi serta rekonsiliasi metadata.

Validasi produk awal yang diusulkan: lima calon peserta mencoba membuat passport, dua reviewer mencoba membaca dan memeriksa bukti, dan satu penyelenggara diwawancarai mengenai kebutuhan pengesahan credential. Ukur keberhasilan tanpa bantuan, titik kebingungan, kemauan membagikan profil, dan alasan menolak memakai produk. Angka ini merupakan rencana pengujian, bukan hasil yang sudah tercapai.

## 15. Tahapan pengerjaan

1. Fondasi: konfirmasi stack, kontrak data, konfigurasi jaringan, dan contract testnet.
2. Alur manual lengkap: formulir, metadata persisten, transaksi, passport, dan pemeriksaan file.
3. AI: ekstraksi, review, penanganan kegagalan, serta batas pemakaian.
4. Penyelesaian: mainnet, domain, uji lintas wallet/perangkat, dokumentasi dan demo.

Persiapan akun X, postingan, alokasi gas, serta domain berjalan sejak awal karena merupakan dependensi submission. Tidak ada estimasi penyelesaian yang dianggap pasti sebelum kondisi repository, wallet, dan layanan diperiksa.

## 16. Checklist submission

Berdasarkan guidebook yang dibaca pada 24 September 2026:

- [ ] Contract BOT Chain aktif dan memiliki aktivitas on-chain.
- [ ] Website menggunakan domain sendiri dan dapat dicoba juri.
- [ ] Repository GitHub memuat file .sol dan README berbahasa Inggris.
- [ ] Bagian Deployment mencantumkan alamat contract testnet dan mainnet.
- [ ] Akun X khusus proyek mempublikasikan proyek dengan tag @BOTChain_ai.
- [ ] Akun tersebut memiliki minimal lima postingan valid dalam 30 hari sebelum submission.
- [ ] Pengumuman menyatakan peluncuran resmi di BOT Chain Mainnet.
- [ ] Footer/partnership menampilkan BOT Chain dan tautan ke situs serta explorer.
- [ ] Seluruh tautan dimasukkan ke formulir submission sebelum batas waktu yang dikonfirmasi panitia.

Guidebook menuliskan deadline 25 September 2026 pukul 23.59 GMT+7, tetapi nama hari pada jadwal tidak sesuai kalender 2026. Konfirmasikan tanggal final kepada panitia. Jangan menganggap tanggal yang tertulis sebagai konfirmasi langsung dari panitia.

Penilaian: contract berfungsi 35 poin; koneksi wallet dan aksi utama 30; kejelasan/orisinalitas 20; publikasi X 15.

## 17. Roadmap setelah MVP

1. Pilot bersama penyelenggara untuk menguji kebutuhan penerbitan dan pencabutan credential.
2. Pendaftaran identitas penerbit dan pengesahan lewat wallet, lengkap dengan mekanisme pencabutan.
3. Pemeriksaan ID/QR melalui integrasi resmi penerbit tertentu.
4. Evaluasi dukungan tanda tangan digital PDF dan interoperabilitas credential.

Roadmap tidak ditampilkan sebagai fitur aktif. Jika kelak ada issuer attestation, registrasi identitas penerbit dan cakupan kepercayaannya harus ditentukan sebelum badge pengesahan diperkenalkan.

## 18. Keputusan yang masih terbuka

- Penyedia AI, backend, dan penyimpanan metadata; pilih berdasarkan akses, biaya, dan kebijakan data.
- Domain serta identitas visual. Dokumen ini tidak menetapkan desain final.
- Wallet deployment, saldo gas, serta konfirmasi deadline panitia.
- Penyelenggara yang bersedia menjadi mitra validasi setelah hackathon.

Sumber aturan: [Guidebook Build Week Hackathon Vol.2](https://www.girlmeetstech.org/guidebook-build-week-hackathon-vol2). Konsep awal diadaptasi dari pembahasan ProofPass dalam percakapan “Ide Project Hackathon”; rincian MVP dalam PRD ini adalah keputusan usulan untuk pelaksanaan proyek.
