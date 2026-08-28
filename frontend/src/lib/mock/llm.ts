// Simulasi respons Local AI Model (mode mock).
// Bahasa: hangat, reflektif, tanpa diagnosis palsu — sama seperti perilaku
// model konseling yang seharusnya.

const SAFETY_RE = /(bunuh|mati|menyakiti diri|nggak\s+mau\s+hidup|tidak\s+mau\s+hidup|enggak\s+mau\s+hidup|sebaiknya\s+saya\s+mati)/i;

const CATEGORIES: Array<{ re: RegExp; replies: string[] }> = [
  {
    re: /^(halo|hai|hei|hi|hello|assalamualaikum|selamat\s+(pagi|siang|sore|malam))\b/i,
    replies: [
      "Halo. Saya PsychoBot, asisten konseling digital Anda. Bagaimana perasaan Anda hari ini? Silakan ceritakan apa yang sedang terjadi, sekecil apa pun.",
      "Hai, terima kasih sudah membuka sesi hari ini. Apa yang paling sering ada di pikiran Anda akhir-akhir ini?",
    ],
  },
  {
    re: /lelah|capek|burnout|stres|stres berat|tekanan/i,
    replies: [
      "Terima kasih sudah berbagi. Merasa lelah secara emosional adalah respons wajar terhadap tekanan yang menumpuk. Menurut Anda, bagian mana dari tekanan itu yang paling berat — pekerjaan, lingkungan, atau harapan dari diri sendiri?",
      "Lelah yang berkepanjangan sering kali tanda bahwa kita terlalu lama menahan sesuatu. Kalau boleh tahu, kapan Anda pertama kali merasakan kelelahan ini, dan apa yang biasanya membantu Anda merasa sedikit lebih ringan?",
    ],
  },
  {
    re: /sedih|menangis|depresi|putus asa|kosong/i,
    replies: [
      "Saya mendengar rasa sedih itu, dan saya bersyukur Anda mau menuturkannya di sini. Sedih yang dalam layak diberi ruang, bukan ditekan. Bisa diceritakan lebih lanjut, sejak kapan perasaan ini mulai hadir?",
      "Merasa kosong atau sedih berkepanjangan bisa sangat menguras. Anda tidak perlu menjelaskan semuanya sekali — ceritakan saja apa yang paling terasa saat ini, pelan-pelan.",
    ],
  },
  {
    re: /cemas|khawatir|gelisah|panik|panic|takut/i,
    replies: [
      "Cemas sering datang seperti gelombang yang sulit dikendalikan. Coba kita amati bersama: apa yang paling Anda khawatirkan saat ini, dan berapa dari hal-hal itu yang benar-benar bisa Anda kendalikan?",
      "Terima kasih sudah bercerita. Ketika kecemasan muncul, tubuh sering ikut tegang. Apakah Anda juga merasa jantung berdebar, napas pendek, atau susah diam saat cemas itu datang?",
    ],
  },
  {
    re: /tidur|insomnia|begadang|mudah\s+terbangun/i,
    replies: [
      "Kualitas tidur dan suasana hati sangat berkaitan. Boleh diceritakan bagaimana pola tidur Anda belakangan ini — apakah sulit memulai tidur, sering terbangun, atau justru tidur berlebihan?",
      "Gangguan tidur sering memperberat perasaan cemas dan lelah. Ada hal-hal tertentu yang biasanya mengganggu tidur Anda, misalnya pikiran berputar atau lingkungan?",
    ],
  },
  {
    re: /kerja|boss|atasan|rekan|kantor|deadline|tugas|skripsi/i,
    replies: [
      "Tampaknya lingkungan kerja atau akademik cukup membebani Anda. Dari yang Anda ceritakan, apa yang paling menguras energi — beban tugasnya, hubungan dengan orang lain, atau rasa tidak dihargai?",
      "Terima kasih sudah menceritakan dinamika di sana. Seringkali beban terbesar datang dari ekspektasi yang kita pasang pada diri sendiri. Bagaimana Anda menilai kemampuan Anda menghadapi situasi ini saat ini?",
    ],
  },
  {
    re: /pacar|partner|suami|istri|cemburu|pisah|cerai|jomblo/i,
    replies: [
      "Hubungan personal memang salah satu sumber perasaan paling kuat. Boleh diceritakan apa yang sedang terjadi, dan bagaimana perasaan Anda terhadap situasi itu?",
      "Terima kasih sudah mempercayakan cerita ini. Dari dinamika hubungan yang Anda ceritakan, apa yang paling Anda butuhkan saat ini — didengarkan, dipahami, atau bantuan mencari sudut pandang baru?",
    ],
  },
  {
    re: /orang tua|ayah|ibu|keluarga/i,
    replies: [
      "Hubungan dengan keluarga sering kali memengaruhi cara kita memandang diri sendiri. Ceritakan lebih lanjut apa yang terjadi dengan orang tua Anda, dan apa yang Anda rasakan terhadapnya.",
      "Terima kasih sudah berbagi. Ekspektasi keluarga bisa menjadi beban yang sulit diungkapkan. Apakah Anda merasa didengar di rumah, atau justru sebaliknya?",
    ],
  },
  {
    re: /makasih|terima kasih|sudah membantu/i,
    replies: [
      "Sama-sama. Saya senang bisa menemani Anda hari ini. Ingat, merawat diri adalah proses — Anda boleh kembali ke sesi ini kapan pun siap. Ada lagi yang ingin Anda ceritakan?",
    ],
  },
];

const DEFAULT_REPLIES = [
  "Terima kasih sudah menceritakan itu. Saya ingin benar-benar memahami apa yang Anda rasakan. Bisa Anda ceritakan lebih dalam — sejak kapan perasaan ini hadir, dan kapan ia terasa paling kuat?",
  "Saya mendampingi Anda mendengarkan ini. Dari semua yang Anda katakan tadi, bagian mana yang menurut Anda paling penting untuk kita bahas lebih lanjut?",
  "Apresiasi yang besar untuk kejujuran Anda. Kadang memberi nama pada perasaan sudah mengurangi bebannya. Bagaimana menurut Anda perasaan ini memengaruhi hari-hari Anda — tidur, nafsu makan, atau semangat?",
];

function pick(replies: string[]): string {
  return replies[Math.floor(Math.random() * replies.length)];
}

/** Hasil: { text, crisis } — crisis = true bila konten mengandung indikasi self-harm. */
export function generateReply(content: string): { text: string; crisis: boolean } {
  if (SAFETY_RE.test(content)) {
    return {
      crisis: true,
      text:
        "Saya sangat prihatin mendengar hal itu. Keselamatan Anda adalah yang paling penting. " +
        "Jika Anda merasa tidak aman, tolong segera hubungi layanan darurat psikologis 24 jam: " +
        "119 ekstensi 8 (sekarang 112) atau datang ke IGD rumah sakit terdekat. " +
        "Apakah saat ini ada orang yang bisa Anda ajak bicara? Saya di sini menemani Anda sampai Anda merasa lebih aman.",
    };
  }
  for (const c of CATEGORIES) {
    if (c.re.test(content)) return { text: pick(c.replies), crisis: false };
  }
  return { text: pick(DEFAULT_REPLIES), crisis: false };
}

/** Stream teks per-token (kata) untuk mensimulasikan respons Local LLM. */
export async function streamText(text: string, onToken: (token: string) => void): Promise<void> {
  const tokens = text.split(/(\s+)/);
  for (const t of tokens) {
    if (!t) continue;
    onToken(t);
    await new Promise((r) => setTimeout(r, 18 + Math.random() * 30));
  }
}
