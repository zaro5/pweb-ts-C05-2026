type Priority = "normal" | "lansia" | "disabilitas" | "vip";
type TicketStatus = "waiting" | "called" | "done" | "skipped";

interface QueueType {
  id: string;
  code: string;
  name: string;
  active: boolean;
}

interface Ticket {
  id: string;
  typeId: string;
  code: string;
  number: number;
  label: string;
  priority: Priority;
  status: TicketStatus;
  createdAt: number;
  calledAt?: number;
}

const QUEUE_STORAGE_TYPES = "queue_types";
const QUEUE_STORAGE_TICKETS = "queue_tickets";
const QUEUE_STORAGE_COUNTERS = "queue_counters";

function queueParseJson<T>(key: string, fallback: T): T {
  try {
    const rawValue = localStorage.getItem(key);
    if (rawValue === null) return fallback;
    return JSON.parse(rawValue) as T;
  } catch {
    return fallback;
  }
}

function getQueueTypes(): QueueType[] {
  const value = queueParseJson<unknown>(QUEUE_STORAGE_TYPES, []);
  return Array.isArray(value) ? value as QueueType[] : [];
}

function getTickets(): Ticket[] {
  const value = queueParseJson<unknown>(QUEUE_STORAGE_TICKETS, []);
  return Array.isArray(value) ? value as Ticket[] : [];
}

function saveTickets(tickets: Ticket[]): void {
  try {
    localStorage.setItem(QUEUE_STORAGE_TICKETS, JSON.stringify(tickets));
  } catch {
    // Storage may be unavailable or full; callers can continue without a crash.
  }
}

function getCounters(): Record<string, number> {
  const value = queueParseJson<unknown>(QUEUE_STORAGE_COUNTERS, {});
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, number>
    : {};
}

function saveCounters(counters: Record<string, number>): void {
  try {
    localStorage.setItem(QUEUE_STORAGE_COUNTERS, JSON.stringify(counters));
  } catch {
    // Storage may be unavailable or full; callers can continue without a crash.
  }
}

function seedIfEmpty(): void {
  const initialTypes: QueueType[] = [
    { id: "umum-1", code: "A", name: "UMUM-1", active: true },
    { id: "umum-2", code: "B", name: "UMUM-2", active: true },
    { id: "umum-3", code: "C", name: "UMUM-3", active: true },
    { id: "gigi", code: "G", name: "GIGI", active: true },
    { id: "farmasi", code: "F", name: "FARMASI", active: true },
    { id: "psikolog", code: "P", name: "PSIKOLOG", active: true }
  ];

  try {
    if (localStorage.getItem(QUEUE_STORAGE_TYPES) === null) {
      localStorage.setItem(QUEUE_STORAGE_TYPES, JSON.stringify(initialTypes));
    }
    if (localStorage.getItem(QUEUE_STORAGE_TICKETS) === null) {
      localStorage.setItem(QUEUE_STORAGE_TICKETS, "[]");
    }
    if (localStorage.getItem(QUEUE_STORAGE_COUNTERS) === null) {
      localStorage.setItem(QUEUE_STORAGE_COUNTERS, "{}");
    }
  } catch {
    // Public pages still render their empty state if browser storage is blocked.
  }
}

function formatLabel(code: string, number: number): string {
  return `${code}-${String(number).padStart(3, "0")}`;
}

function priorityLabel(priority: Priority): string {
  const labels: Record<Priority, string> = {
    normal: "Normal",
    lansia: "Lansia",
    disabilitas: "Disabilitas",
    vip: "VIP"
  };
  return labels[priority];
}