# 🎬 PsychoBot & SIAGA — 3-Minute English Video Presentation & Demo Script

**Project Title:** PsychoBot Clinical Care & SIAGA Guardrail Platform  
**Target Duration:** 2:45 – 3:00 Minutes (Total ~180 Seconds)  
**Format:** 3-Speaker Interactive Presentation & Live Screen Demonstration  
**Reference Alignment:** Hackathon Evaluation Rubric & Product Requirements Document (`Modules/`)

---

## 👥 Speaker Roles & Responsibilities
* **Speaker 1 (S1) — Product Lead & Problem Architect:**  
  *Covers Point 1 (Problem Statement) & Point 2 (Proposed Solution Overview).*
* **Speaker 2 (S2) — AI & Security Engineer:**  
  *Covers Point 3 (Live System Demonstration: Patient Experience, Multi-Turn Attack, SIAGA Engine, Doctor & SOC Portal).*
* **Speaker 3 (S3) — Clinical Lead & Strategist:**  
  *Covers Point 4 (Pathway to Feasibility & MVP Roadmap) & Point 5 (Impactful 30-Second Wrap-Up).*

---

## ⏱️ Detailed Video Timeline & Script

```
┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│ TIMELINE BREAKDOWN (180s Total)                                                               │
│ [00:00 - 00:45] S1: Problem Statement & Proposed Solution Overview (45s)                       │
│ [00:45 - 01:50] S2: Live Demonstration — Patient, Multi-Turn Attack, SIAGA Engine, SOC (65s)   │
│ [01:50 - 02:30] S3: Pathway to Feasibility & 3-Phase MVP Roadmap (40s)                         │
│ [02:30 - 03:00] S1, S2, S3: 30-Second High-Impact Wrap-Up & Closing (30s)                      │
└────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### ⏱️ [00:00 – 00:45] Part 1: Problem Statement & Proposed Solution (Speaker 1)

> **🎥 Visual Scene & Action Cue:**
> * **[00:00 – 00:18]** Wide camera angle of Speaker 1 in professional attire. On-screen graphic overlay: Statistics on the mental healthcare accessibility gap in Indonesia (1 psychiatrist per 200,000 people) alongside red alert badges depicting LLM data exfiltration vulnerabilities.
> * **[00:18 – 00:45]** Picture-in-picture transition showing the PsychoBot landing page and an animated architectural flow diagram: *User Input $\rightarrow$ SIAGA L0–L3 Gateway $\rightarrow$ Local LLM $\rightarrow$ Streamed Response*.

* **Speaker 1 (S1)**:  
  *"Distinguished judges and fellow innovators. Mental healthcare in Indonesia faces a critical accessibility gap. While AI-driven chatbots present a transformative solution, deploying Large Language Models in clinical psychology introduces severe, life-critical risks:*  
  ***First, patient privacy violations** through third-party cloud processing.  
  ***Second, vulnerability to multi-turn social engineering**—where malicious actors gradually manipulate AI personas across consecutive turns to extract confidential patient trauma records and bypass clinical safety constraints."*

* **Speaker 1 (S1)**:  
  *"Traditional AI safety filters are **stateless**—they inspect isolated messages in a vacuum and are completely blind to cumulative risk.  
  To solve this, we built **PsychoBot Clinical Care**, powered by **SIAGA (Stateful Intent-Aware Guardrail Architecture)**: an end-to-end clinical counseling web platform integrating sovereign on-premise Local LLMs with a defense-in-depth, stateful security gateway that guarantees **Zero-Plaintext Session Retention**."*

---

### ⏱️ [00:45 – 01:50] Part 2: Live Demonstration & Guardrail Action (Speaker 2)

> **🎥 Visual Scene & Action Cue:**
> * **[00:45 – 01:05]** Seamless cut to Screen Capture (1080p). S2 navigates the live web application (`localhost:3000`):
>   1. Logs in as a Patient.
>   2. Submits standardized **PHQ-9 & GAD-7** clinical assessments (instant server-side scoring & severity grading).
>   3. Initiates a Live Chat session with real-time SSE token streaming powered by the local on-premise model (`qwen3:1.7b` via Ollama).
> * **[01:05 – 01:30]** S2 switches to a simulated multi-turn adversarial scenario:
>   * *Turn 1:* Polite greeting asking about documentation $\rightarrow$ Status: `ALLOW`.
>   * *Turn 2:* Probing medical record database structure $\rightarrow$ Status: `WATCH` (risk score elevates, momentum curve rises).
>   * *Turn 3:* Coercive prompt injection impersonating a clinical supervisor demanding raw patient trauma records $\rightarrow$ Status: `PROBE` (Reverse Turing Challenge triggered requiring doctor license verification).
>   * *Turn 4:* Escalation persists $\rightarrow$ Status: `BLOCK` (Session locked with safe clinical disclaimer before any data leak occurs).
> * **[01:30 – 01:50]** Quick switch to the **Doctor DPJP Portal** (patient clinical records) and **SOC Security Telemetry Dashboard** (Live Guard Monitor, CIM momentum trajectory charts, and p95 guardrail latency <25ms).

* **Speaker 2 (S2)**:  
  *"Let's see PsychoBot and SIAGA in action live.*  
  *For patients, PsychoBot offers standardized diagnostic instruments like **PHQ-9 and GAD-7**, providing instant severity grading before starting confidential counseling. The chat connects directly to our on-premise **Local LLM**, streaming empathetic, clinical-first responses with zero reliance on external APIs.*

* **Speaker 2 (S2)**:  
  *Now, watch what happens when an attacker attempts a gradual, multi-turn data exfiltration to steal medical records:*  
  *Every message passes through SIAGA’s 4-stage pipeline:*  
  *1. **L0 Sanitization:** stripping invisible Unicode homoglyphs (UTS #39).*  
  *2. **L1 Dual-Axis ONNX Classifier:** analyzing coercive intent at sub-60ms CPU latency.*  
  *3. **L3 CIM Engine (Cumulative Intent Momentum):** tracking the multi-turn vector trajectory in DuckDB.*  
  *Notice how the system transitions from `ALLOW` to `WATCH`. As the attack escalates, SIAGA injects an active **Reverse Turing Probe** to challenge clinical credentials, and instantly executes a **BLOCK**—neutralizing the threat before sensitive patient data is ever touched!*  
  *All incident telemetry and momentum curves are visualized in real time on our **SOC Security Console**, while psychiatrists access verified clinical notes through the **Doctor DPJP Portal**."*

---

### ⏱️ [01:50 – 02:30] Part 3: Pathway & Feasibility to MVP (Speaker 3)

> **🎥 Visual Scene & Action Cue:**
> * **[01:50 – 02:30]** Speaker 3 on camera with clean on-screen motion graphics displaying the **3-Phase Roadmap**, architecture scalability metrics, and regulatory compliance badges (Indonesia PDP Law & HIPAA principles).

* **Speaker 3 (S3)**:  
  *"How do we take PsychoBot from prototype to national deployment? Our pathway is structured across three viable milestones:*

  * **Phase 1 (Our Current MVP):** A lightweight, self-contained, and CPU-efficient on-premise architecture with zero-plaintext DuckDB storage—making deployment feasible for local healthcare facilities without costly GPU infrastructure.
  * **Phase 2 (Clinical Integration):** Connecting real-time doctor license verification with the Indonesian Medical Council (KKI) registry and standardizing clinical record interoperability with the Ministry of Health’s **SatuSehat** ecosystem.
  * **Phase 3 (Enterprise Scale):** Deploying federated nodes across psychiatric hospitals and university counseling centers, guaranteeing sovereign data privacy under Indonesian Personal Data Protection (PDP) regulations."*

---

### ⏱️ [02:30 – 03:00] Part 4: 30-Second High-Impact Wrap-Up (All Speakers)

> **🎥 Visual Scene & Action Cue:**
> * **[02:30 – 03:00]** Camera zooms out to all 3 Speakers standing together side-by-side. Dynamic background displaying the PsychoBot interface and SIAGA security shield. Coordinated and energetic delivery.

* **Speaker 1 (S1)**:  
  *"Mental healthcare requires absolute empathy, and digital trust requires uncompromised security."*

* **Speaker 2 (S2)**:  
  *"With PsychoBot and SIAGA, we prove that AI counseling can be responsive and human-centric..."*

* **Speaker 3 (S3)**:  
  *"...while remaining sovereign, resilient, and protective of human dignity.*  
  *We are Team SIAGA, bringing safe, ethical, and trustworthy AI to Indonesia. Thank you!"*

---

## 🎙️ Speaker Delivery & Pronunciation Guide

| Term / Abbreviation | Phonetic Pronunciation | Meaning in Script |
|---|---|---|
| **SIAGA** | *see-AH-gah* | Stateful Intent-Aware Guardrail Architecture |
| **PsychoBot** | *SY-ko-bot* | Clinical Counseling Digital Platform |
| **PHQ-9 / GAD-7** | *P-H-Q nine / G-A-D seven* | Clinical Depression & Anxiety Screening Tools |
| **ONNX** | *ON-iks* | Open Neural Network Exchange (Lightweight ML format) |
| **CIM** | *C-I-M (see-eye-em)* | Cumulative Intent Momentum Engine |
| **DPJP** | *D-P-J-P* | Dokter Penanggung Jawab Pelayanan (Attending Physician) |
| **SOC** | *S-O-C (es-oh-see)* | Security Operations Center Dashboard |
| **SatuSehat** | *SAH-too SEH-haht* | Indonesian Ministry of Health National Data Platform |
| **PDP Law** | *P-D-P Law* | UU Perlindungan Data Pribadi (Personal Data Protection) |

---

## 🎬 Production Checklist:
1. **Pacing:** Aim for ~130–140 words per minute.
2. **Visual Recording:** Record live screen demo at 1080p 60fps with clear audio balance.
3. **Cursor Highlights:** During S2’s demo, highlight the **CIM Curve Chart** and the **Status Badge change** (`ALLOW` $\rightarrow$ `WATCH` $\rightarrow$ `PROBE` $\rightarrow$ `BLOCK`).
