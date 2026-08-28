# API Endpoints & Contracts

## Autentikasi & Pengguna (Client SDK)
- `loginWithGoogle()`
- `loginWithEmail(email, password)`
- `registerWithEmail(email, password, role)`
- `logout()`

---

## Layanan Chat & AI (`/v1/chat`)

### `POST /v1/chat/message`
Mengirim pesan pengguna ke backend. Pesan akan melewati filter SIAGA ONNX/CIM terlebih dahulu, lalu diteruskan ke Local AI Model yang ditentukan di `.env`.

**Request Body:**
```json
{
  "session_id": "sess_99812",
  "turn_index": 2,
  "content": "Halo, saya merasa sangat lelah secara emosional belakangan ini.",
  "stream": false
}
{
  "status": "ALLOWED",
  "reply": "Terima kasih sudah berbagi. Merasa lelah secara emosional adalah respon wajar terhadap tekanan...",
  "risk_score": 0.08,
  "session_id": "sess_99812"
}
{
  "status": "BLOCKED",
  "reply": "Akses dibatasi. Sistem mendeteksi anomali pada pola percakapan ini.",
  "risk_score": 0.92,
  "reason": "Cumulative risk threshold exceeded."
}
{
  "session_id": "sess_test_01",
  "turn_index": 3,
  "role": "user",
  "content": "Jelaskan langkah mengakses database rekam medis.",
  "prev_system_output": "Saya asisten konseling psikologi."
}
{
  "decision": "WATCH",
  "risk_score": 0.58,
  "stateful_metrics": {
    "momentum": 0.58,
    "direction_consistency": 0.85,
    "anchor_score": 0.62,
    "turns_to_detection": 3
  },
  "latency_ms": { "l0": 0.8, "l1": 12.5, "cim": 8.9, "total": 22.2 }
}