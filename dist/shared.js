"use strict";
// Kode bersama untuk semua halaman (dimuat lebih dulu dengan atribut defer).
// Tidak memakai import/export supaya hasil kompilasi bisa dimuat langsung via <script defer>.
var QS;
(function (QS) {
    QS.KEY = {
        token: "auth_token",
        role: "auth_role",
        firstName: "auth_firstName",
        queues: "queue_types",
        tickets: "queue_tickets",
    };
    QS.PRIORITIES = ["Normal", "Lansia", "Disabilitas", "VIP"];
    const PRIORITY_RANK = { VIP: 0, Disabilitas: 1, Lansia: 2, Normal: 3 };
    const STATUS_RANK = { Dipanggil: 0, Menunggu: 1, Dilewati: 2, Selesai: 3 };
    // ---------- Local Storage helpers ----------
    function read(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw === null ? fallback : JSON.parse(raw);
        }
        catch {
            return fallback;
        }
    }
    function write(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }
    // ---------- DOM helpers ----------
    function $(id) {
        return document.getElementById(id);
    }
    QS.$ = $;
    function el(tag, className = "", text = "") {
        const node = document.createElement(tag);
        if (className)
            node.className = className;
        if (text)
            node.textContent = text;
        return node;
    }
    QS.el = el;
    function button(label, className, onClick, disabled = false) {
        const btn = el("button", className, label);
        btn.type = "button";
        btn.disabled = disabled;
        btn.addEventListener("click", onClick);
        return btn;
    }
    QS.button = button;
    // ---------- Session ----------
    function getSession() {
        const token = localStorage.getItem(QS.KEY.token);
        const role = localStorage.getItem(QS.KEY.role);
        if (!token || !role)
            return null;
        return { token, role, firstName: localStorage.getItem(QS.KEY.firstName) ?? "" };
    }
    QS.getSession = getSession;
    function saveSession(session) {
        localStorage.setItem(QS.KEY.token, session.token);
        localStorage.setItem(QS.KEY.role, session.role);
        localStorage.setItem(QS.KEY.firstName, session.firstName);
    }
    QS.saveSession = saveSession;
    function clearSession() {
        localStorage.removeItem(QS.KEY.token);
        localStorage.removeItem(QS.KEY.role);
        localStorage.removeItem(QS.KEY.firstName);
    }
    QS.clearSession = clearSession;
    function logout() {
        clearSession();
        window.location.replace("login.html");
    }
    QS.logout = logout;
    // Moderator diperlakukan sama dengan admin.
    function isAdmin(role) {
        return role === "admin" || role === "moderator";
    }
    QS.isAdmin = isAdmin;
    function homeFor(role) {
        return isAdmin(role) ? "index.html" : "operator.html";
    }
    QS.homeFor = homeFor;
    // Auth guard: kembalikan session jika lolos, jika tidak redirect ke login.html.
    function guard(adminOnly) {
        const session = getSession();
        if (!session || (adminOnly && !isAdmin(session.role))) {
            window.location.replace("login.html");
            return null;
        }
        return session;
    }
    QS.guard = guard;
    // ---------- Jenis antrian ----------
    const DEFAULT_QUEUES = [
        ["A", "UMUM-1"],
        ["B", "UMUM-2"],
        ["C", "UMUM-3"],
        ["G", "GIGI"],
        ["F", "FARMASI"],
        ["P", "PSIKOLOG"],
    ];
    function newId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    }
    QS.newId = newId;
    function getQueues() {
        // Data awal hanya dibuat sekali, saat key belum pernah ada.
        if (localStorage.getItem(QS.KEY.queues) === null) {
            const seed = DEFAULT_QUEUES.map(([code, name]) => ({
                id: newId(),
                code,
                name,
                active: true,
                lastNumber: 0,
            }));
            write(QS.KEY.queues, seed);
        }
        return read(QS.KEY.queues, []);
    }
    QS.getQueues = getQueues;
    function saveQueues(queues) {
        write(QS.KEY.queues, queues);
    }
    QS.saveQueues = saveQueues;
    // Mengembalikan pesan error, atau null jika berhasil.
    function addQueue(rawCode, rawName) {
        const code = rawCode.trim().toUpperCase();
        const name = rawName.trim();
        if (!/^[A-Z]$/.test(code))
            return "Kode harus berupa 1 huruf (A-Z).";
        if (!name)
            return "Nama layanan wajib diisi.";
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
    QS.addQueue = addQueue;
    function toggleQueue(id) {
        const queues = getQueues();
        const q = queues.find((item) => item.id === id);
        if (!q)
            return;
        q.active = !q.active;
        saveQueues(queues);
    }
    QS.toggleQueue = toggleQueue;
    function deleteQueue(id) {
        saveQueues(getQueues().filter((q) => q.id !== id));
        saveTickets(getTickets().filter((t) => t.queueId !== id));
    }
    QS.deleteQueue = deleteQueue;
    // Kosongkan semua tiket dan kembalikan penomoran ke awal.
    function resetQueues() {
        saveTickets([]);
        saveQueues(getQueues().map((q) => ({ ...q, lastNumber: 0 })));
    }
    QS.resetQueues = resetQueues;
    // ---------- Tiket ----------
    function getTickets() {
        return read(QS.KEY.tickets, []);
    }
    QS.getTickets = getTickets;
    function saveTickets(tickets) {
        write(QS.KEY.tickets, tickets);
    }
    QS.saveTickets = saveTickets;
    function compareWaiting(a, b) {
        return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.number - b.number;
    }
    QS.compareWaiting = compareWaiting;
    // Urutan tampil di daftar: dipanggil, menunggu (by prioritas), dilewati, selesai.
    function compareForDisplay(a, b) {
        if (a.status !== b.status)
            return STATUS_RANK[a.status] - STATUS_RANK[b.status];
        return a.status === "Menunggu" ? compareWaiting(a, b) : a.number - b.number;
    }
    QS.compareForDisplay = compareForDisplay;
    function waitingOf(tickets, queueId) {
        return tickets.filter((t) => t.queueId === queueId && t.status === "Menunggu").sort(compareWaiting);
    }
    QS.waitingOf = waitingOf;
    function calledOf(tickets, queueId) {
        return tickets.find((t) => t.queueId === queueId && t.status === "Dipanggil");
    }
    QS.calledOf = calledOf;
    function issueTicket(queueId, priority) {
        const queues = getQueues();
        const q = queues.find((item) => item.id === queueId);
        if (!q || !q.active)
            return null;
        q.lastNumber += 1;
        const ticket = {
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
    QS.issueTicket = issueTicket;
    // Memanggil tiket tertentu; tiket yang sedang dipanggil di antrian yang sama otomatis Selesai.
    function callTicket(ticketId) {
        const tickets = getTickets();
        const target = tickets.find((t) => t.id === ticketId);
        if (!target || target.status !== "Menunggu")
            return;
        tickets.forEach((t) => {
            if (t.queueId === target.queueId && t.status === "Dipanggil")
                t.status = "Selesai";
        });
        target.status = "Dipanggil";
        target.calledAt = Date.now();
        saveTickets(tickets);
    }
    QS.callTicket = callTicket;
    function callNext(queueId) {
        const next = waitingOf(getTickets(), queueId)[0];
        if (next)
            callTicket(next.id);
    }
    QS.callNext = callNext;
    // Menutup tiket yang sedang dipanggil tanpa memanggil berikutnya.
    function finishCalled(queueId) {
        const tickets = getTickets();
        const called = calledOf(tickets, queueId);
        if (!called)
            return;
        called.status = "Selesai";
        saveTickets(tickets);
    }
    QS.finishCalled = finishCalled;
    // Menandai tiket (menunggu / sedang dipanggil) sebagai Dilewati, misalnya karena tidak hadir.
    function skipTicket(ticketId) {
        const tickets = getTickets();
        const t = tickets.find((item) => item.id === ticketId);
        if (!t || (t.status !== "Menunggu" && t.status !== "Dipanggil"))
            return;
        t.status = "Dilewati";
        saveTickets(tickets);
    }
    QS.skipTicket = skipTicket;
})(QS || (QS = {}));
