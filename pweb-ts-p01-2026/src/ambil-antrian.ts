(() => {
  let authToken: string | null = null;
  try {
    authToken = localStorage.getItem("auth_token");
  } catch {
    window.location.replace("login.html");
    return;
  }
  if (!authToken?.trim()) {
    window.location.replace("login.html");
    return;
  }

  const grid = document.getElementById("queue-grid");
  const updatedAt = document.getElementById("updated-at");
  const resultDialog = document.getElementById("ticket-dialog");
  const resultNumber = document.getElementById("result-number");
  const resultService = document.getElementById("result-service");
  const resultPriority = document.getElementById("result-priority");
  const resultTime = document.getElementById("result-time");
  const resultAhead = document.getElementById("result-ahead");
  const errorMessage = document.getElementById("error-message");
  const closeDialog = document.getElementById("close-dialog");
  if (!grid || !updatedAt || !(resultDialog instanceof HTMLDialogElement) || !resultNumber || !resultService || !resultPriority || !resultTime || !resultAhead || !errorMessage || !(closeDialog instanceof HTMLButtonElement)) return;
  const serviceGrid: HTMLElement = grid;
  const updateLabel: HTMLElement = updatedAt;
  const ticketDialog: HTMLDialogElement = resultDialog;
  const ticketNumber: HTMLElement = resultNumber;
  const ticketService: HTMLElement = resultService;
  const ticketPriority: HTMLElement = resultPriority;
  const ticketTime: HTMLElement = resultTime;
  const peopleAhead: HTMLElement = resultAhead;
  const errorNotice: HTMLElement = errorMessage;

  let lastTypesSnapshot = "";

  function timeText(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  }

  function showError(message: string): void {
    errorNotice.textContent = message;
    errorNotice.hidden = false;
    window.setTimeout(() => { errorNotice.hidden = true; }, 4000);
  }

  function createPriorityButton(type: QueueType, priority: Priority): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "priority-button";
    button.textContent = priorityLabel(priority);
    button.addEventListener("click", () => issueTicket(type.id, priority));
    return button;
  }

  function createCard(type: QueueType): HTMLElement {
    const card = document.createElement("article");
    card.className = "service-card";
    const heading = document.createElement("div");
    heading.className = "service-card__heading";
    const name = document.createElement("h2");
    name.className = "service-card__name";
    name.textContent = type.name;
    const code = document.createElement("span");
    code.className = "code-badge";
    code.textContent = type.code;
    heading.append(name, code);

    const normalButton = document.createElement("button");
    normalButton.type = "button";
    normalButton.className = "take-button";
    normalButton.textContent = "Ambil Nomor";
    normalButton.setAttribute("aria-label", `Ambil nomor ${type.name}, prioritas normal`);
    normalButton.addEventListener("click", () => issueTicket(type.id, "normal"));

    const details = document.createElement("details");
    details.className = "priority-options";
    const summary = document.createElement("summary");
    summary.textContent = "Ambil dengan prioritas";
    const buttons = document.createElement("div");
    buttons.className = "priority-options__buttons";
    buttons.append(
      createPriorityButton(type, "lansia"),
      createPriorityButton(type, "disabilitas"),
      createPriorityButton(type, "vip")
    );
    details.append(summary, buttons);
    card.append(heading, normalButton, details);
    return card;
  }

  function render(): void {
    const types = getQueueTypes();
    const snapshot = JSON.stringify(types);
    updateLabel.textContent = `Data diperbarui ${timeText(Date.now())}`;
    if (snapshot === lastTypesSnapshot) return;
    const activeTypes = types.filter((type) => type.active === true);
    serviceGrid.replaceChildren(...activeTypes.map(createCard));
    if (activeTypes.length === 0) {
      const empty = document.createElement("p");
      empty.className = "grid-empty";
      empty.textContent = "Belum ada layanan yang tersedia.";
      serviceGrid.append(empty);
    }
    lastTypesSnapshot = snapshot;
  }

  function issueTicket(typeId: string, priority: Priority): void {
    const type = getQueueTypes().find((candidate) => candidate.id === typeId && candidate.active === true);
    if (!type) {
      showError("Jenis layanan ini sudah tidak tersedia. Silakan pilih layanan lain.");
      render();
      return;
    }

    const counters = getCounters();
    const tickets = getTickets();
    const number = (counters[type.id] ?? 0) + 1;
    const createdAt = Date.now();
    const ticket: Ticket = {
      id: typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${createdAt}-${Math.random().toString(36).slice(2)}`,
      typeId: type.id,
      code: type.code,
      number,
      label: formatLabel(type.code, number),
      priority,
      status: "waiting",
      createdAt
    };

    counters[type.id] = number;
    tickets.push(ticket);
    saveTickets(tickets);
    saveCounters(counters);

    const waiting = tickets
      .filter((candidate) => candidate.typeId === type.id && candidate.status === "waiting")
      .sort((left, right) => {
        const leftNormal = left.priority === "normal" ? 1 : 0;
        const rightNormal = right.priority === "normal" ? 1 : 0;
        return leftNormal - rightNormal || left.createdAt - right.createdAt;
      });
    const position = waiting.findIndex((candidate) => candidate.id === ticket.id);

    ticketNumber.textContent = ticket.label;
    ticketService.textContent = type.name;
    ticketPriority.textContent = priorityLabel(priority);
    ticketTime.textContent = timeText(createdAt);
    peopleAhead.textContent = `${Math.max(position, 0)} orang menunggu di depan Anda`;
    errorNotice.hidden = true;
    ticketDialog.showModal();
  }

  closeDialog.addEventListener("click", () => ticketDialog.close());
  ticketDialog.addEventListener("click", (event) => {
    if (event.target === ticketDialog) ticketDialog.close();
  });

  seedIfEmpty();
  render();
  window.setInterval(render, 3000);
  window.addEventListener("storage", (event) => {
    if (event.key === null || event.key === QUEUE_STORAGE_TYPES) render();
  });
})();