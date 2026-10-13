(() => {
  const session = QS.guard(false);
  if (!session) return;
  document.body.classList.remove("guarding");

  const grid = QS.$("operator-grid");
  QS.$("user-info").textContent = `${session.firstName} (${session.role})`;
  QS.$("btn-logout").addEventListener("click", () => QS.logout());
  if (QS.isAdmin(session.role)) QS.$("link-admin").hidden = false;

  function field(label: string, value: string, sub = "", highlight = false): HTMLElement {
    const box = QS.el("div", "op-field");
    box.append(QS.el("div", "op-label", label));
    box.append(QS.el("div", highlight ? "op-number is-called" : "op-number", value));
    if (sub) box.append(QS.el("div", "muted small", sub));
    return box;
  }

  function render(): void {
    const queues = QS.getQueues().filter((q) => q.active);
    const tickets = QS.getTickets();
    grid.replaceChildren();

    if (queues.length === 0) {
      grid.append(QS.el("p", "empty", "Belum ada jenis antrian aktif. Aktifkan atau tambahkan lewat Dashboard Admin."));
      return;
    }

    queues.forEach((q) => {
      const waiting = QS.waitingOf(tickets, q.id);
      const called = QS.calledOf(tickets, q.id);
      const next = waiting[0];

      const card = QS.el("section", "card op-card");

      const head = QS.el("div", "op-head");
      head.append(QS.el("h2", "", q.name), QS.el("span", "muted small", `${waiting.length} menunggu`));

      const info = QS.el("div", "op-info");
      info.append(
        field("Sedang dipanggil", called ? called.label : "-", "", Boolean(called)),
        field("Berikutnya", next ? next.label : "-", next ? `Prioritas ${next.priority}` : "")
      );

      const actions = QS.el("div", "op-actions");
      actions.append(
        QS.button("Panggil Berikutnya", "btn btn-primary grow", () => {
          QS.callNext(q.id);
          render();
        }, !next),
        QS.button("Selesai", "btn btn-outline", () => {
          QS.finishCalled(q.id);
          render();
        }, !called),
        QS.button("Lewati", "btn btn-outline", () => {
          if (called) QS.skipTicket(called.id);
          render();
        }, !called)
      );

      card.append(head, info, actions);
      if (!next) card.append(QS.el("p", "muted small", "Tidak ada tiket menunggu untuk jenis antrian ini."));
      grid.append(card);
    });
  }

  window.addEventListener("storage", (event) => {
    if (event.key === QS.KEY.queues || event.key === QS.KEY.tickets) render();
  });

  render();
})();
