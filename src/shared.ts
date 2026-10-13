// Kode bersama untuk semua halaman (dimuat lebih dulu dengan atribut defer).
// Tidak memakai import/export supaya hasil kompilasi bisa dimuat langsung via <script defer>.

type Priority = "Normal" | "Lansia" | "Disabilitas" | "VIP";
type TicketStatus = "Menunggu" | "Dipanggil" | "Selesai" | "Dilewati";

interface QueueType {
  id: string;
  code: string; // 1 huruf kapital
  name: string;
  active: boolean;
  lastNumber: number; // nomor tiket terakhir yang diterbitkan
}

interface Ticket {
  id: string;
  queueId: string;
  label: string; // contoh: A-001
  number: number;
  priority: Priority;
  status: TicketStatus;
  createdAt: number;
  calledAt?: number;
}

interface Session {
  token: string;
  role: string;
  firstName: string;
}

namespace QS {
  export const KEY = {
    token: "auth_token",
    role: "auth_role",
    firstName: "auth_firstName",
    queues: "queue_types",
    tickets: "queue_tickets",
  } as const;

  export const PRIORITIES: Priority[] = ["Normal", "Lansia", "Disabilitas", "VIP"];

  const PRIORITY_RANK: Record<Priority, number> = { VIP: 0, Disabilitas: 1, Lansia: 2, Normal: 3 };
  const STATUS_RANK: Record<TicketStatus, number> = { Dipanggil: 0, Menunggu: 1, Dilewati: 2, Selesai: 3 };

  // ---------- Local Storage helpers ----------
  function read<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  }

  function write(key: string, value: unknown): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  // ---------- DOM helpers ----------
  export function $<T extends HTMLElement = HTMLElement>(id: string): T {
    return document.getElementById(id) as T;
  }

  export function el<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className = "",
    text = ""
  ): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  export function button(
    label: string,
    className: string,
    onClick: () => void,
    disabled = false
  ): HTMLButtonElement {
    const btn = el("button", className, label);
    btn.type = "button";
    btn.disabled = disabled;
    btn.addEventListener("click", onClick);
    return btn;
  }

  // ---------- Session ----------
  export function getSession(): Session | null {
    const token = localStorage.getItem(KEY.token);
    const role = localStorage.getItem(KEY.role);
    if (!token || !role) return null;
    return { token, role, firstName: localStorage.getItem(KEY.firstName) ?? "" };
  }

  export function saveSession(session: Session): void {
    localStorage.setItem(KEY.token, session.token);
    localStorage.setItem(KEY.role, session.role);
    localStorage.setItem(KEY.firstName, session.firstName);
  }

  export function clearSession(): void {
    localStorage.removeItem(KEY.token);
    localStorage.removeItem(KEY.role);
    localStorage.removeItem(KEY.firstName);
  }

  export function logout(): void {
    clearSession();
    window.location.replace("login.html");
  }

  // Moderator diperlakukan sama dengan admin.
  export function isAdmin(role: string): boolean {
    return role === "admin" || role === "moderator";
  }

  export function homeFor(role: string): string {
    return isAdmin(role) ? "index.html" : "operator.html";
  }

  // Auth guard: kembalikan session jika lolos, jika tidak redirect ke login.html.
  export function guard(adminOnly: boolean): Session | null {
    const session = getSession();
    if (!session || (adminOnly && !isAdmin(session.role))) {
      window.location.replace("login.html");
      return null;
    }
    return session;
  }

  // ---------- Jenis antrian ----------
  const DEFAULT_QUEUES: Array<[string, string]> = [
    ["A", "UMUM-1"],
    ["B", "UMUM-2"],
    ["C", "UMUM-3"],
    ["G", "GIGI"],
    ["F", "FARMASI"],
    ["P", "PSIKOLOG"],
  ];

  export function newId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  export function getQueues(): QueueType[] {
    // Data awal hanya dibuat sekali, saat key belum pernah ada.
    if (localStorage.getItem(KEY.queues) === null) {
      const seed: QueueType[] = DEFAULT_QUEUES.map(([code, name]) => ({
        id: newId(),
        code,
        name,
        active: true,
        lastNumber: 0,
      }));
      write(KEY.queues, seed);
    }
    return read<QueueType[]>(KEY.queues, []);
  }

  export function saveQueues(queues: QueueType[]): void {
    write(KEY.queues, queues);
  }

  // Mengembalikan pesan error, atau null jika berhasil.
  export function addQueue(rawCode: string, rawName: string): string | null {
    const code = rawCode.trim().toUpperCase();
    const name = rawName.trim();
    if (!/^[A-Z]$/.test(code)) return "Kode harus berupa 1 huruf (A-Z).";
    if (!name) return "Nama layanan wajib diisi.";

    const queues = getQueues();
    if (queues.some((q) => q.code.toLowerCase() === code.toLowerCase())) {
      return `Kode "${code}" sudah dipakai jenis antrian lain.`;
    }
    if (queues.some((q) => q.name.toLowerCase() === name.toLowerCase())) {
      return `Nama "${name}" sudah dipakai jenis antrian lain.`;
    }
    queues.push({ id: newId(), code, name, active: true, lastNumber: 0 });
    saveQueues(queues);
    return null;
  }

  export function toggleQueue(id: string): void {
    const queues = getQueues();
    const q = queues.find((item) => item.id === id);
    if (!q) return;
    q.active = !q.active;
    saveQueues(queues);
  }

  export function deleteQueue(id: string): void {
    saveQueues(getQueues().filter((q) => q.id !== id));
    saveTickets(getTickets().filter((t) => t.queueId !== id));
  }

  // Kosongkan semua tiket dan kembalikan penomoran ke awal.
  export function resetQueues(): void {
    saveTickets([]);
    saveQueues(getQueues().map((q) => ({ ...q, lastNumber: 0 })));
  }

  // ---------- Tiket ----------
  export function getTickets(): Ticket[] {
    return read<Ticket[]>(KEY.tickets, []);
  }

  export function saveTickets(tickets: Ticket[]): void {
    write(KEY.tickets, tickets);
  }

  export function compareWaiting(a: Ticket, b: Ticket): number {
    return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.number - b.number;
  }

  // Urutan tampil di daftar: dipanggil, menunggu (by prioritas), dilewati, selesai.
  export function compareForDisplay(a: Ticket, b: Ticket): number {
    if (a.status !== b.status) return STATUS_RANK[a.status] - STATUS_RANK[b.status];
    return a.status === "Menunggu" ? compareWaiting(a, b) : a.number - b.number;
  }

  export function waitingOf(tickets: Ticket[], queueId: string): Ticket[] {
    return tickets.filter((t) => t.queueId === queueId && t.status === "Menunggu").sort(compareWaiting);
  }

  export function calledOf(tickets: Ticket[], queueId: string): Ticket | undefined {
    return tickets.find((t) => t.queueId === queueId && t.status === "Dipanggil");
  }

  export function issueTicket(queueId: string, priority: Priority): Ticket | null {
    const queues = getQueues();
    const q = queues.find((item) => item.id === queueId);
    if (!q || !q.active) return null;

    q.lastNumber += 1;
    const ticket: Ticket = {
      id: newId(),
      queueId: q.id,
      label: `${q.code}-${String(q.lastNumber).padStart(3, "0")}`,
      number: q.lastNumber,
      priority,
      status: "Menunggu",
      createdAt: Date.now(),
    };
    const tickets = getTickets();
    tickets.push(ticket);
    saveQueues(queues);
    saveTickets(tickets);
    return ticket;
  }

  // Memanggil tiket tertentu; tiket yang sedang dipanggil di antrian yang sama otomatis Selesai.
  export function callTicket(ticketId: string): void {
    const tickets = getTickets();
    const target = tickets.find((t) => t.id === ticketId);
    if (!target || target.status !== "Menunggu") return;
    tickets.forEach((t) => {
      if (t.queueId === target.queueId && t.status === "Dipanggil") t.status = "Selesai";
    });
    target.status = "Dipanggil";
    target.calledAt = Date.now();
    saveTickets(tickets);
  }

  export function callNext(queueId: string): void {
    const next = waitingOf(getTickets(), queueId)[0];
    if (next) callTicket(next.id);
  }

  // Menutup tiket yang sedang dipanggil tanpa memanggil berikutnya.
  export function finishCalled(queueId: string): void {
    const tickets = getTickets();
    const called = calledOf(tickets, queueId);
    if (!called) return;
    called.status = "Selesai";
    saveTickets(tickets);
  }

  // Menandai tiket (menunggu / sedang dipanggil) sebagai Dilewati, misalnya karena tidak hadir.
  export function skipTicket(ticketId: string): void {
    const tickets = getTickets();
    const t = tickets.find((item) => item.id === ticketId);
    if (!t || (t.status !== "Menunggu" && t.status !== "Dipanggil")) return;
    t.status = "Dilewati";
    saveTickets(tickets);
  }
}
