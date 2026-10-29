// "Jangan keliru dengan…" — only pairs whose difference is clear from their verified meanings.
export interface Contrast {
  a: string;
  b: string;
  /** One sentence on what separates them. */
  beza: string;
}

export const CONTRASTS: Contrast[] = [
  { a: 'sudah-terantuk-baru-tengadah', b: 'sediakan-payung-sebelum-hujan', beza: 'Yang pertama tentang sedar selepas ditimpa masalah; yang kedua tentang bersedia sebelum masalah datang.' },
  { a: 'air-beriak-tanda-tak-dalam', b: 'air-tenang-jangan-disangka-tiada-buaya', beza: 'Yang pertama mengkritik orang banyak cakap tetapi kurang ilmu; yang kedua mengingatkan supaya tidak memandang rendah orang yang pendiam.' },
  { a: 'kacang-lupakan-kulit', b: 'baik-membawa-resmi-padi-daripada-membawa-resmi-lalang', beza: 'Yang pertama tentang melupakan asal usul; yang kedua tentang merendah diri walaupun berilmu atau berjaya.' },
  { a: 'seperti-aur-dengan-tebing', b: 'bagai-isi-dengan-kuku', beza: 'Aur dengan tebing menekankan saling membantu; isi dengan kuku menekankan keakraban hubungan.' },
  { a: 'hangat-hangat-tahi-ayam', b: 'bagai-melepaskan-batuk-di-tangga', beza: 'Yang pertama tentang semangat yang cepat padam; yang kedua tentang kerja yang dibuat sambil lewa.' },
  { a: 'bagaimana-acuan-begitulah-kuihnya', b: 'melentur-buluh-biarlah-dari-rebungnya', beza: 'Acuan dan kuih menerangkan hasilnya (anak menyerupai ibu bapa); melentur buluh menasihati supaya mendidik sejak kecil.' },
  { a: 'mencurah-air-ke-daun-keladi', b: 'seperti-hujan-jatuh-ke-pasir', beza: 'Yang pertama tentang nasihat yang tidak diendahkan; yang kedua tentang kebaikan atau teguran yang tidak dihargai.' },
  { a: 'harapkan-pagar-pagar-makan-padi', b: 'musuh-dalam-selimut', beza: 'Yang pertama tentang penjaga amanah yang mengkhianati; yang kedua tentang orang rapat yang berpura-pura baik.' },
  { a: 'pucuk-dicita-ulam-mendatang', b: 'seperti-orang-mengantuk-disorongkan-bantal', beza: 'Yang pertama tentang mendapat apa yang diingini; yang kedua tentang mendapat bantuan atau peluang tepat pada masanya.' },
  { a: 'yang-dikejar-tak-dapat-yang-dikendong-berciciran', b: 'mendengar-guruh-di-langit-air-di-tempayan-dicurahkan', beza: 'Yang pertama menekankan kerugian kedua-duanya; yang kedua menekankan sebabnya, iaitu melepaskan yang ada kerana harapan yang belum pasti.' },
  { a: 'seperti-ketam-mengajar-anak-berjalan-lurus', b: 'cubit-paha-sendiri-dulu-baru-cubit-paha-orang-lain', beza: 'Yang pertama mengkritik orang yang menasihati tetapi tidak berbuat begitu; yang kedua menasihati supaya menilai diri dahulu.' },
  { a: 'biar-lambat-asal-selamat', b: 'sepuluh-kali-ukur-sekali-potong', beza: 'Yang pertama tentang berhati-hati semasa bertindak; yang kedua tentang berfikir teliti sebelum membuat keputusan.' },
  { a: 'berat-sama-dipikul-ringan-sama-dijinjing', b: 'bersatu-teguh-bercerai-roboh', beza: 'Yang pertama tentang berkongsi beban dan kesenangan; yang kedua tentang kekuatan yang lahir daripada perpaduan.' },
  { a: 'alang-alang-menyeluk-pekasam-biar-sampai-ke-pangkal-lengan', b: 'genggam-bara-api-biar-sampai-jadi-arang', beza: 'Yang pertama tentang menyelesaikan kerja yang sudah dimulakan; yang kedua tentang tabah menghadapi kesusahan sehingga berjaya.' },
];
