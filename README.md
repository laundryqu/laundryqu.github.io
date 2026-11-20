# Laundry QU

## Identitas proyek

- **Nama:** Laundry QU
- **Pemilik/pembuat:** [Nama kreator]
- **Jenis aplikasi:** Aplikasi web operasional laundry
- **Teknologi:** HTML, CSS, JavaScript, Vite, Firebase Realtime Database

## Ringkasan

Laundry QU menyediakan halaman pelanggan, kasir, admin, dan agen. POS lama yang menjadi sumber alur transaksi dipertahankan di `poslaundry.html`; halaman `pos.html`, `admin.html`, dan `agen.html` membuka peran kerja yang sesuai.

## Fitur utama

- Pembuatan nota, pencatatan pembayaran, progres cucian, cetak ulang, arsip, laporan, dan data member.
- Arsip dan riwayat cetak ulang memuat seluruh nota aktif yang tersimpan di backend, termasuk semua tahap pengerjaan dan status pembayaran; tidak ada batas tampilan 50/100 nota.
- Penghapusan nota oleh admin bersifat soft-delete. Nota terhapus berada di **Sampah Nota** pada workspace admin, bukan di daftar nota aktif.
- Admin dapat memulihkan nota. Data arus kas yang ditautkan ikut dipulihkan; penggunaan kuota paket member dikoreksi bila paket yang digunakan masih dapat dikenali. Jika paket sudah berubah atau kuota tidak mencukupi, aplikasi memberi peringatan untuk pemeriksaan manual.
- Antrean sinkronisasi offline menyimpan perubahan lokal dan mendeteksi konflik saat tersambung kembali.

## Struktur

```text
.
├── index.html              # Halaman pelanggan
├── pos.html                # Entry point kasir
├── admin.html              # Entry point admin
├── agen.html               # Entry point agen
├── poslaundry.html         # Aplikasi POS dan alur transaksi utama
├── offline-sync.js         # Antrean sinkronisasi dan konflik offline
├── order-lists.js          # Pemfilteran dan pengurutan daftar nota aktif
├── service-worker.js       # Cache halaman dan aset POS untuk offline
├── vite.config.js          # Build multi-halaman dan salin runtime POS
└── tests/
    └── order-lists.test.mjs
```

`backup_pos.html` adalah salinan lama dan bukan entry point build. `poslaundry.html` menjadi sumber kanonik POS untuk seluruh halaman peran.

## Instalasi dan penggunaan

Persyaratan: Node.js 20.19+ atau 22.12+.

Jalankan perintah dari root repository:

```bash
npm install
npm run dev
```

Buka URL yang ditampilkan Vite. Rute aplikasi:

- `/index.html` — halaman pelanggan
- `/pos.html` — kasir
- `/admin.html` — admin
- `/agen.html` — agen

Buat hasil produksi dan jalankan tes:

```bash
npm run build
npm test
npm run preview
```

Hasil build tersedia di `dist/`. Deploy seluruh isi folder tersebut. POS offline membutuhkan HTTPS atau localhost dan perlu dibuka online setidaknya sekali agar service worker dapat menyimpan halaman dan aset.

## Data dan keamanan

Aplikasi memakai konfigurasi Firebase Realtime Database di browser. Konfigurasi klien bukan rahasia; akses data harus dibatasi dengan Firebase Security Rules dan autentikasi yang sesuai sebelum digunakan untuk akses publik atau data sensitif. Login peran saat ini berada di sisi klien dan bukan pengganti otorisasi backend.
