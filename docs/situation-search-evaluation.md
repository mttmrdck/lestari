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

### Pembangunan (dev): digunakan untuk penalaan (73 kes: 65 berpadanan, 8 tiada padanan)

| Enjin | Hasil teratas relevan | Precision@3 | Precision@5 | Recall@5 | Kadar tidak relevan | Ketepatan tiada-padanan | Dijawab |
|---|---|---|---|---|---|---|---|
| Lama (asal) | 60% | 49% | 44% | 49% | 59% | 0% | 100% |
| Kiu sahaja (luar talian) | 100% | 97% | 97% | 87% | 3% | 100% | 100% |
| **Hibrid (kini)** | 98% | 95% | 94% | 85% | 8% | 100% | 100% |

### Pengesahan (validation): dilihat semasa memilih seni bina (38 kes: 32 berpadanan, 6 tiada padanan)

| Enjin | Hasil teratas relevan | Precision@3 | Precision@5 | Recall@5 | Kadar tidak relevan | Ketepatan tiada-padanan | Dijawab |
|---|---|---|---|---|---|---|---|
| Lama (asal) | 16% | 17% | 17% | 14% | 83% | 0% | 100% |
| Kiu sahaja (luar talian) | 28% | 29% | 29% | 30% | 41% | 100% | 53% |
| **Hibrid (kini)** | 81% | 78% | 76% | 83% | 28% | 100% | 100% |

### Ujian akhir (test): dijalankan sekali, selepas pembekuan (36 kes: 30 berpadanan, 6 tiada padanan)

| Enjin | Hasil teratas relevan | Precision@3 | Precision@5 | Recall@5 | Kadar tidak relevan | Ketepatan tiada-padanan | Dijawab |
|---|---|---|---|---|---|---|---|
| Lama (asal) | 30% | 27% | 26% | 25% | 78% | 0% | 100% |
| Kiu sahaja (luar talian) | 40% | 38% | 39% | 41% | 24% | 83% | 53% |
| **Hibrid (kini)** | 90% | 84% | 83% | 86% | 17% | 100% | 100% |

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

### dev: 1 kes gagal, 8 kes dengan hasil tambahan yang tidak relevan

| Kes | Jenis | Situasi | Konsep dijangka | Konsep dibaca | Hasil teratas | Tidak relevan |
|---|---|---|---|---|---|---|
| d03 | parafrasa | Dia meninggalkan saya apabila saya susah. | kawan-kepentingan, dipergunakan | kawan-kepentingan | Habis madu sepah dibuang | Ada gula ada semut |
| **gagal** d15 | tidak-formal | dia ni suka tunjuk-tunjuk, baru dapat kereta dah berlagak | sombong | berlagak-kaya | Pacat ingin menjadi ular | Pacat ingin menjadi ular; Elang terbang mengawan, agas hendak mengawan juga; Cakap berlauk-lauk makan dengan sambal lada |
| d23 | formal | Ibu bapa wajar mendidik anak-anak dengan nilai murni sejak kecil lagi. | didik-sejak-kecil | didik-sejak-kecil | Melentur buluh biarlah dari rebungnya | Bagaimana acuan begitulah kuihnya |
| d25 | formal | Golongan berilmu seharusnya kekal merendah diri dan tidak bermegah dengan pencapaian mereka. | rendah-diri | rendah-diri | Baik membawa resmi padi daripada membawa resmi lalang | Ular menyusur akar, tidak akan hilang bisanya |
| d34 | pelbagai-konsep | Dia berbelanja besar untuk nampak kaya walaupun gajinya kecil dan hutangnya banyak. | berlagak-kaya, ikut-kemampuan | berlagak-kaya, belanja-ikut-pendapatan | Pacat ingin menjadi ular | Besar periuk, besar keraknya; Gedang kayu, gedang dahannya |
| d36 | kabur | Saya rasa dia ada niat lain bila tiba-tiba baik dengan saya. | niat-tersembunyi | niat-tersembunyi | Ada udang di sebalik batu | Jarum halus kelindan sutera |
| d40 | negatif | Dia tidak sombong walaupun sudah kaya. | rendah-diri | rendah-diri, pendiam-berisi | Baik membawa resmi padi daripada membawa resmi lalang | Seperti harimau menyembunyikan kukunya; Air tenang jangan disangka tiada buaya; Diam-diam ubi berisi, diam-diam besi berkarat |
| d43 | negatif | Dia tidak mahu berkongsi apa-apa kerana terlalu kedekut. | kedekut | kedekut, kera-sumbang | Ketam batu | Kera sumbang |
| d55 | parafrasa | Dia selalu diam dan ikut sahaja apa yang orang suruh tanpa berfikir. | pak-turut | pak-turut, gopoh | Bagai lembu dicucuk hidung | Belum duduk sudah berlunjur; Makan bubur panas-panas |

### holdout: 6 kes gagal, 5 kes dengan hasil tambahan yang tidak relevan

| Kes | Jenis | Situasi | Konsep dijangka | Konsep dibaca | Hasil teratas | Tidak relevan |
|---|---|---|---|---|---|---|
| h02 | parafrasa | Rakan sekerja saya hanya rapat dengan saya untuk meminjam duit. | kawan-kepentingan | kawan-kepentingan, hutang | Lagi lauk lagi nasi | Hutang keliling pinggang; Gali lubang tutup lubang; Guna-guna alu, sesudah menumbuk dicampakkan |
| **gagal** h08 | parafrasa | Baru dapat nombor satu dalam kelas, dia sudah memandang hina rakan-rakannya. | sombong | seorang-rosak-semua | Sebab nila setitik, rosak susu sebelanga | Sebab nila setitik, rosak susu sebelanga; Ikan sekambu rosak oleh ikan seekor; Seekor kerbau membawa lumpur, habis semua terpalit |
| **gagal** h09 | parafrasa | Profesor itu terkenal di seluruh dunia tetapi tetap bersalaman dengan pak cik kantin dan tidak pernah menonjolkan diri. | rendah-diri | pendiam-berisi, rendah-diri | Seperti harimau menyembunyikan kukunya | Seperti harimau menyembunyikan kukunya; Air tenang jangan disangka tiada buaya; Diam-diam ubi berisi, diam-diam besi berkarat |
| **gagal** h12 | parafrasa | Ayah menyuruh kami menyimpan sebahagian gaji untuk hari susah pada masa hadapan. | bersedia-awal | sedikit-berterusan, bersedia-awal | Berdikit-dikit, lama-lama jadi bukit | Berdikit-dikit, lama-lama jadi bukit; Sehari selembar benang, lama-lama menjadi kain |
| h19 | parafrasa | Tanpa disangka dia memenangi hadiah wang tunai sepuluh ribu ringgit. | rezeki-tak-disangka | rezeki-tak-disangka | Durian runtuh | Pucuk dicita ulam mendatang; Seperti orang mengantuk disorongkan bantal |
| h21 | parafrasa | Keluarga itu makan hasil kerja harian sahaja, kalau tidak bekerja sehari mereka tidak makan. | miskin | miskin, malas | Kais pagi makan pagi, kais petang makan petang | Curi tulang; Membawa nasib seperti ayam di hujan; Berat tulang |
| **gagal** h22 | pelbagai-konsep | Dia menyuruh saya menepati masa, tetapi dialah yang selalu datang lambat. | cakap-tak-serupa-bikin | mungkir-janji, tidak-tetap | Ya sepanjang hari, janji sepanjang jalan | Ya sepanjang hari, janji sepanjang jalan; Hati bagai baling-baling; Balik belakang lain bicara; Ular berkepala dua |
| **gagal** h28 | formal | Sesebuah syarikat tidak boleh mempunyai dua orang pengurus yang memberikan arahan berbeza. | pemimpin | bermusuhan, pemimpin | Bagai anjing dengan kucing | Bagai anjing dengan kucing; Seperti kucing dengan anjing; Bagai minyak dengan air; Ibarat api dengan air |
| **gagal** h29 | panjang | Hakim sudah lama mengulang kaji setiap malam sedikit demi sedikit. Apabila peperiksaan tiba, dia tidak perlu risau langsung kerana semuanya sudah dikuasai. | sedikit-berterusan | bebas-beban | Bagai aur yang lepas dari ikatan | Bagai aur yang lepas dari ikatan |
| h30 | panjang | Adik saya baru belajar berenang. Mula-mula dia takut air, tetapi selepas sebulan dia sudah selesa dan berani terjun. | jadi-biasa | jadi-biasa | Alah bisa tegal biasa | Jadi air mandi |
| h32 | negatif | Dia jarang bersama rakan-rakan dan lebih suka duduk seorang diri. | kera-sumbang | kera-sumbang | Kera sumbang | Bagai minyak dengan air |

### ujian: 3 kes gagal, 4 kes dengan hasil tambahan yang tidak relevan

| Kes | Jenis | Situasi | Konsep dijangka | Konsep dibaca | Hasil teratas | Tidak relevan |
|---|---|---|---|---|---|---|
| **gagal** u01 | parafrasa | Selagi gaji saya besar, dia melayan saya macam raja. Bila saya dibuang kerja, nombor telefon saya pun dia sekat. | kawan-kepentingan | tidak-mengenang-budi | Air susu dibalas dengan air tuba | Air susu dibalas dengan air tuba; Melepaskan anjing tersepit; Jangan seperti si buta mematah tongkat; Bagai hujan jatuh ke pasir |
| u05 | formal | Pegawai yang dilantik menguruskan dana bantuan rakyat telah memindahkan wang tersebut ke akaun peribadinya. | khianat-amanah | khianat-amanah, rasuah | Harapkan pagar, pagar makan padi | Duit kopi; Tumbuk rusuk |
| **gagal** u10 | parafrasa | Dia suka menayangkan jam tangan mahalnya kepada semua orang di pejabat. | sombong | berlagak-kaya | Pacat ingin menjadi ular | Pacat ingin menjadi ular; Elang terbang mengawan, agas hendak mengawan juga; Cakap berlauk-lauk makan dengan sambal lada |
| **gagal** u11 | parafrasa | Hakim negara itu tetap menegur tukang sapu di mahkamah dengan hormat dan tidak pernah berasa dirinya lebih tinggi. | rendah-diri | sabar | Dada lapang | Dada lapang; Lapang dada |
| u18 | parafrasa | Puan Rozita mengajar anak-anaknya menyebut terima kasih seawal usia dua tahun. | didik-sejak-kecil | didik-sejak-kecil, balas-budi | Melentur buluh biarlah dari rebungnya | Orang berbudi kita berbahasa, orang memberi kita merasa; Kecil tapak tangan, nyiru ditadahkan |
| u22 | parafrasa | Tanpa diduga, ayah mendapat bonus besar pada hujung tahun. | rezeki-tak-disangka | rezeki-tak-disangka | Durian runtuh | Seperti orang mengantuk disorongkan bantal |
| u27 | kabur | Dia tak tahu nak ikut cakap ibu atau cakap ayah, dua-dua dia sayang. | serba-salah | serba-salah | Dimakan mati emak, diluah mati bapa | Rambang mata |

## Semua kes

### dev

| Kes | Jenis | Situasi | Konsep dijangka | Hasil lama | Hasil kini | Betul? |
|---|---|---|---|---|---|---|
| d01 | mudah | Dia hanya datang apabila saya mempunyai wang. | kawan-kepentingan | Orang luar | Lagi lauk lagi nasi | ya |
| d02 | parafrasa | Kawan itu berkawan dengan saya kerana kepentingan sendiri. | kawan-kepentingan | Elang terbang mengawan, agas hendak mengawan juga | Lagi lauk lagi nasi | ya |
| d03 | parafrasa | Dia meninggalkan saya apabila saya susah. | kawan-kepentingan, dipergunakan | Habis madu sepah dibuang | Habis madu sepah dibuang | ya |
| d04 | formal | Walaupun menghadapi banyak cabaran, dia tetap berusaha. | gigih | Genggam bara api biar sampai jadi arang | Genggam bara api biar sampai jadi arang | ya |
| d05 | negatif | Dia tidak mudah berputus asa. | gigih | Hati waja | Genggam bara api biar sampai jadi arang | ya |
| d06 | formal | Usaha yang berterusan akhirnya membuahkan hasil. | sedikit-berterusan, gigih | Sehari selembar benang, lama-lama menjadi kain | Sehari selembar benang, lama-lama menjadi kain | ya |
| d07 | mudah | Aiman baru mula belajar apabila peperiksaan tinggal seminggu. | lewat-bertindak | Sudah terantuk baru tengadah | Sudah terantuk baru tengadah | ya |
| d08 | mudah | Semua penduduk kampung bergotong-royong membersihkan surau. | kerjasama | Berat sama dipikul, ringan sama dijinjing | Berat sama dipikul, ringan sama dijinjing | ya |
| d09 | mudah | Bendahari kelab menggunakan wang yuran ahli untuk dirinya sendiri. | khianat-amanah | Harapkan pagar, pagar makan padi | Harapkan pagar, pagar makan padi | ya |
| d10 | mudah | Berkali-kali ibu menasihatinya tetapi dia langsung tidak mendengar. | nasihat-diabaikan | Seperti ketam mengajar anak berjalan lurus | Mencurah air ke daun keladi | ya |
| d11 | mudah | Selepas berjaya menjadi orang kaya, dia lupa kawan-kawan lama dan kampung halamannya. | lupa-asal | Kacang lupakan kulit | Kacang lupakan kulit | ya |
| d12 | mudah | Dua sahabat itu sangat rapat dan tidak pernah berpisah sejak kecil. | sahabat-akrab | Melentur buluh biarlah dari rebungnya | Bagai isi dengan kuku | ya |
| d13 | pelbagai-konsep | Dia menolong kawannya yang ditimpa kesusahan tanpa mengharapkan balasan. | tolong-susah | Hanyut dipintasi, lulus diselami, hilang dicari | Hanyut dipintasi, lulus diselami, hilang dicari | ya |
| d14 | tidak-formal | kawan aku ni bila aku takde duit terus hilang, bila ada duit baru dia cari aku | kawan-kepentingan | Hanyut dipintasi, lulus diselami, hilang dicari | Lagi lauk lagi nasi | ya |
| d15 | tidak-formal | dia ni suka tunjuk-tunjuk, baru dapat kereta dah berlagak | sombong | Baik membawa resmi padi daripada membawa resmi lalang | Pacat ingin menjadi ular | tidak |
| d16 | tidak-formal | malas betul dia ni, kerja tak nak buat, asyik curi tulang je | malas | Curi tulang | Curi tulang | ya |
| d17 | tidak-formal | ramai cakap belakang pasal dia, tapi semua tu khabar angin je tak tentu betul | khabar-angin | Khabar angin | Khabar angin | ya |
| d18 | tidak-formal | marah gila dia tadi, sikit-sikit nak mengamuk | marah | Berdikit-dikit, lama-lama jadi bukit | Darah panas | ya |
| d19 | tidak-formal | cikgu tegur dia pun dia buat tak tau je, degil sangat | nasihat-diabaikan | Seperti hujan jatuh ke pasir | Mencurah air ke daun keladi | ya |
| d20 | formal | Seorang pemimpin yang menyalahgunakan kuasa untuk kepentingan peribadi telah mengkhianati kepercayaan rakyat. | khianat-amanah | Harapkan pagar, pagar makan padi | Harapkan pagar, pagar makan padi | ya |
| d21 | formal | Masyarakat yang bersatu padu akan lebih kuat berbanding masyarakat yang berpecah-belah. | perpaduan | Bersatu teguh, bercerai roboh | Bersatu teguh, bercerai roboh | ya |
| d22 | formal | Pelajar perlu membuat persediaan yang rapi lebih awal bagi menghadapi sebarang kemungkinan. | bersedia-awal | Sediakan payung sebelum hujan | Sediakan payung sebelum hujan | ya |
| d23 | formal | Ibu bapa wajar mendidik anak-anak dengan nilai murni sejak kecil lagi. | didik-sejak-kecil | Melentur buluh biarlah dari rebungnya | Melentur buluh biarlah dari rebungnya | ya |
| d24 | formal | Perbuatan salah laku seorang pegawai telah mencemarkan nama baik seluruh organisasi. | seorang-rosak-semua | Sebab nila setitik, rosak susu sebelanga | Sebab nila setitik, rosak susu sebelanga | ya |
| d25 | formal | Golongan berilmu seharusnya kekal merendah diri dan tidak bermegah dengan pencapaian mereka. | rendah-diri | Baik membawa resmi padi daripada membawa resmi lalang | Baik membawa resmi padi daripada membawa resmi lalang | ya |
| d26 | panjang | Masa sekolah dulu kami selalu makan bersama, tetapi selepas saya jatuh miskin dia tidak lagi menjawab panggilan saya. Bila saya berjaya semula, tiba-tiba dia datang semula kononnya kawan baik. | kawan-kepentingan | Ke bukit sama didaki, ke lurah sama dituruni | Lagi lauk lagi nasi | ya |
| d27 | panjang | Abang gagal memandu sebanyak tiga kali. Dia berasa kecewa tetapi dia terus berlatih setiap hujung minggu sehingga akhirnya lulus ujian itu. | gigih | Makan bubur panas-panas | Genggam bara api biar sampai jadi arang | ya |
| d28 | panjang | Dalam kumpulan projek kami, setiap orang hanya mahu bahagian yang senang. Tiada siapa mahu membantu orang lain, akhirnya kerja kami tidak siap. | tak-bersatu | Berat sama dipikul, ringan sama dijinjing | Seperti enau dalam belukar, melepaskan pucuk masing-masing | ya |
| d29 | panjang | Kawan saya pendiam dan jarang bercakap dalam kelas. Tak sangka dia menang pertandingan pidato peringkat negeri. | pendiam-berisi | Air tenang jangan disangka tiada buaya | Air tenang jangan disangka tiada buaya | ya |
| d30 | panjang | Ayah berhenti kerja kerana dijanjikan jawatan bergaji besar oleh kenalannya, tetapi jawatan itu tidak wujud dan kini dia kehilangan kerja lamanya juga. | lepas-yang-ada | Yang dikejar tak dapat, yang dikendong berciciran | Mendengar guruh di langit, air di tempayan dicurahkan | ya |
| d31 | pelbagai-konsep | Kawan yang saya percayai membocorkan rahsia saya kepada orang lain. | khianat-rapat | Musuh dalam selimut | Musuh dalam selimut | ya |
| d32 | pelbagai-konsep | Sudahlah kereta rosak, kemudian pula dompet saya hilang di stesen minyak. | malang-bertimpa | Lagi jatuh ditimpa tangga | Lagi jatuh ditimpa tangga | ya |
| d33 | pelbagai-konsep | Dia menegur adiknya supaya tidak merokok, sedangkan dia sendiri perokok tegar. | cakap-tak-serupa-bikin | Seperti ketam mengajar anak berjalan lurus | Seperti ketam mengajar anak berjalan lurus | ya |
| d34 | pelbagai-konsep | Dia berbelanja besar untuk nampak kaya walaupun gajinya kecil dan hutangnya banyak. | berlagak-kaya, ikut-kemampuan | Besar periuk, besar keraknya | Pacat ingin menjadi ular | ya |
| d35 | pelbagai-konsep | Kerana seorang pelajar meniru, seluruh kelas didenda oleh guru. | seorang-rosak-semua | Guru kencing berdiri, murid kencing berlarian | Sebab nila setitik, rosak susu sebelanga | ya |
| d36 | kabur | Saya rasa dia ada niat lain bila tiba-tiba baik dengan saya. | niat-tersembunyi | Ada udang di sebalik batu | Ada udang di sebalik batu | ya |
| d37 | kabur | Saya tak tahu nak pilih yang mana satu, dua-dua pilihan ada buruknya. | serba-salah | Rambang mata | Dimakan mati emak, diluah mati bapa | ya |
| d38 | kabur | Dia selalu berubah fikiran, hari ini setuju esok tidak. | tidak-tetap | Ibarat negeri berubah rasam, ibarat tahun berubah musim | Hati bagai baling-baling | ya |
| d39 | kabur | Dia sangat sedih selepas ditinggalkan orang yang dia sayang. | sedih-kecewa | Habis madu sepah dibuang | Makan hati berulam jantung | ya |
| d40 | negatif | Dia tidak sombong walaupun sudah kaya. | rendah-diri | Baik membawa resmi padi daripada membawa resmi lalang | Baik membawa resmi padi daripada membawa resmi lalang | ya |
| d41 | negatif | Dia tidak pernah menepati janji yang dibuatnya. | mungkir-janji | Ya sepanjang hari, janji sepanjang jalan | Ya sepanjang hari, janji sepanjang jalan | ya |
| d42 | negatif | Dia tidak jujur dan suka menipu kawan-kawannya. | tidak-jujur | Elang terbang mengawan, agas hendak mengawan juga | Dalam dua tengah tiga | ya |
| d43 | negatif | Dia tidak mahu berkongsi apa-apa kerana terlalu kedekut. | kedekut | Berat sama dipikul, ringan sama dijinjing | Ketam batu | ya |
| d44 | negatif | Dia tidak bertanya kepada sesiapa sebab malu, akhirnya dia sesat. | malu-bertanya | Malu bertanya sesat jalan, malu berkayuh perahu hanyut | Malu bertanya sesat jalan, malu berkayuh perahu hanyut | ya |
| d45 | negatif | Dia tidak mengaku kesalahannya dan menyalahkan orang lain. | tidak-mengaku | Berani kerana benar, takut kerana salah | Lempar batu sembunyi tangan | ya |
| d46 | parafrasa | Orang yang dia tolong dulu kini menikam dia dari belakang. | tidak-mengenang-budi | Berat sama dipikul, ringan sama dijinjing | Air susu dibalas dengan air tuba | ya |
| d47 | parafrasa | Kami berterima kasih atas segala bantuan yang diberikan oleh jiran-jiran. | balas-budi | Kecil tapak tangan, nyiru ditadahkan | Kecil tapak tangan, nyiru ditadahkan | ya |
| d48 | parafrasa | Saya simpan seringgit setiap hari dan lama-lama dapat beli basikal. | sedikit-berterusan | Berdikit-dikit, lama-lama jadi bukit | Berdikit-dikit, lama-lama jadi bukit | ya |
| d49 | parafrasa | Dia bersemangat pada minggu pertama sahaja, lepas tu terus berhenti. | semangat-sekejap | Mendengar guruh di langit, air di tempayan dicurahkan | Hangat-hangat tahi ayam | ya |
| d50 | parafrasa | Tugasan itu dibuat sambil lewa sahaja asalkan siap. | sambil-lewa | Bagai melepaskan batuk di tangga | Bagai melepaskan batuk di tangga | ya |
| d51 | parafrasa | Pengacara tiba-tiba sakit, jadi saya terpaksa ganti dia saat akhir. | bidan-terjun | Bidan terjun | Bidan terjun | ya |
| d52 | parafrasa | Dua syarikat besar bersaing dan peniaga kecil pula yang menjadi mangsa. | orang-kecil-mangsa | Gajah sama gajah berjuang, pelanduk mati di tengah-tengah | Gajah sama gajah berjuang, pelanduk mati di tengah-tengah | ya |
| d53 | parafrasa | Bila dah biasa, kerja yang susah pun jadi senang. | jadi-biasa | Berat sama dipikul, ringan sama dijinjing | Alah bisa tegal biasa | ya |
| d54 | parafrasa | Semua orang pernah buat silap, tak ada manusia yang sempurna. | semua-silap | Bagai dakwat dengan kertas | Sepandai-pandai tupai melompat, akhirnya jatuh ke tanah juga | ya |
| d55 | parafrasa | Dia selalu diam dan ikut sahaja apa yang orang suruh tanpa berfikir. | pak-turut | Berpeluk tubuh | Bagai lembu dicucuk hidung | ya |
| d56 | parafrasa | Saya yang bersusah payah buat kerja, orang lain yang dapat pujian. | kerja-orang-lain-dapat-nama | Lembu punya susu, sapi dapat nama | Lembu punya susu, sapi dapat nama | ya |
| d57 | parafrasa | Tiada pilihan lain, jadi kami gunakan sahaja barang yang ada. | terima-seadanya | Habis madu sepah dibuang | Tiada rotan, akar pun berguna | ya |
| d58 | parafrasa | Rumah terbakar dan mereka hanya tinggal pakaian di badan. | hilang-harta | Habis madu sepah dibuang | Tinggal kain sehelai sepinggang | ya |
| d59 | parafrasa | Saya rindu kampung halaman walaupun sudah lama tinggal di luar negara. | tanah-air | Hujan emas di negeri orang, hujan batu di negeri sendiri | Hujan emas di negeri orang, hujan batu di negeri sendiri | ya |
| d60 | parafrasa | Bila belajar di negara orang, kita kena ikut adat dan peraturan mereka. | hormat-adat | Belakang parang jika diasah lagikan tajam | Di mana bumi dipijak, di situ langit dijunjung | ya |
| d61 | parafrasa | Anak itu perangainya sama seperti ayahnya. | anak-ikut-ibu-bapa | Bagaimana acuan begitulah kuihnya | Bagaimana acuan begitulah kuihnya | ya |
| d62 | parafrasa | Walaupun bertengkar, adik-beradik itu tetap berbaik semula. | keluarga-tak-putus | Air dicincang tidak akan putus | Air dicincang tidak akan putus | ya |
| d63 | parafrasa | Mereka asyik bergaduh setiap kali berjumpa. | bermusuhan | Bagai anjing dengan kucing | Bagai anjing dengan kucing | ya |
| d64 | parafrasa | Ketua datang lewat, jadi orang bawahannya pun ikut datang lewat. | contoh-buruk-ketua | Sudah terantuk baru tengadah | Guru kencing berdiri, murid kencing berlarian | ya |
| d65 | parafrasa | Kerja yang dia buat selama ini sia-sia sahaja, tiada hasil langsung. | sia-sia | Anjing menyalak bukit | Anjing menyalak bukit | ya |
| d66 | tiada-padanan | Saya suka warna biru dan lagu pop. | tiada padanan | Emas putih | (tiada) | ya |
| d67 | tiada-padanan | Ayam di belakang rumah saya bertelur banyak hari ini. | tiada padanan | Bagai ayam mengeram telur | (tiada) | ya |
| d68 | tiada-padanan | Harimau di zoo itu tidur sepanjang hari. | tiada padanan | Ya sepanjang hari, janji sepanjang jalan | (tiada) | ya |
| d69 | tiada-padanan | Kelas bahasa Inggeris esok bermula pukul lapan pagi. | tiada padanan | Fajar menyingsing | (tiada) | ya |
| d70 | tiada-padanan | Ibu memasak nasi goreng untuk sarapan pagi tadi. | tiada padanan | Ke mana tumpahnya kuah kalau tidak ke nasi | (tiada) | ya |
| d71 | tiada-padanan | Kawan saya membeli telefon baharu berwarna hitam. | tiada padanan | Alah membeli menang memakai | (tiada) | ya |
| d72 | tiada-padanan | Bas sekolah sampai di hadapan rumah pada pukul tujuh. | tiada padanan | Hari guruh takkan hujan | (tiada) | ya |
| d73 | tiada-padanan | Hujan turun lebat petang semalam di kawasan kami. | tiada padanan | Kaki naik, kepala turun | (tiada) | ya |

### holdout

| Kes | Jenis | Situasi | Konsep dijangka | Hasil lama | Hasil kini | Betul? |
|---|---|---|---|---|---|---|
| h01 | parafrasa | Masa aku senang ramai yang nak melepak dengan aku, bila jatuh sorang pun tak tanya khabar. | kawan-kepentingan | Lagi jatuh ditimpa tangga | Lagi lauk lagi nasi | ya |
| h02 | parafrasa | Rakan sekerja saya hanya rapat dengan saya untuk meminjam duit. | kawan-kepentingan | Bagai isi dengan kuku | Lagi lauk lagi nasi | ya |
| h03 | formal | Pekerja itu ditamatkan khidmat sebaik sahaja projek syarikat selesai walaupun telah banyak berjasa. | dipergunakan | Alang-alang berdakwat biarlah hitam | Habis madu sepah dibuang | ya |
| h04 | mudah | Azim dan Faiz sudah berkawan sejak darjah satu dan ke mana-mana pun berdua. | sahabat-akrab | Atas pagar | Bagai isi dengan kuku | ya |
| h05 | parafrasa | Biarpun berkali-kali ditolak oleh penerbit, penulis itu terus menghantar karyanya sehingga diterima. | gigih | Cakar ayam | Genggam bara api biar sampai jadi arang | ya |
| h06 | tidak-formal | dia ni rajin gila, pagi petang siang malam kerja tak berhenti | rajin | Kaki naik, kepala turun | Ringan tulang | ya |
| h07 | tidak-formal | kerja sekolah semua tiru kawan, sendiri tak nak fikir langsung sebab malas | malas | Elang terbang mengawan, agas hendak mengawan juga | Curi tulang | ya |
| h08 | parafrasa | Baru dapat nombor satu dalam kelas, dia sudah memandang hina rakan-rakannya. | sombong | Pipit sama pipit enggang sama enggang | Sebab nila setitik, rosak susu sebelanga | tidak |
| h09 | parafrasa | Profesor itu terkenal di seluruh dunia tetapi tetap bersalaman dengan pak cik kantin dan tidak pernah menonjolkan diri. | rendah-diri | Pelanduk melupakan jerat, tetapi jerat tidak pernah melupakan pelanduk | Seperti harimau menyembunyikan kukunya | tidak |
| h10 | parafrasa | Pengerusi koperasi membawa lari wang simpanan ahli-ahli. | khianat-amanah | Buka langkah | Harapkan pagar, pagar makan padi | ya |
| h11 | parafrasa | Doktor sudah pesan supaya berhenti merokok, tetapi pak cik itu buat endah tak endah sahaja. | nasihat-diabaikan | Mencurah air ke daun keladi | Mencurah air ke daun keladi | ya |
| h12 | parafrasa | Ayah menyuruh kami menyimpan sebahagian gaji untuk hari susah pada masa hadapan. | bersedia-awal | Berat mata memandang, berat lagi bahu memikul | Berdikit-dikit, lama-lama jadi bukit | tidak |
| h13 | parafrasa | Setelah ditangkap polis, barulah dia sedar akan kesilapannya selama ini. | lewat-bertindak | Hari tak selamanya panas | Sudah terantuk baru tengadah | ya |
| h14 | parafrasa | Belum pun lulus temu duga, dia sudah memberitahu semua orang tentang jawatan barunya. | gopoh | Hanyut dipintasi, lulus diselami, hilang dicari | Belum duduk sudah berlunjur | ya |
| h15 | parafrasa | Sebelum membeli rumah itu, ayah memeriksa setiap sudut dan bertanya pendapat ramai orang. | fikir-dahulu | Malu bertanya sesat jalan, malu berdayung perahu hanyut | Sepuluh kali ukur, sekali potong | ya |
| h16 | parafrasa | Cakap sahaja pandai, bila suruh buat kerja semua tak reti. | cakap-besar | Harap ke mulut besar cakap, kerja suatu tak boleh cekap | Air beriak tanda tak dalam | ya |
| h17 | parafrasa | Kerana silap seorang ahli, pasukan bola sepak kami disingkirkan daripada kejohanan. | seorang-rosak-semua | Berat sama dipikul, ringan sama dijinjing | Sebab nila setitik, rosak susu sebelanga | ya |
| h18 | parafrasa | Baru sahaja kehilangan kerja, ibunya pula jatuh sakit. | malang-bertimpa | Tempat jatuh lagi dikenang, inikan pula tempat bermain | Lagi jatuh ditimpa tangga | ya |
| h19 | parafrasa | Tanpa disangka dia memenangi hadiah wang tunai sepuluh ribu ringgit. | rezeki-tak-disangka | Sagu hati | Durian runtuh | ya |
| h20 | parafrasa | Gaji bulanan kami habis digunakan untuk membayar pinjaman yang lain pula. | hutang | Habis madu sepah dibuang | Hutang keliling pinggang | ya |
| h21 | parafrasa | Keluarga itu makan hasil kerja harian sahaja, kalau tidak bekerja sehari mereka tidak makan. | miskin | Makan gaji | Kais pagi makan pagi, kais petang makan petang | ya |
| h22 | pelbagai-konsep | Dia menyuruh saya menepati masa, tetapi dialah yang selalu datang lambat. | cakap-tak-serupa-bikin | Seperti abu di atas tunggul, datang angin terbanglah dia | Ya sepanjang hari, janji sepanjang jalan | tidak |
| h23 | pelbagai-konsep | Dia selalu berkata akan membantu saya, tetapi apabila tiba masanya dia hilang. | mungkir-janji | Belum duduk sudah berlunjur | Ya sepanjang hari, janji sepanjang jalan | ya |
| h24 | kabur | Di depan cikgu dia baik sangat, belakang cikgu lain macam perangainya. | bermuka-dua | Guru kencing berdiri, murid kencing berlarian | Kepala yu, ekor babi | ya |
| h25 | kabur | Dia cemburu melihat kejayaan kawannya. | iri-hati | Berat mata memandang, berat lagi bahu memikul | Iri hati | ya |
| h26 | kabur | Saya mahu pulang ke kampung kerana di sinilah tempat saya membesar. | tanah-air | Tempat jatuh lagi dikenang, inikan pula tempat bermain | Hujan emas di negeri orang, hujan batu di negeri sendiri | ya |
| h27 | formal | Generasi muda wajar memelihara warisan budaya bangsa agar tidak lenyap ditelan zaman. | adat-dipertahankan | Di mana bumi dipijak, di situ langit dijunjung | Biar mati anak jangan mati adat | ya |
| h28 | formal | Sesebuah syarikat tidak boleh mempunyai dua orang pengurus yang memberikan arahan berbeza. | pemimpin | Berdiri sama tinggi, duduk sama rendah | Bagai anjing dengan kucing | tidak |
| h29 | panjang | Hakim sudah lama mengulang kaji setiap malam sedikit demi sedikit. Apabila peperiksaan tiba, dia tidak perlu risau langsung kerana semuanya sudah dikuasai. | sedikit-berterusan | Berdikit-dikit, lama-lama jadi bukit | Bagai aur yang lepas dari ikatan | tidak |
| h30 | panjang | Adik saya baru belajar berenang. Mula-mula dia takut air, tetapi selepas sebulan dia sudah selesa dan berani terjun. | jadi-biasa | Air dicincang takkan putus | Alah bisa tegal biasa | ya |
| h31 | negatif | Dia tidak pernah mengeluarkan sesen pun untuk orang lain walaupun hartanya banyak. | kedekut | Bagai dakwat dengan kertas | Ketam batu | ya |
| h32 | negatif | Dia jarang bersama rakan-rakan dan lebih suka duduk seorang diri. | kera-sumbang | Baik membawa resmi padi daripada membawa resmi lalang | Kera sumbang | ya |
| h33 | tiada-padanan | Saya pergi ke perpustakaan untuk memulangkan buku. | tiada padanan | Bagai itik pulang petang | (tiada) | ya |
| h34 | tiada-padanan | Pasukan kami bermain bola di padang sekolah petang tadi. | tiada padanan | Kaki bangku | (tiada) | ya |
| h35 | tiada-padanan | Adik saya berumur sepuluh tahun dan suka melukis gambar kucing. | tiada padanan | Bagai anjing dengan kucing | (tiada) | ya |
| h36 | tiada-padanan | Kereta ayah berwarna putih dan baru dibasuh pagi tadi. | tiada padanan | Emas putih | (tiada) | ya |
| h37 | tiada-padanan | Ikan di dalam kolam itu berenang ke tepi apabila diberi makan. | tiada padanan | Harapkan pagar, pagar makan padi | (tiada) | ya |
| h38 | tiada-padanan | Komputer riba baharu itu mempunyai skrin empat belas inci. | tiada padanan | Bagai buah jatuh ke riba | (tiada) | ya |

### ujian

| Kes | Jenis | Situasi | Konsep dijangka | Hasil lama | Hasil kini | Betul? |
|---|---|---|---|---|---|---|
| u01 | parafrasa | Selagi gaji saya besar, dia melayan saya macam raja. Bila saya dibuang kerja, nombor telefon saya pun dia sekat. | kawan-kepentingan | Gaji buta | Air susu dibalas dengan air tuba | tidak |
| u02 | mudah | Syafiq dan Danish susah senang bersama sejak dari tadika lagi. | sahabat-akrab | Ke bukit sama didaki, ke lurah sama dituruni | Bagai isi dengan kuku | ya |
| u03 | parafrasa | Pelari itu terjatuh di selekoh terakhir tetapi dia bangun dan berlari sampai ke garisan penamat. | gigih | Sepandai-pandai tupai melompat, akhirnya jatuh ke tanah juga | Genggam bara api biar sampai jadi arang | ya |
| u04 | tidak-formal | asal kena marah je dia terus nak berhenti, baru sekali kena dah tak nak cuba lagi | putus-asa | Genggam bara api biar sampai jadi arang | Putus asa | ya |
| u05 | formal | Pegawai yang dilantik menguruskan dana bantuan rakyat telah memindahkan wang tersebut ke akaun peribadinya. | khianat-amanah | Berat sama dipikul, ringan sama dijinjing | Harapkan pagar, pagar makan padi | ya |
| u06 | parafrasa | Ayah sudah berkali-kali melarang dia berlumba motor, tetapi dia berdegil juga. | nasihat-diabaikan | Mencurah air ke daun keladi | Mencurah air ke daun keladi | ya |
| u07 | mudah | Saya menyimpan payung dalam kereta kalau-kalau hujan nanti. | bersedia-awal | Sediakan payung sebelum hujan | Sediakan payung sebelum hujan | ya |
| u08 | parafrasa | Bila dah kena serangan jantung, baru dia nak berhenti makan makanan berlemak. | lewat-bertindak | Makan hati berulam jantung | Sudah terantuk baru tengadah | ya |
| u09 | parafrasa | Belum dapat keputusan biasiswa, dia sudah membeli beg untuk ke luar negara. | gopoh | Di mana bumi dipijak, di situ langit dijunjung | Belum duduk sudah berlunjur | ya |
| u10 | parafrasa | Dia suka menayangkan jam tangan mahalnya kepada semua orang di pejabat. | sombong | Kuku besi | Pacat ingin menjadi ular | tidak |
| u11 | parafrasa | Hakim negara itu tetap menegur tukang sapu di mahkamah dengan hormat dan tidak pernah berasa dirinya lebih tinggi. | rendah-diri | Pelanduk melupakan jerat, tetapi jerat tidak pernah melupakan pelanduk | Dada lapang | tidak |
| u12 | parafrasa | Rakan baik saya menceritakan semua kelemahan saya kepada majikan supaya dia dinaikkan pangkat. | khianat-rapat | Bersatu teguh, bercerai roboh | Musuh dalam selimut | ya |
| u13 | parafrasa | Saya menjaga dia ketika dia sakit dahulu, tetapi kini dia menyebarkan fitnah tentang saya. | tidak-mengenang-budi | Harapkan pagar, pagar makan padi | Air susu dibalas dengan air tuba | ya |
| u14 | formal | Selepas bergelar menteri, beliau tidak lagi mahu pulang melawat kampung yang membesarkannya. | lupa-asal | Bagai rusa masuk kampung | Kacang lupakan kulit | ya |
| u15 | mudah | Kami sekeluarga berterima kasih kepada doktor yang merawat ibu. | balas-budi | Kecil tapak tangan, nyiru ditadahkan | Kecil tapak tangan, nyiru ditadahkan | ya |
| u16 | mudah | Semua pelajar tingkatan lima menyusun kerusi di dewan bersama-sama sehingga kerja cepat selesai. | kerjasama | Alang-alang berdakwat biarlah hitam | Ringan sama dijinjing, berat sama dipikul | ya |
| u17 | parafrasa | Setiap wakil syarikat hanya memikirkan keuntungan sendiri sehingga rundingan gagal. | tak-bersatu | Ke gunung tak dapat angin | Seperti enau dalam belukar, melepaskan pucuk masing-masing | ya |
| u18 | parafrasa | Puan Rozita mengajar anak-anaknya menyebut terima kasih seawal usia dua tahun. | didik-sejak-kecil | Kecil tapak tangan, nyiru ditadahkan | Melentur buluh biarlah dari rebungnya | ya |
| u19 | parafrasa | Suara anak itu merdu seperti ibunya yang juga seorang penyanyi. | anak-ikut-ibu-bapa | Bagaimana acuan begitulah kuihnya | Bagaimana acuan begitulah kuihnya | ya |
| u20 | parafrasa | Kerana seorang pemain mengambil dadah, seluruh pasukan negara digantung. | seorang-rosak-semua | Sebab nila setitik, rosak susu sebelanga | Sebab nila setitik, rosak susu sebelanga | ya |
| u21 | parafrasa | Sudahlah dompet dicuri, kad pengenalan pun hilang sekali, kemudian tayar kereta pula pancit. | malang-bertimpa | Yang dikejar tak dapat, yang dikendong berciciran | Lagi jatuh ditimpa tangga | ya |
| u22 | parafrasa | Tanpa diduga, ayah mendapat bonus besar pada hujung tahun. | rezeki-tak-disangka | Malang tidak berbau | Durian runtuh | ya |
| u23 | parafrasa | Dia berhutang di kedai runcit untuk melangsaikan hutang di kedai lain. | hutang | Gali lubang tutup lubang | Hutang keliling pinggang | ya |
| u24 | tidak-formal | dia ni kedekut gila, nak keluar seringgit pun fikir dua tiga kali | kedekut | Dalam dua tengah tiga | Ketam batu | ya |
| u25 | tidak-formal | korang tak payah percaya sangat cerita tu, belum tentu betul pun | khabar-angin | Khabar angin | Khabar angin | ya |
| u26 | tidak-formal | abang aku ni pantang silap sikit terus naik angin | marah | Naik angin | Darah panas | ya |
| u27 | kabur | Dia tak tahu nak ikut cakap ibu atau cakap ayah, dua-dua dia sayang. | serba-salah | Emak saudara | Dimakan mati emak, diluah mati bapa | ya |
| u28 | kabur | Sudah dua tahun saya memujuknya, tetapi semuanya tidak mendatangkan hasil. | sia-sia | Hapus panas setahun kerana hujan | Anjing menyalak bukit | ya |
| u29 | pelbagai-konsep | Pekerja kilang yang berpenat lelah, tetapi tuan kilang yang menerima anugerah. | kerja-orang-lain-dapat-nama | Hempas tulang tak berbalas jasa | Lembu punya susu, sapi dapat nama | ya |
| u30 | pelbagai-konsep | Pemain terhebat dunia itu pun pernah tersalah sepakan penalti dalam perlawanan akhir. | semua-silap | Bagai dakwat dengan kertas | Sepandai-pandai tupai melompat, akhirnya jatuh ke tanah juga | ya |
| u31 | tiada-padanan | Saya membeli dua kilogram tepung di pasar raya petang tadi. | tiada padanan | Alah membeli menang memakai | (tiada) | ya |
| u32 | tiada-padanan | Muzium itu dibuka dari pukul sembilan pagi hingga lima petang. | tiada padanan | Kais pagi makan pagi, kais petang makan petang | (tiada) | ya |
| u33 | tiada-padanan | Kakak saya belajar perakaunan di universiti di Johor. | tiada padanan | Belakang parang jika diasah lagikan tajam | (tiada) | ya |
| u34 | tiada-padanan | Ular itu menyusur di bawah semak di tepi sungai. | tiada padanan | Ular menyusur akar, tidak akan hilang bisanya | (tiada) | ya |
| u35 | tiada-padanan | Padi di sawah datuk sudah mula menguning. | tiada padanan | Ada padi, semua kerja jadi | (tiada) | ya |
| u36 | tiada-padanan | Telefon pintar baharu itu dijual pada harga dua ribu ringgit. | tiada padanan | Orang berbudi kita berbahasa, orang memberi kita merasa | (tiada) | ya |
