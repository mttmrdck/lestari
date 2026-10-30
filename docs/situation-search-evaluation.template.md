# Penilaian Carian Situasi

Dijana oleh `npm run eval:situasi -- --report`. Jangan sunting `situation-search-evaluation.md` secara manual; sunting templat ini.

**Had penting.** Kebenaran asas (`data/eval/situasi-*.json`) ditulis oleh pembangun dengan membaca maksud setiap peribahasa, bukan daripada output algoritma, tetapi **belum disemak oleh guru bahasa atau pakar peribahasa**. Set-set ini kecil (ratusan ayat), jadi perbezaan beberapa peratus tidak bermakna. Angka ini ialah ukuran perbandingan, bukan jaminan ketepatan untuk semua ayat.

## Definisi metrik

- **Hasil teratas relevan:** hasil pertama benar-benar sesuai. Metrik utama.
- **Precision@k:** bahagian hasil yang dipaparkan (paling banyak k) yang relevan. Tiada hasil dikira 0.
- **Recall@5:** bahagian peribahasa relevan yang ditemui dalam 5 hasil pertama (dihadkan kepada 5).
- **Kadar tidak relevan:** bahagian semua hasil dipaparkan yang tidak ada dalam senarai relevan.
- **Ketepatan tiada-padanan:** bahagian ayat tanpa peribahasa sesuai yang betul-betul tidak mendapat hasil.
- **Dijawab:** bahagian ayat berpadanan yang mendapat sekurang-kurangnya satu hasil.

## Keputusan

{{SUMMARY}}

Set ujian akhir ialah angka yang patut dipetik. Dev tidak boleh dipetik kerana algoritma ditala padanya. Set pengesahan juga telah dilihat semasa membuat keputusan reka bentuk.

## Bagaimana algoritma berubah, dan mengapa

Setiap langkah di bawah berpunca daripada kegagalan yang diukur.

| Langkah | Dev (teratas) | Pengesahan (teratas) | Pengajaran |
|---|---|---|---|
| Enjin lama: pencetus satu perkataan dan pertindihan kata | 60% | 16% | Hasil dipaksa walaupun tidak sesuai; ketepatan tiada-padanan 0%. |
| Kiu berstruktur dan peta konsep ke peribahasa | 100% | 28% | Skor dev menipu. Kiu tulisan tangan tidak mengenal ayat baharu: hanya 53% ayat dijawab. Inilah sebabnya set pengesahan wujud. |
| Vektor (bge-m3) terhadap maksud peribahasa sahaja | 75% | 44% | Lebih umum, tetapi tidak dapat membezakan ayat biasa daripada situasi sebenar. |
| Hibrid: contoh situasi bagi setiap konsep, ditambah kelas ayat neutral | 98% | 72% | Ayat dibandingkan dengan ayat. Kelas neutral membolehkan sistem berkata "tiada padanan". |
| Persamaan ayat sebagai penentu, kiu sebagai bonus | 98% | 81% | Kiu yang tersalah cetus pada satu perkataan tidak lagi mengatasi makna keseluruhan ayat. |

Pembetulan lain yang dicetuskan oleh penilaian: penafian melalui "tanpa mengharapkan balasan", dua konsep yang saling membatalkan (umpat dan khabar angin), konsep `hilang-harta` yang tertinggal, dan peribahasa "berkaitan" yang memenuhi hasil walaupun padanan utama sudah ada.

## Kegagalan yang masih ada

{{FAILURES}}

## Semua kes

{{ALL}}
