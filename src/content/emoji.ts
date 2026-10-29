// Teka Emoji puzzles. Each one points at one record and was checked for a single clear reading.
// Distractors are picked at runtime, excluding the answer's variants.
export interface EmojiPuzzle {
  emoji: string;
  /** Spoken label for screen readers, so the puzzle does not rely on emoji names. */
  label: string;
  answer: string;
  difficulty: 1 | 2 | 3;
}

export const EMOJI_PUZZLES: EmojiPuzzle[] = [
  { emoji: '🦐 🫣 🪨', label: 'Udang bersembunyi di belakang batu', answer: 'ada-udang-di-sebalik-batu', difficulty: 1 },
  { emoji: '🐸 ⬇️ 🥥', label: 'Katak di bawah tempurung kelapa', answer: 'bagai-katak-di-bawah-tempurung', difficulty: 1 },
  { emoji: '🥚 🐂 😰', label: 'Telur di hujung tanduk lembu', answer: 'bagai-telur-di-hujung-tanduk', difficulty: 1 },
  { emoji: '☂️ ➡️ 🌧️', label: 'Payung dahulu, kemudian hujan', answer: 'sediakan-payung-sebelum-hujan', difficulty: 1 },
  { emoji: '🌧️ ➡️ 🍄🍄🍄', label: 'Selepas hujan, banyak cendawan tumbuh', answer: 'bagai-cendawan-tumbuh-selepas-hujan', difficulty: 1 },
  { emoji: '🍬 🐜🐜🐜', label: 'Gula dikerumuni semut', answer: 'ada-gula-ada-semut', difficulty: 1 },
  { emoji: '🐕 💬 ⛰️', label: 'Anjing menyalak ke arah bukit', answer: 'anjing-menyalak-bukit', difficulty: 1 },
  { emoji: '🐒 🌸', label: 'Kera memegang bunga', answer: 'seperti-kera-mendapat-bunga', difficulty: 1 },
  { emoji: '💍 💎', label: 'Cincin dan permata', answer: 'bagai-cincin-dengan-permata', difficulty: 1 },
  { emoji: '🪁 ✂️', label: 'Layang-layang yang talinya terputus', answer: 'bagai-layang-layang-putus-tali', difficulty: 1 },
  { emoji: '🍚 ➡️ 🥣 😩', label: 'Nasi bertukar menjadi bubur', answer: 'nasi-sudah-menjadi-bubur', difficulty: 2 },
  { emoji: '🌊 😌 🐊', label: 'Air yang tenang, ada buaya di bawahnya', answer: 'air-tenang-jangan-disangka-tiada-buaya', difficulty: 2 },
  { emoji: '🔥 🌾 🤫', label: 'Api tersembunyi dalam sekam padi', answer: 'seperti-api-dalam-sekam', difficulty: 2 },
  { emoji: '🦀 👶 ⬆️', label: 'Ketam mengajar anaknya berjalan lurus', answer: 'seperti-ketam-mengajar-anak-berjalan-lurus', difficulty: 2 },
  { emoji: '🐘 ⚔️ 🐘  🦌 😵', label: 'Dua gajah berlawan, pelanduk di tengah menjadi mangsa', answer: 'gajah-sama-gajah-berjuang-pelanduk-mati-di-tengah-tengah', difficulty: 2 },
  { emoji: '🍯 😋 🗑️', label: 'Madu dihabiskan, sepahnya dibuang', answer: 'habis-madu-sepah-dibuang', difficulty: 2 },
  { emoji: '🤕 🪜 💥', label: 'Sudah jatuh, ditimpa tangga pula', answer: 'lagi-jatuh-ditimpa-tangga', difficulty: 2 },
  { emoji: '💧 🔪 💧', label: 'Air dipotong tetapi tetap bersambung', answer: 'air-dicincang-tidak-akan-putus', difficulty: 2 },
  { emoji: '🧵 ➕ 🧵 ➡️ 🧣', label: 'Benang demi benang menjadi kain', answer: 'sehari-selembar-benang-lama-lama-menjadi-kain', difficulty: 2 },
  { emoji: '✊ 🔥 ➡️ ⚫', label: 'Bara api digenggam sehingga menjadi arang', answer: 'genggam-bara-api-biar-sampai-jadi-arang', difficulty: 2 },
  { emoji: '🫗 💧 🍃', label: 'Air dicurah ke atas daun keladi', answer: 'mencurah-air-ke-daun-keladi', difficulty: 2 },
  { emoji: '🐃 🪢  🧑 🤝', label: 'Kerbau dipegang talinya, manusia dipegang janjinya', answer: 'kerbau-dipegang-pada-talinya-manusia-dipegang-pada-janjinya', difficulty: 3 },
  { emoji: '🐅 ⚰️ 〰️  🧑 ⚰️ 📛', label: 'Harimau mati meninggalkan belang, manusia meninggalkan nama', answer: 'harimau-mati-meninggalkan-belang-manusia-mati-meninggalkan-nama', difficulty: 3 },
  { emoji: '🌾 🙇  🌿 🧍', label: 'Padi menunduk, lalang berdiri tegak', answer: 'baik-membawa-resmi-padi-daripada-membawa-resmi-lalang', difficulty: 3 },
  { emoji: '🪵 🔨 ➡️ 🥣', label: 'Batang ruyung dipecahkan untuk mendapat sagu', answer: 'kalau-tidak-dipecahkan-ruyung-manakan-dapat-sagunya', difficulty: 3 },
  { emoji: '🐓 🌧️ 😔', label: 'Ayam basah di dalam hujan', answer: 'membawa-nasib-seperti-ayam-di-hujan', difficulty: 3 },
  { emoji: '😴 ➡️ 🛏️', label: 'Orang mengantuk diberi bantal', answer: 'seperti-orang-mengantuk-disorongkan-bantal', difficulty: 3 },
  { emoji: '🥜 🤷 🫛', label: 'Kacang tidak ingat kulitnya', answer: 'kacang-lupakan-kulit', difficulty: 1 },
  { emoji: '🐍 🌱 🧪', label: 'Ular menyusur akar, bisanya tetap ada', answer: 'ular-menyusur-akar-tidak-akan-hilang-bisanya', difficulty: 3 },
  { emoji: '🌕 ⬇️ 🧎', label: 'Bulan jatuh ke pangkuan', answer: 'bagai-bulan-jatuh-ke-riba', difficulty: 3 },
];
