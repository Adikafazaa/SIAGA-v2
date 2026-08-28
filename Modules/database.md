# Database Schema & Structure

## Koleksi Cloud Firestore

### 1. `users`
- `uid` (string, Primary Key)
- `displayName` (string)
- `email` (string)
- `photoURL` (string)
- `provider` (string: "google" | "password")
- `role` (enum: "patient" | "doctor" | "admin")
- `doctorLicenseId` (string, nullable - No SIP)
- `onboardingCompleted` (boolean)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)
- `lastLoginAt` (timestamp)

### 2. `chatSessions`
- `sessionId` (string, Primary Key)
- `patientUid` (string)
- `title` (string)
- `status` (enum: "active" | "flagged" | "blocked" | "archived")
- `createdAt` (timestamp)
- `lastActivityAt` (timestamp)

### 3. `clinicalAssessments`
- `assessmentId` (string, Primary Key)
- `patientUid` (string)
- `type` (enum: "PHQ-9" | "GAD-7")
- `totalScore` (number)
- `severityLevel` (string)
- `answers` (map)
- `completedAt` (timestamp)

### 4. `medicalRecords`
- `recordId` (string, Primary Key)
- `patientUid` (string)
- `assignedDoctorUid` (string)
- `notes` (string, encrypted)
- `updatedAt` (timestamp)

### 5. `securityLogs`
- `logId` (string, Primary Key)
- `sessionId` (string)
- `riskScore` (number)
- `decision` (string: "ALLOW" | "PROBE" | "BLOCK")
- `explanation` (string)
- `timestamp` (timestamp)

## Skema Session Cache Guardrail (DuckDB / Memory)
- `session_id` (VARCHAR)
- `turn_index` (INTEGER)
- `vector_embedding` (FLOAT[384])
- `risk_score` (FLOAT)
- `momentum` (FLOAT)
- `direction` (FLOAT)
- `anchor_score` (FLOAT)
- `token_hash` (VARCHAR - SHA-256)
- `created_at` (TIMESTAMP)