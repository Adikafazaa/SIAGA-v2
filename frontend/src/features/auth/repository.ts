// Repository Pattern untuk autentikasi SIAGA v2.
// Mode Demo/Lokal: autentikasi instan berbasis localStorage & token dev.
// Mendukung akun demo cepat (Pasien, Dokter, Admin) serta input sembarang email dummy.

import type { AppUser, Role } from "@/lib/types";

export interface AuthRepository {
  readonly isMock: boolean;
  onAuthStateChanged(cb: (user: AppUser | null) => void): () => void;
  signInWithGoogle(): Promise<AppUser | null>;
  signInWithEmail(email: string, password: string): Promise<AppUser>;
  signUpWithEmail(email: string, password: string, role: Role | null): Promise<AppUser>;
  signOut(): Promise<void>;
  getProfile(uid: string): Promise<AppUser>;
  updateProfile(uid: string, patch: Partial<AppUser>): Promise<AppUser>;
  getAuthToken(): Promise<string | null>;
}

// --- Implementasi Demo / Dummy Auth (localStorage) -----------------------------

const USERS_KEY = "siaga.demo.users";
const SESSION_KEY = "siaga.demo.session";

interface DemoRecord {
  password: string;
  user: AppUser;
}

function loadUsers(): Record<string, DemoRecord> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(USERS_KEY) ?? "{}") as Record<string, DemoRecord>;
  } catch {
    return {};
  }
}

function saveUsers(users: Record<string, DemoRecord>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function seedDemoUsers() {
  const users = loadUsers();
  const base = {
    provider: "password" as const,
    onboardingCompleted: true,
    createdAt: Date.now() - 86_400_000 * 14,
    lastLoginAt: Date.now(),
  };

  if (!users["pasien@demo.siaga"]) {
    users["pasien@demo.siaga"] = {
      password: "demo1234",
      user: {
        ...base,
        uid: "demo-patient",
        displayName: "Andi Pratama (Pasien)",
        email: "pasien@demo.siaga",
        role: "patient",
        counselingPreferences: ["CBT (Kognitif Perilaku)"],
        preferredSlot: "Sore (15.00–18.00)",
      },
    };
  }

  if (!users["dokter@demo.siaga"]) {
    users["dokter@demo.siaga"] = {
      password: "demo1234",
      user: {
        ...base,
        uid: "demo-doctor",
        displayName: "dr. Maya Sp.KJ (Dokter)",
        email: "dokter@demo.siaga",
        role: "doctor",
        doctorLicenseId: "87654321",
        specialization: "Psikiatri Dewasa",
      },
    };
  }

  if (!users["admin@demo.siaga"]) {
    users["admin@demo.siaga"] = {
      password: "demo1234",
      user: {
        ...base,
        uid: "demo-admin",
        displayName: "SOC Operator (Admin)",
        email: "admin@demo.siaga",
        role: "admin",
      },
    };
  }

  saveUsers(users);
}

class DemoAuthRepository implements AuthRepository {
  readonly isMock = true;
  private listeners = new Set<(user: AppUser | null) => void>();
  private current: AppUser | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      seedDemoUsers();
      const session = window.localStorage.getItem(SESSION_KEY);
      if (session) {
        const users = loadUsers();
        const rec = users[session.toLowerCase()];
        this.current = rec ? { ...rec.user, lastLoginAt: Date.now() } : null;
      }
    }
  }

  private notify() {
    this.listeners.forEach((cb) => cb(this.current));
  }

  private setSession(user: AppUser | null) {
    this.current = user;
    if (typeof window !== "undefined") {
      if (user) {
        const users = loadUsers();
        const rec = users[user.email.toLowerCase()];
        if (rec) rec.user = user;
        else {
          users[user.email.toLowerCase()] = { password: "password", user };
        }
        saveUsers(users);
        window.localStorage.setItem(SESSION_KEY, user.email.toLowerCase());
      } else {
        window.localStorage.removeItem(SESSION_KEY);
      }
    }
    this.notify();
  }

  onAuthStateChanged(cb: (user: AppUser | null) => void): () => void {
    this.listeners.add(cb);
    const t = setTimeout(() => cb(this.current), 100);
    return () => {
      clearTimeout(t);
      this.listeners.delete(cb);
    };
  }

  async signInWithGoogle(): Promise<AppUser | null> {
    await new Promise((r) => setTimeout(r, 200));
    const email = "google.user@demo.siaga";
    const users = loadUsers();
    let rec = users[email];
    if (!rec) {
      rec = {
        password: "",
        user: {
          uid: `demo-google-${Date.now().toString(36)}`,
          displayName: "Pengguna Google (Demo)",
          email,
          photoURL: null,
          provider: "google",
          role: "patient",
          onboardingCompleted: true,
          doctorLicenseId: null,
          specialization: null,
          createdAt: Date.now(),
          lastLoginAt: Date.now(),
        },
      };
      users[email] = rec;
      saveUsers(users);
    }
    this.setSession({ ...rec.user, lastLoginAt: Date.now() });
    return this.current;
  }

  async signInWithEmail(email: string, password: string): Promise<AppUser> {
    await new Promise((r) => setTimeout(r, 200));
    const key = email.trim().toLowerCase();
    const users = loadUsers();
    let rec = users[key];

    // Jika email belum ada di database demo lokal, otomatis buatkan akun dummy
    if (!rec) {
      const isDoctor = key.includes("dokter") || key.includes("doctor");
      const isAdmin = key.includes("admin") || key.includes("soc");
      const role: Role = isAdmin ? "admin" : isDoctor ? "doctor" : "patient";

      const newUser: AppUser = {
        uid: `demo-${key.split("@")[0] || Date.now().toString(36)}`,
        displayName: key.split("@")[0] || "Pengguna",
        email: key,
        photoURL: null,
        provider: "password",
        role,
        onboardingCompleted: true,
        doctorLicenseId: isDoctor ? "87654321" : null,
        specialization: isDoctor ? "Psikiatri Umum" : null,
        createdAt: Date.now(),
        lastLoginAt: Date.now(),
      };
      rec = { password: password || "demo1234", user: newUser };
      users[key] = rec;
      saveUsers(users);
    }

    this.setSession({ ...rec.user, lastLoginAt: Date.now() });
    return this.current!;
  }

  async signUpWithEmail(email: string, password: string, role: Role | null): Promise<AppUser> {
    await new Promise((r) => setTimeout(r, 200));
    const users = loadUsers();
    const key = email.trim().toLowerCase();
    const isDoctor = role === "doctor" || key.includes("dokter") || key.includes("doctor");

    const user: AppUser = {
      uid: `demo-${key.split("@")[0] || Date.now().toString(36)}`,
      displayName: key.split("@")[0] || "Pengguna",
      email: key,
      photoURL: null,
      provider: "password",
      role: role ?? "patient",
      onboardingCompleted: false,
      doctorLicenseId: isDoctor ? "87654321" : null,
      specialization: isDoctor ? "Psikiatri Umum" : null,
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
    };
    users[key] = { password, user };
    saveUsers(users);
    this.setSession(user);
    return user;
  }

  async signOut() {
    await new Promise((r) => setTimeout(r, 100));
    this.setSession(null);
  }

  async getProfile(uid: string): Promise<AppUser> {
    const found = Object.values(loadUsers()).find((r) => r.user.uid === uid);
    if (!found) {
      return {
        uid,
        displayName: "Pengguna",
        email: `${uid}@demo.siaga`,
        photoURL: null,
        provider: "password",
        role: "patient",
        onboardingCompleted: true,
        createdAt: Date.now(),
      };
    }
    return found.user;
  }

  async updateProfile(uid: string, patch: Partial<AppUser>): Promise<AppUser> {
    const users = loadUsers();
    const rec = Object.values(users).find((r) => r.user.uid === uid);
    if (!rec) {
      const user: AppUser = {
        uid,
        displayName: patch.displayName || "Pengguna",
        email: patch.email || `${uid}@demo.siaga`,
        photoURL: null,
        provider: "password",
        role: patch.role || "patient",
        onboardingCompleted: true,
        createdAt: Date.now(),
        ...patch,
      };
      users[user.email.toLowerCase()] = { password: "password", user };
      saveUsers(users);
      if (this.current?.uid === uid) this.setSession(user);
      return user;
    }
    rec.user = { ...rec.user, ...patch };
    saveUsers(users);
    if (this.current?.uid === uid) this.setSession(rec.user);
    return rec.user;
  }

  async getAuthToken() {
    return this.current ? `dev-${this.current.uid}` : null;
  }
}

// --- Factory ------------------------------------------------------------------

let _repo: AuthRepository | null = null;

export function getAuthRepository(): AuthRepository {
  if (!_repo) {
    _repo = new DemoAuthRepository();
  }
  return _repo;
}
