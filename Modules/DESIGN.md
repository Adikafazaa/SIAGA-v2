# SIAGA — DESIGN.md

> **Sistem desain resmi dasbor SIAGA** — dokumen sumber kebenaran visual.
> Referensi aturan produk: `docs/05-konsep-web-ui.md` (Bab 5).
> Tanggal: 2026-08-28 · Framework: Next.js 14 (App Router) + Tailwind CSS 3.4 + Recharts + TypeScript.

---

## 0. Identitas & Filosofi

**Satu kalimat:** dasbor SIAGA adalah **konsol instrumen keamanan (SOC console)** — bukan produk SaaS, bukan landing page, bukan kartu-kartu membulat generik.

> *"Dasbor ini bukan produk. Produknya adalah layanan di belakangnya. Dasbor adalah alat bukti."* — Bab 5 §0

Konsekuensi visualnya:

| Prinsip | Wujud visual |
|---|---|
| Setiap piksel membuktikan sesuatu | Tidak ada dekorasi tanpa fungsi; setiap panel menjawab pertanyaan juri |
| Instrumen, bukan kartu | Sudut **tajam** (0 radius), border 1px, kurung HUD di pojok |
| Data = monospace | Semua angka/skor/hash `JetBrains Mono` tabular — kolom sejajar, bisa dibandingkan |
| Jangan pernah palsu | Tidak ada mockup data, tidak ada animasi hasil; chart `isAnimationActive={false}` |
| Aksesibilitas = syarat | Ikon derajat + bentuk marker + label teks SELALU menemani warna |

Bentuk visual ini sengaja dipilih sebagai **anti "AI slop"**: tampilan hasil AI generik mudah dikenali dari kartu SaaS membulat (`rounded-xl`), shadow lembut, gradien ungu-biru, dan padding seragam tanpa makna. SIAGA menolak semuanya.

---

## 1. Tooling: Skill UI

Sistem desain ini dikelola dengan bantuan tool open-source **Skill UI** (`skillui` oleh amaancoderx):

- **Repo:** https://github.com/amaancoderx/npxskillui · https://skillui.vercel.app/
- **Perintah:** `npx skillui` (juga tersedia mirror `npx npxskillui`; catatan: paket scoped `@amaancoderx/npxskillui` **tidak ada** di npm — gunakan `skillui`).
- **Fungsi:** reverse-engineer design system dari project/repo/website — ekstraksi warna, font, spacing, pola komponen, animasi — murni analisis statis, tanpa AI, tanpa API key.

**Cara kita memakainya:**

```bash
# Ekstraksi baseline design system dari frontend SIAGA:
npx skillui --dir frontend --out .skillui --format both --no-skill
# Hasil: .skillui/frontend-design/DESIGN.md  (11 warna, 14 pola komponen)
```

Output `.skillui/` adalah **artefak audit** (di-gitignore). Ia dipakai pada milestone refactor untuk:

1. Menginventarisasi kondisi UI lama (temuan: 15× duplikasi class panel, 8 varian tombol tak konsisten, 6 salinan class `<select>`, hex ditulis ulang manual di tiap chart, warna off-palette `text-sky-400`).
2. Menyusun daftar anti-pola yang kemudian dihapus saat redesign.
3. Menjadi pegangan "Do's and Don'ts" ekstraksi (tanpa shadow, tanpa gradien, tanpa blur) yang kami adopsi dan perketat di dokumen ini.

**Aturan:** komponen UI baru WAJIB konsisten dengan dokumen ini dan primitif di `frontend/src/components/ui/`. Ketika ragu, jalankan ulang `npx skillui --dir frontend` untuk membandingkan keadaan terhadap baseline.

---

## 2. Sistem Warna

**Sumber tunggal:** `frontend/src/theme/colors.ts`. File ini diimpor oleh `tailwind.config.ts` (palette Tailwind) **dan** oleh komponen chart (Recharts butuh nilai hex SVG). **Dilarang menulis hex di luar file ini** — kecuali di `globals.css` untuk aksen HUD statis.

### 2.1 Palet keputusan (Bab 5 §7 — mengikat)

| Status | Token Tailwind | Hex | Ikon | Dipakai untuk |
|---|---|---|---|---|
| ALLOW | `allow` | `#16A34A` | `○` | momentum rendah, keputusan lolos |
| WATCH | `watch` | `#CA8A04` | `◔ ◑` | arah naik konsisten di bawah ambang probe |
| PROBE | `probe` | `#7C3AED` | `⚡` | tindakan aktif — sengaja beda keluarga warna |
| BLOCK | `block` | `#DC2626` | `●` `🛑` | keputusan blokir, error, destruktif |

**Keputusan semantik terdokumentasi:** PROBE berwarna **ungu**, bukan oranye di antara kuning dan merah. ALLOW/WATCH/BLOCK adalah tingkatan pada satu sumbu risiko; PROBE adalah *jenis respons* yang berbeda. Keluarga warnanya sendiri agar tidak terbaca "agak lebih merah dari kuning".

### 2.2 Permukaan konsol SOC (PRD §7.1 — Sleek Dark Mode)

| Token | Token Tailwind | Hex | Peran |
|---|---|---|---|
| `SOC.bg` | `soc-bg` | `#0B1220` | latar halaman + grid titik |
| `SOC.panel` | `soc-panel` | `#111A2C` | permukaan panel/kartu |
| `SOC.border` | `soc-border` | `#1F2A44` | border 1px semua elemen, garis grid chart |
| `SOC.text` | `soc-text` | `#E5E7EB` | teks utama, garis momentum di chart |
| `SOC.muted` | `soc-muted` | `#94A3B8` | label sekunder, caption, sumbu chart |

### 2.3 Warna tim & penanda

| Token | Hex | Peran |
|---|---|---|
| `redai` (RED_AI) | `#EA580C` | segala hal milik **Red-AI / penyerang** (label, tombol, garis TTD) |
| `blueai` (BLUE_AI) | `#38BDF8` | **Blue-AI / guard** (perluasan palet terdokumentasi; BUKAN status keputusan) |
| `nonnovel` (NON_NOVEL) | `#6B7280` | komponen non-novel, penanda "bukan klaim kami", garis baseline stateless |
| `HUD_LINE` | `#44548A` | kurung sudut HUD di pojok panel (hanya di `globals.css`) |

### 2.4 Transparansi & aturan pemakaian

- Tint latar status memakai opasitas rendah: `bg-block/10`, `bg-probe/10`, `bg-allow/10`, `bg-watch/5`.
- **Warna tidak pernah satu-satunya penanda** — selalu berpasangan dengan ikon derajat (`○◔◑◕●`), bentuk marker chart (`▲ ✖ · ○`), atau label teks.
- Kontras teks minimum **4.5:1** (WCAG AA); seluruh hex di atas telah diperiksa terhadap latar `soc-bg`/`soc-panel`.
- Dilarang: warna di luar palet (kasus `text-sky-400` sudah dihapus), gradien warna, shadow berwarna.

---

## 3. Tipografi

| Peran | Font | Catatan |
|---|---|---|
| Antarmuka (judul, teks) | **Montserrat** (`next/font/google`, variabel `--font-montserrat`) | ganti dari Inter pada 2026-08-28 |
| Data (angka, skor, hash, label, tombol) | **JetBrains Mono** (`--font-jetbrains`) | wajib monospace — perbandingan antar-ronde adalah isi Layar 2 & 5 |

Dua keluarga saja. Angka **wajib** monospace-tabular.

**Utility kunci** (`globals.css`):

```css
.tabular {
  font-family: var(--font-jetbrains), ui-monospace, monospace;
  font-variant-numeric: tabular-nums;
}
```

**Skala yang dipakai** (dari wireframe Bab 5 — layar diputar sebagai video terkompresi, bukan monitor 27"):

| Ukuran | Kelas Tailwind | Pemakaian |
|---|---|---|
| 10px | `text-[10px] tracking-[0.18em] uppercase` | label bracket panel `[ LABEL ]`, header tabel |
| 11px | `text-[11px] tracking-wider uppercase` | label mikro, meta kartu, indikator API |
| 12px | `text-xs` | isi panel, tabel, tombol, sinyal |
| 14px | `text-sm` (base body `font-size: 14px`) | teks pesan percakapan, kalimat status |

**Kaidah:** label panel/kontrol = mono + UPPERCASE + `tracking-wider/widest`; judul tidak pernah lebih besar dari 14–16px — hierarki dibangun lewat **warna, tracking, dan posisi**, bukan ukuran raksasa.

---

## 4. Spasi, Bentuk & Lapisan

- **Grid spasi:** 4px base — gunakan kelipatan Tailwind (`p-2/3`, `gap-2/4`, `py-1.5`).
- **Border radius: `0` di mana pun.** Tidak ada `rounded-*` pada elemen dasbor (kecuali LED titik bila ada). Input, tombol, panel, kartu, chart tooltip = tajam.
- **Border:** 1px `soc-border` untuk semua permukaan; penekanan lewat `border-l-4` berwarna status (kartu feed, hard-negative) atau `border-2` (verdict).
- **Elevation = datar.** Tanpa `box-shadow`, tanpa gradien, tanpa blur. Kedalaman hanya dari pergeseran permukaan (`soc-bg` → `soc-panel`) dan border. (Pengecualian: `backdrop-blur` tipis pada header sticky agar teks tetap terbaca.)
- **Latar halaman:** `soc-bg` + grid titik halus:

```css
background-image: radial-gradient(rgba(148, 163, 184, 0.055) 1px, transparent 1px);
background-size: 22px 22px;
```

---

## 5. Elemen Identitas (HUD)

Bahasa tanda tangan dasbor — yang membuatnya terlihat "instrumen", bukan template:

1. **Kurung HUD 4 pojok** — pseudo-element `.hud-corners` menggambar bracket 10px di tiap pojok panel (warna `#44548A`, `pointer-events: none`).
2. **Label bracket** — judul panel selalu `[ LABEL ]`, mono 10px uppercase `tracking-[0.18em]`, `soc-muted`; tanda `[` `]` pada opasitas 50%.
3. **Tombol bracket** — tombol aksi utama bisa memakai tanda `[ ▶ REPLAY ]` (`<Button bracket>`), sesuai notasi wireframe Bab 5.
4. **Kursor konsol** — brand `SIAGA_` dengan garis bawah ungu berkedip (`.blink-cursor`, `steps(1)`, 1.1s).
5. **LED status** — kotak 6px (`h-1.5 w-1.5`) tanpa radius: hijau `allow` / merah `block` / abu saat memeriksa.
6. **Bar ASCII** — rincian sinyal memakai meter `▓▓▓▓▓▓▓░░░` (font mono) — aksesibel tanpa warna dan sangat "konsol".

---

## 6. Gerak (Motion)

| Animasi | Target | Aturan |
|---|---|---|
| `blink-cursor` | brand `SIAGA_` | satu-satunya animasi loop; steps(1), 1.1s |
| `animate-pulse` | skeleton loading | hanya saat data belum ada |
| `transition-colors` | tombol, tab, link | 150ms, state hover saja |
| — | **Chart Recharts** | `isAnimationActive={false}` — hasil jangan dimainkan |

Tidak ada animasi yang mensimulasikan hasil pengukuran (Bab 5 §0 "Jangan pernah palsu"). Replay demiliterisasi waktu hanya lewat `REPLAY_DELAY_MS = 700` antar-turn (jeda nyata, hasil tetap dari backend).

---

## 7. Komponen

### 7.1 Primitif — `frontend/src/components/ui/`

**`Panel`** — satu-satunya wadah panel. Menghapus semua duplikasi class panel.

```tsx
<Panel label="Signal breakdown · turn 4" actions={<>…</>} flush={false}>
  {children}
</Panel>
```

- Struktur: `border border-soc-border bg-soc-panel` + `.hud-corners`; header dengan label bracket + `actions` kanan; body `p-3` (atau `flush` tanpa padding untuk feed/tabel).
- Variasi: `className` tambahan bebas, `hud={false}` bila bracket tidak diinginkan.

**`Button`** — lima varian, semua mono uppercase `text-xs tracking-wider`, tajam, `disabled:opacity-40`:

| Varian | Gaya | Dipakai untuk |
|---|---|---|
| `primary` | solid `bg-allow text-white` | aksi utama (▶ Replay, Run self-play) |
| `ghost` | outline `soc-border` teks `soc-muted` | aksi sekunder (Stop, Reset, Copy) |
| `red` | outline `redai` + hover `bg-redai/10` | aksi milik Red-AI (Send to Live Guard) |
| `probe` | solid `bg-probe text-white` | aksi probe (Send simulated reply) |
| `solid` | solid terang `bg-soc-text text-soc-bg` | aksi pada permukaan terang (Send chat) |

Prop `bracket` menambahkan tanda `[ ]` di sekeliling label.

**`Select`** — satu class untuk semua dropdown: `border soc-border bg-soc-bg text-xs mono`, focus ring `probe`.

**`DecisionBadge`** — badge keputusan + ikon derajat: `○ <0.2 · ◔ <0.4 · ◑ <0.6 · ◕ <0.8 · ● ≥0.8`; PROBE selalu `⚡`. Warna & tint dari `DECISION_STYLE` (theme/colors.ts). Tooltip: `decision=… score=…`.

### 7.2 Keadaan layar — `components/layout/ScreenStates.tsx` (Bab 5 §9)

| Keadaan | Komponen | Gaya |
|---|---|---|
| Kosong | `EmptyState` | border dashed, teks `soc-muted`, aksi opsional |
| Error | `ErrorState` | `role="alert"`, border `block/50` + tint, tombol Try again |
| Memuat | `Skeleton` | `animate-pulse` per bagian — bukan spinner satu layar |
| Layanan mati | `ApiStatusBadge` merah | jujur, bukan berpura-pura hidup |

### 7.3 Komponen domain

**Kartu feed** (`ConversationFeed`) — tiga wajah:
- `user` (sisi publik terang): `bg-white border-slate-300` + **bilah aksen kiri `border-l-4` berwarna keputusan**; meta mono `T{n} · USER`; **dua skor wajib berdampingan** — momentum (CIM) vs per-message baseline (Bab 5 §2 desain #3).
- `assistant`: gelap `soc-bg`, label `PSYCHOBOT`.
- `probe`: `border-probe` tint ungu, label `⚡ SIAGA · REVERSE TURING PROBE`.

**`VerdictBar`** — komponen terpenting dasbor (Bab 5 §2 desain #2): headline mono status, daftar penjelasan per-turn, baris "Highest per-message baseline … stateless decision: …" + [Copy JSON] [Export].

**`SignalPanel`** — baris sinyal: label 144px + nilai mono + meter `▓░`; bagian anomali L0/L2; latensi **per lapis** (L0/L1/L2/CIM/total p95).

**Tabel** (`RoundSummaryTable`) — header mono 10px uppercase `tracking-widest`, garis horizontal tipis saja (tanpa zebra), baris `✗ REJECTED` wajib tampil dengan `bg-block/10` — bukti gerbang regresi.

**`HardNegativePool`** — kartu dengan bilah aksen oranye `redai` kiri + tombol `[Send to Live Guard →]` (handoff via `lib/handoff.ts`).

**Chart** (`components/charts/`) — semua warna dari `theme/colors.ts`:
- `MomentumChart`: 2 garis selalu — solid `soc-text` (stateful) vs dashed `nonnovel` (baseline); reference line PROBE 0.6 (dashed) & BLOCK 0.8 (solid); grid `soc-border`.
- `AsrTtdChart`: bar ASR `block` + garis TTD `redai`, dual Y-axis.
- `QuadrantScatter`: marker bentuk per kuadran — `▲ ✖ · ○` (blok/kros/dot/circle) — toggle detektor 1-sumbu memutar garis keputusan vertikal.

---

## 8. Tata Letak Layar

- Kontainer `max-w-7xl mx-auto px-4 py-5`; header sticky full-width.
- **Navigasi datar 5 tab** (Bab 5 §1) — urutan = urutan naskah video, tanpa hierarki:

| # | Tab | Peran naratif |
|---|---|---|
| 01 | Live Guard | demo utama — split-screen publik (terang) vs SOC (gelap) |
| 02 | Arena | klimaks teknis — Red-AI ⚔ Blue-AI |
| 03 | Two-Axis | penjelas FPR — provenance × intent |
| 04 | Probe | klimaks naratif — Reverse Turing Probe |
| 05 | Evidence | penutup — angka bisa diperiksa |

- Tab: mono 11px uppercase, nomor urut `01`–`05` opasitas 50%; **aktif = sakelar terbalik** `bg-soc-text text-soc-bg font-bold`.
- Grid dua kolom `lg:grid-cols-2` untuk pasangan chart/tabel; kiri terang & kanan gelap di Live Guard adalah kontras naratif yang disengaja (PRD §7.1).

---

## 9. Aksesibilitas — Syarat, Bukan Tambahan

1. **Warna tidak pernah satu-satunya penanda**: ikon derajat `○◔◑◕●`, marker bentuk `▲ ✖ · ○`, label teks uppercase.
2. **Kontras ≥ 4.5:1** seluruh teks (WCAG AA) di atas latar gelap; sisi terang memakai slate standar.
3. **Angka tabular mono** — kolom tabel sejajar antar-ronde.
4. **Ukuran minimum 11px** hanya untuk label mikro; teks konten 12–14px; angka kunci ditebalkan.
5. Navigasi keyboard utuh: tab berurutan (`<nav aria-label>`, `aria-current="page"`), state loading `aria-busy`, status `role="status"`, error `role="alert"`.

---

## 10. Do's & Don'ts

**Do**
- Ambil warna hanya dari `theme/colors.ts`; komponen baru dari primitif `ui/` dulu.
- Label bracket `[ … ]`, mono uppercase, sudut tajam, bilah aksen kiri untuk penekanan status.
- Setiap grafik punya padanan angka (tooltip/panel/tabel) — dasbor membaca, tidak menghitung ulang.

**Don't**
- ❌ `rounded-*` pada panel/kartu/tombol · ❌ `box-shadow` · ❌ gradien · ❌ blur (kecuali header sticky)
- ❌ hex literal di komponen/chart · ❌ warna di luar palet · ❌ font ketiga
- ❌ spinner satu layar · ❌ animasi hasil pengukuran · ❌ emoji sebagai ikon fungsional (ikon derajat & marker unicode yang sudah terdefinisi boleh)
- ❌ halaman/harga fitur di luar 5 layar: login, landing, dark-mode toggle, mobile — tidak dibangun (Bab 5 §11)

---

## 11. Peta Sumber Kebenaran

```
frontend/src/
├── theme/colors.ts          ← SUMBER TUNGGAL WARNA (diimpor tailwind + chart)
├── app/globals.css          ← latar grid titik, .tabular, .hud-corners, .blink-cursor
├── app/layout.tsx           ← pemuatan font (Montserrat + JetBrains Mono), <Header/>
├── tailwind.config.ts       ← palette = impor dari theme/colors.ts (bukan hex)
├── components/ui/           ← Panel, Button, Select, DecisionBadge
├── components/layout/       ← Header, TopNav, ApiStatusBadge, ScreenStates
├── components/charts/       ← MomentumChart, AsrTtdChart, QuadrantScatter
├── components/guard|arena/  ← komponen domain (feed, verdict, tabel, pool)
├── hooks/                   ← useLiveGuard (mesin replay), useApiResource
└── lib/                     ← api.ts, types.ts, format.ts, constants.ts, handoff.ts
```

**Tata kelola perubahan:**
1. Ganti/menambah warna → edit `theme/colors.ts` saja (Tailwind + chart ikut).
2. Primitif baru → tambah di `components/ui/`, dokumentasikan di sini (§7).
3. Setelah perubahan besar UI → jalankan `npx skillui --dir frontend` untuk audit ulang terhadap baseline; pastikan tidak muncul duplikasi/anti-pola lama.

---

*Dokumen ini menyertai `docs/05-konsep-web-ui.md`. Jika dua dokumen berbeda, Bab 5 menang untuk keputusan produk; DESIGN.md menang untuk eksekusi visual.*
