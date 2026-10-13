(() => {
  const session = QS.guard(true);
  if (!session) return;
  document.body.classList.remove("guarding");

  const queueForm = QS.$<HTMLFormElement>("queue-form");
  const codeInput = QS.$<HTMLInputElement>("q-code");
  const nameInput = QS.$<HTMLInputElement>("q-name");
  const queueError = QS.$("queue-error");
  const queueList = QS.$("queue-list");
  const ticketForm = QS.$<HTMLFormElement>("ticket-form");
  const queueSelect = QS.$<HTMLSelectElement>("t-queue");
  const prioritySelect = QS.$<HTMLSelectElement>("t-priority");
  const ticketMsg = QS.$("ticket-msg");
  const ticketList = QS.$("ticket-list");

  QS.$("user-info").textContent = `${session.firstName} (${session.role})`;
  QS.$("btn-logout").addEventListener("click", () => QS.logout());

  QS.$("btn-reset").addEventListener("click", () => {
    if (!confirm("Reset antrian? Semua tiket dihapus dan nomor kembali mulai dari 001.")) return;
    QS.resetQueues();
    ticketMsg.hidden = true;
    renderAll();
  });

  // Kode hanya 1 huruf kapital.
  codeInput.addEventListener("input", () => {
    codeInput.value = codeInput.value.replace(/[^a-zA-Z]/g, "").toUpperCase();
  });

  queueForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const error = QS.addQueue(codeInput.value, nameInput.value);
    if (error) {
      queueError.textContent = error;
      queueError.hidden = false;
      return;
    }
    queueError.hidden = true;
    queueForm.reset();
    codeInput.focus();
    renderAll();
  });

  ticketForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!queueSelect.value) {
      showTicketMsg("Pilih jenis antrian terlebih dulu.", true);
      return;
    }
    const ticket = QS.issueTicket(queueSelect.value, prioritySelect.value as Priority);
    if (!ticket) {
      showTicketMsg("Jenis antrian tidak aktif atau tidak ditemukan.", true);
    } else {
      showTicketMsg(`Tiket ${ticket.label} (${ticket.priority}) berhasil diterbitkan.`, false);
    }
    renderAll();
  });

  function showTicketMsg(message: string, isError: boolean): void {
    ticketMsg.textContent = message;
    ticketMsg.className = isError ? "form-error" : "form-ok";
    ticketMsg.hidden = false;
  }

  function renderQueues(): void {
    const queues = QS.getQueues();
    const tickets = QS.getTickets();
    queueList.replaceChildren();

    if (queues.length === 0) {
      queueList.append(QS.el("li", "empty", "Belum ada jenis antrian. Tambahkan lewat form di atas."));
      return;
    }

    queues.forEach((q) => {
      const li = QS.el("li", q.active ? "list-item" : "list-item is-off");

      const info = QS.el("div", "list-info");
      const title = QS.el("div", "list-title");
      title.append(QS.el("strong", "", q.name), QS.el("span", "muted", ` (${q.code})`));
      if (!q.active) title.append(QS.el("span", "chip", "Nonaktif"));
      const waiting = QS.waitingOf(tickets, q.id).length;
      info.append(title, QS.el("div", "muted small", `${waiting} menunggu`));

      const actions = QS.el("div", "row-actions");
      actions.append(
        QS.button(q.active ? "Nonaktifkan" : "Aktifkan", "btn btn-outline btn-sm", () => {
          QS.toggleQueue(q.id);
          renderAll();
        }),
        QS.button("Hapus", "btn btn-danger-outline btn-sm", () => {
          if (!confirm(`Hapus jenis antrian "${q.name}"? Semua tiketnya ikut terhapus.`)) return;
          QS.deleteQueue(q.id);
          renderAll();
        })
      );

      li.append(info, actions);
      queueList.append(li);
    });
  }

  function renderQueueSelect(): void {
    const previous = queueSelect.value;
    const active = QS.getQueues().filter((q) => q.active);

    const placeholder = QS.el("option", "", "Pilih jenis antrian");
    placeholder.value = "";
    queueSelect.replaceChildren(placeholder);
    active.forEach((q) => {
      const opt = QS.el("option", "", `${q.name} (${q.code})`);
      opt.value = q.id;
      queueSelect.append(opt);
    });
    queueSelect.value = active.some((q) => q.id === previous) ? previous : "";
  }

  function renderTickets(): void {
    const queues = QS.getQueues();
    const tickets = QS.getTickets();
    ticketList.replaceChildren();

    let any = false;
    queues.forEach((q) => {
      const rows = tickets.filter((t) => t.queueId === q.id).sort(QS.compareForDisplay);
      if (rows.length === 0) return;
      any = true;

      const group = QS.el("div", "ticket-group");
      group.append(QS.el("h3", "", q.name));
      rows.forEach((t) => group.append(ticketRow(t)));
      ticketList.append(group);
    });

    if (!any) ticketList.append(QS.el("p", "empty", "Belum ada tiket. Terbitkan tiket pertama dari form di atas."));
  }

  function ticketRow(t: Ticket): HTMLElement {
    const row = QS.el("div", "ticket-row");
    row.append(
      QS.el("strong", "ticket-label", t.label),
      QS.el("span", "chip", t.priority),
      QS.el("span", `chip status-${t.status.toLowerCase()}`, t.status)
    );

    const actions = QS.el("div", "row-actions");
    if (t.status === "Menunggu") {
      actions.append(
        QS.button("Panggil", "link-btn", () => {
          QS.callTicket(t.id);
          renderAll();
        }),
        QS.button("Lewati", "link-btn danger", () => {
          QS.skipTicket(t.id);
          renderAll();
        })
      );
    } else if (t.status === "Dipanggil") {
      actions.append(
        QS.button("Selesai", "link-btn ok", () => {
          QS.finishCalled(t.queueId);
          renderAll();
        })
      );
    }
    row.append(actions);
    return row;
  }

  function renderAll(): void {
    renderQueues();
    renderQueueSelect();
    renderTickets();
  }

  // Sinkron dengan tab lain (mis. operator atau halaman ambil antrian).
  window.addEventListener("storage", (event) => {
    if (event.key === QS.KEY.queues || event.key === QS.KEY.tickets) renderAll();
  });

  renderAll();
})();
