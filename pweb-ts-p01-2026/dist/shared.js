"use strict";
const QUEUE_STORAGE_TYPES = "queue_types";
const QUEUE_STORAGE_TICKETS = "queue_tickets";
const QUEUE_STORAGE_COUNTERS = "queue_counters";
function queueParseJson(key, fallback) {
    try {
        const rawValue = localStorage.getItem(key);
        if (rawValue === null)
            return fallback;
        return JSON.parse(rawValue);
    }
    catch {
        return fallback;
    }
}
function getQueueTypes() {
    const value = queueParseJson(QUEUE_STORAGE_TYPES, []);
    return Array.isArray(value) ? value : [];
}
function getTickets() {
    const value = queueParseJson(QUEUE_STORAGE_TICKETS, []);
    return Array.isArray(value) ? value : [];
}
function saveTickets(tickets) {
    try {
        localStorage.setItem(QUEUE_STORAGE_TICKETS, JSON.stringify(tickets));
    }
    catch {
        // Storage may be unavailable or full; callers can continue without a crash.
    }
}
function getCounters() {
    const value = queueParseJson(QUEUE_STORAGE_COUNTERS, {});
    return typeof value === "object" && value !== null && !Array.isArray(value)
        ? value
        : {};
}
function saveCounters(counters) {
    try {
        localStorage.setItem(QUEUE_STORAGE_COUNTERS, JSON.stringify(counters));
    }
    catch {
        // Storage may be unavailable or full; callers can continue without a crash.
    }
}
function seedIfEmpty() {
    const initialTypes = [
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
    }
    catch {
        // Public pages still render their empty state if browser storage is blocked.
    }
}
function formatLabel(code, number) {
    return `${code}-${String(number).padStart(3, "0")}`;
}
function priorityLabel(priority) {
    const labels = {
        normal: "Normal",
        lansia: "Lansia",
        disabilitas: "Disabilitas",
        vip: "VIP"
    };
    return labels[priority];
}
