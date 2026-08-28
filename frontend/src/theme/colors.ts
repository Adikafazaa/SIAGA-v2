// SUMBER TUNGGAL WARNA (SIAGA-v2 DESIGN.md §2).
// Diimpor oleh tailwind.config.ts (palette) DAN komponen chart (hex SVG Recharts).
// Dilarang menulis hex di luar file ini — kecuali globals.css untuk aksen HUD statis.

export const DECISION = {
  /** Status Aman / ALLOW */
  allow: "#16A34A",
  /** Status Waspada / WATCH */
  watch: "#CA8A04",
  /** Interogasi Aktif / PROBE (sengaja keluarga ungu — jenis respons, bukan tingkatan risiko) */
  probe: "#7C3AED",
  /** Status Terblokir / BLOCK */
  block: "#DC2626",
} as const;

export const SOC = {
  /** Latar halaman konsol + grid titik */
  bg: "#0B1220",
  /** Permukaan panel/kartu */
  panel: "#111A2C",
  /** Border 1px semua elemen, garis grid chart */
  border: "#1F2A44",
  /** Teks utama, garis momentum di chart */
  text: "#E5E7EB",
  /** Label sekunder, caption, sumbu chart */
  muted: "#94A3B8",
} as const;

export const TEAM = {
  /** Segala hal milik Red-AI / penyerang */
  redai: "#EA580C",
  /** Blue-AI / guard (BUKAN status keputusan) */
  blueai: "#38BDF8",
  /** Komponen non-novel, baseline stateless */
  nonnovel: "#6B7280",
  /** Kurung sudut HUD di pojok panel (hanya globals.css) */
  hudLine: "#44548A",
} as const;

export const CARE = {
  /** Primary Care Blue — aksen antarmuka pasien */
  primary: "#2563EB",
  /** Background Light — tampilan antarmuka pasien */
  bgLight: "#F8FAFC",
} as const;
