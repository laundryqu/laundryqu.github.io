# Laundry QU Workspaces

## Identitas proyek

- **Nama proyek:** Laundry QU Workspaces
- **Pemilik/pembuat:** [Nama kreator]
- **Stack:** React, Vite, Firebase Realtime Database, Framer Motion, Lucide React

> Folder ini adalah sumber file website yang digunakan untuk perubahan dan deployment selanjutnya.

## Ringkasan

Aplikasi Laundry QU menyediakan tiga pintu masuk yang terpisah untuk operasional kasir, admin, dan agen. Antarmuka React memakai sidebar responsif, kartu glassmorphism, animasi perpindahan halaman, serta foto latar ruang laundry.

Fungsi transaksi lama tetap dijalankan oleh `PosLaundry.html` di dalam workspace melalui bridge, sehingga alur nota, pembayaran, progres, pengaturan, dan data Firebase yang sudah digunakan tidak perlu ditulis ulang sekaligus.

## Fitur utama

- **Kasir:** buat nota, progres cucian, pelunasan dan scan, laporan harian, member/portal QR, stok/pengeluaran, dan chat admin.
- **Arsip Nota:** cari nota berdasarkan nomor, nama, telepon, atau alamat; lihat detail dan riwayat alur tanpa mencetak ulang; telusuri nota lain yang sedang dikerjakan pada tanggal masuk yang sama.
- **Admin:** login password, data karyawan dan agen, keuangan dan gaji, pengaturan/paket, laporan keuangan, serta inbox yang dapat memulai percakapan dengan karyawan atau agen.
- **Agen:** login dengan memilih nama agen aktif, dasbor, pembuatan nota yang ditautkan ke agen, laporan keuangan agen, dan chat admin.
- **Chat:** pesan baru disimpan di Firebase Realtime Database dan dibatasi ke percakapan yang dipilih. Pesan chat mendukung alur inbox lama Laundry QU.
- **POS offline:** setelah POS berhasil dibuka online sekali, halaman dan aset CDN yang ditemukan di halaman POS di-cache. Nota, pembayaran, progres, data operasional, dan foto pakaian dapat disimpan di perangkat, lalu dikirim otomatis saat Firebase tersambung kembali.
- **Konflik sinkronisasi:** perubahan bersamaan pada data yang sama ditahan untuk ditinjau. Pilih versi perangkat atau cloud sebelum perubahan tersebut diteruskan.

## Struktur direktori

```text
.
├── pos.html                         # Entry kasir
├── admin.html                       # Entry admin
├── agen.html                        # Entry agen
├── PosLaundry.html                  # Sistem POS lama, dipakai oleh bridge
├── offline-sync.js                  # Antrean perubahan dan pemeriksaan konflik
├── service-worker.js                # Cache app shell dan aset POS untuk offline
├── src/
│   ├── main.jsx                     # Bootstrap React
│   ├── app.css                      # Sistem visual dan layout responsif
│   ├── firebase/client.js           # Akses Firebase Realtime Database
│   └── features/
│       ├── agent/                   # Laporan agen
│       ├── chat/                    # Inbox dan chat
│       └── workspace/               # Shell, laporan, dan formatters
├── vite.config.js                   # Build multi-page dan salin aset POS
├── tests/
│   └── offline-sync.test.mjs        # Uji antrean dan konflik offline
└── package.json
```

Komponen dan logika fitur dikelompokkan di `src/features/<fitur>`. `WorkspaceApp` menyediakan layout serta navigasi, sedangkan komponen fitur menangani laporan dan chat. Konfigurasi Vite membangun tiga halaman dan menyalin POS lama beserta aset sinkronisasi offline ke hasil build.

## Instalasi dan penggunaan

Persyaratan: Node.js 20.19+ atau 22.12+.

```bash
npm install
npm run dev
```

Buka URL yang ditampilkan Vite, lalu pilih halaman:

- `/pos.html`
- `/admin.html`
- `/agen.html`

Buat hasil produksi dengan:

```bash
npm run build
npm run preview
```

Folder `dist` berisi tiga entry point, POS lama, helper sinkronisasi, dan service worker. Deploy seluruh isi folder tersebut pada hosting statis yang melayani URL halaman tanpa mengubah kapitalisasi nama file. Buka POS ketika online setidaknya sekali melalui HTTPS atau localhost agar cache offline terpasang.

Saat offline, perubahan disimpan lokal dan menunggu koneksi Firebase; jangan hapus data situs sebelum antrean selesai. Jika ada konflik, buka tombol **Tinjau Konflik** di indikator sinkronisasi. Chat langsung, peta, dan layanan pihak ketiga tetap memerlukan internet.

## Catatan akses dan data

- Login admin memeriksa password yang sudah tersimpan pada data Laundry QU. Login agen hanya dengan memilih nama, sehingga bukan autentikasi identitas yang aman.
- Pemeriksaan login di browser bukan pengganti autentikasi dan aturan keamanan Firebase. Atur Firebase Realtime Database Security Rules serta autentikasi server-side sebelum aplikasi digunakan untuk data sensitif atau akses publik.
- Foto latar dan font workspace dimuat dari layanan eksternal; POS menyimpan aset eksternal yang terdeteksi saat pemasangan service worker.
