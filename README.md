# Kalkulator Biaya Shopee

Web kalkulator untuk seller Shopee: menghitung **biaya admin, premi, biaya layanan, dana cair**, sekaligus **menentukan harga jual** ideal berdasarkan target keuntungan.

Dibuat dengan HTML, CSS, dan JavaScript murni (tanpa build step), sehingga bisa langsung di-hosting di GitHub Pages.

## Fitur

- **Mode Hitung Penghasilan** — masukkan harga jual (opsional: modal & jumlah terjual) untuk melihat rincian potongan biaya, dana cair, keuntungan bersih, dan margin.
- **Mode Tentukan Harga Jual** — masukkan target lalu dapatkan harga jual yang disarankan. Tipe target: **dana cair (Rp)**, profit nominal (Rp), markup (%), atau margin (%).
- **Pengaturan persentase biaya** dengan preset seller (Non-Star, Star, Star+) atau custom — karena tarif tiap akun & kategori berbeda.
- Tampilan rincian mirip struk Shopee, responsif untuk HP, format Rupiah otomatis.

## Struktur biaya (default contoh)

Basis: persentase dari harga produk.

| Komponen | Default |
|---|---|
| Biaya Administrasi | 8,48% |
| Premi | 0,5% |
| Biaya Layanan | 4,5% |

Contoh validasi (harga Rp41.664): admin Rp3.533, premi Rp208, layanan Rp1.875 → total potongan Rp5.616 → **dana cair Rp36.048**.

> Catatan: angka di atas adalah estimasi. Tarif aktual mengikuti program & kategori yang aktif di akun Shopee kamu. Sesuaikan di panel **Pengaturan Biaya**.

## Rumus

Dengan `r` = total persentase biaya dan `f` = biaya tetap:

- Dana cair = `harga × (1 − r) − f`
- Target dana cair → harga = `(target + f) / (1 − r)`
- Target nominal → harga = `(modal + target + f) / (1 − r)`
- Target markup % → harga = `(modal + modal×markup% + f) / (1 − r)`
- Target margin % → harga = `(modal + f) / (1 − r − margin%)`

## Menjalankan

Buka `index.html` langsung di browser, atau jalankan server statis:

```bash
npx serve .
```

## Deploy ke GitHub Pages

1. Push folder ini ke repository GitHub.
2. Buka **Settings → Pages**, pilih branch `main` dan folder `/ (root)`.
3. Situs akan tersedia di `https://<username>.github.io/<repo>/`.
