"use strict";
(() => {
    // Auth Guard & Role Guard (hanya admin/moderator)
    const session = QS.guard(true);
    if (!session)
        return;
    document.body.classList.remove("guarding");
    const typeForm = QS.$("type-form");
    const typeCode = QS.$("type-code");
    const typeName = QS.$("type-name");
    const typeMsg = QS.$("type-msg");
    const typeList = QS.$("type-list");
    const ticketForm = QS.$("ticket-form");
    const ticketType = QS.$("ticket-type");
    const ticketPriority = QS.$("ticket-priority");
    const ticketMsg = QS.$("ticket-msg");
    const ticketList = QS.$("ticket-list");
    // ===== Navigation Bar =====
    QS.$("user-info").textContent = `${session.firstName} (${session.role})`;
    QS.$("btn-logout").addEventListener("click", () => QS.logout());
    // ===== Helper pesan =====
    function flash(box, text, kind) {
        box.textContent = text;
        box.className = `adm-msg ${kind}`;
        box.hidden = false;
    }
    function clearFlash(box) {
        box.hidden = true;
        box.textContent = "";
    }
    // Opsi prioritas diisi dari shared.ts supaya selalu sinkron
    QS.PRIORITIES.forEach((p) => {
        const opt = QS.el("option", "", p);
        opt.value = p;
        ticketPriority.append(opt);
    });
    // ===== Render: daftar jenis antrian =====
    function renderTypes() {
        const queues = QS.getQueues();
        const tickets = QS.getTickets();
        typeList.replaceChildren();
        if (queues.length === 0) {
            typeList.append(QS.el("li", "muted small", "Belum ada jenis antrian."));
            return;
        }
        queues.forEach((q) => {
            const title = QS.el("div", "adm-type-title");
            title.append(QS.el("strong", "", q.name), QS.el("span", "muted", ` (${q.code})`));
            if (!q.active)
                title.append(QS.el("span", "adm-badge off", "Nonaktif"));
            const info = QS.el("div");
            info.append(title, QS.el("div", "muted small", `${QS.waitingOf(tickets, q.id).length} menunggu`));
            const actions = QS.el("div", "adm-row-actions");
            actions.append(QS.button(q.active ? "Nonaktifkan" : "Aktifkan", "btn btn-outline adm-sm", () => {
                QS.toggleQueue(q.id);
                renderAll();
            }), QS.button("Hapus", "btn btn-outline adm-sm adm-danger", () => {
                if (!window.confirm(`Hapus jenis antrian "${q.name}"? Semua tiketnya ikut terhapus.`))
                    return;
                QS.deleteQueue(q.id);
                renderAll();
            }));
            const item = QS.el("li", "adm-type-item");
            item.append(info, actions);
            typeList.append(item);
        });
    }
    // ===== Render: dropdown (hanya jenis yang aktif) =====
    function renderSelect() {
        const previous = ticketType.value;
        const active = QS.getQueues().filter((q) => q.active);
        ticketType.replaceChildren();
        const placeholder = QS.el("option", "", "Pilih jenis antrian");
        placeholder.value = "";
        ticketType.append(placeholder);
        active.forEach((q) => {
            const opt = QS.el("option", "", `${q.name} (${q.code})`);
            opt.value = q.id;
            ticketType.append(opt);
        });
        if (active.some((q) => q.id === previous))
            ticketType.value = previous;
    }
    // ===== Render: daftar tiket per jenis antrian =====
    function renderTickets() {
        const queues = QS.getQueues();
        const tickets = QS.getTickets();
        ticketList.replaceChildren();
        queues.forEach((q) => {
            const mine = tickets.filter((t) => t.queueId === q.id).sort(QS.compareForDisplay);
            ticketList.append(QS.el("h3", "adm-group-title", q.name));
            if (mine.length === 0) {
                ticketList.append(QS.el("div", "muted small adm-empty", "Belum ada tiket."));
                return;
            }
            mine.forEach((t) => {
                const row = QS.el("div", "adm-ticket-row");
                row.append(QS.el("strong", "adm-ticket-label", t.label), QS.el("span", `adm-badge prio-${t.priority.toLowerCase()}`, t.priority), QS.el("span", `adm-badge st-${t.status.toLowerCase()}`, t.status));
                ticketList.append(row);
            });
        });
    }
    function renderAll() {
        renderTypes();
        renderSelect();
        renderTickets();
    }
    // ===== Tambah jenis antrian =====
    typeCode.addEventListener("input", () => {
        typeCode.value = typeCode.value.toUpperCase();
    });
    typeForm.addEventListener("submit", (event) => {
        event.preventDefault();
        clearFlash(typeMsg);
        const name = typeName.value.trim();
        const error = QS.addQueue(typeCode.value, typeName.value);
        if (error) {
            flash(typeMsg, error, "error");
            return;
        }
        typeForm.reset();
        flash(typeMsg, `Jenis antrian "${name}" berhasil ditambahkan.`, "success");
        renderAll();
    });
    // ===== Terbitkan tiket manual =====
    ticketForm.addEventListener("submit", (event) => {
        event.preventDefault();
        clearFlash(ticketMsg);
        if (!ticketType.value) {
            flash(ticketMsg, "Pilih jenis antrian terlebih dahulu.", "error");
            return;
        }
        const ticket = QS.issueTicket(ticketType.value, ticketPriority.value);
        if (!ticket) {
            flash(ticketMsg, "Jenis antrian tidak tersedia atau sedang nonaktif.", "error");
            renderAll();
            return;
        }
        flash(ticketMsg, `Tiket ${ticket.label} (${ticket.priority}) berhasil diterbitkan.`, "success");
        renderAll();
    });
    // ===== Reset antrian =====
    QS.$("btn-reset").addEventListener("click", () => {
        if (!window.confirm("Reset antrian? Semua tiket dihapus dan nomor kembali ke 001."))
            return;
        QS.resetQueues();
        clearFlash(ticketMsg);
        renderAll();
    });
    // Sinkron kalau data berubah dari tab lain (operator / ambil antrian)
    window.addEventListener("storage", (event) => {
        if (event.key === QS.KEY.queues || event.key === QS.KEY.tickets)
            renderAll();
    });
    renderAll();
})();
