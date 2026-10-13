"use strict";
(() => {
    let authToken = null;
    try {
        authToken = localStorage.getItem("auth_token");
    }
    catch {
        window.location.replace("login.html");
        return;
    }
    if (!authToken?.trim()) {
        window.location.replace("login.html");
        return;
    }
    const grid = document.getElementById("queue-grid");
    const updatedAt = document.getElementById("updated-at");
    const fullscreenButton = document.getElementById("fullscreen-toggle");
    const soundButton = document.getElementById("sound-toggle");
    if (!grid || !updatedAt || !(fullscreenButton instanceof HTMLButtonElement) || !(soundButton instanceof HTMLButtonElement))
        return;
    const screenGrid = grid;
    const updateLabel = updatedAt;
    const fullscreenControl = fullscreenButton;
    const soundControl = soundButton;
    const soundKey = "layar_sound";
    let soundEnabled = localStorage.getItem(soundKey) === "true";
    let lastSnapshot = "";
    let firstRender = true;
    let previousCalled = new Map();
    function timeText(timestamp) {
        return new Date(timestamp).toLocaleTimeString("id-ID", { hour12: false });
    }
    function speakTicket(ticket, type) {
        if (!soundEnabled || !("speechSynthesis" in window))
            return;
        window.speechSynthesis.cancel();
        const digits = ticket.label.split("").map((character) => {
            if (character === "-")
                return "";
            if (character >= "0" && character <= "9") {
                return ["nol", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan"][Number(character)];
            }
            return character;
        }).filter(Boolean).join(", ");
        const utterance = new SpeechSynthesisUtterance(`Nomor antrian ${ticket.code}, ${digits}, silakan menuju ke ${type.name}`);
        utterance.lang = "id-ID";
        window.speechSynthesis.speak(utterance);
    }
    function createCard(type, tickets, animate) {
        const card = document.createElement("article");
        card.className = "queue-card";
        if (animate) {
            card.classList.add("queue-card--called");
            window.setTimeout(() => card.classList.remove("queue-card--called"), 1500);
        }
        const heading = document.createElement("div");
        heading.className = "queue-card__heading";
        const name = document.createElement("h2");
        name.className = "queue-card__name";
        name.textContent = type.name;
        const code = document.createElement("span");
        code.className = "code-badge";
        code.textContent = type.code;
        heading.append(name, code);
        const current = tickets.find((ticket) => ticket.typeId === type.id && ticket.status === "called");
        const display = document.createElement("div");
        display.className = "queue-card__display";
        display.setAttribute("aria-live", "polite");
        if (current) {
            const label = document.createElement("span");
            label.className = "called-label";
            label.textContent = "DIPANGGIL";
            const number = document.createElement("p");
            number.className = "called-number";
            number.textContent = current.label;
            display.append(label, number);
        }
        else {
            const empty = document.createElement("p");
            empty.className = "queue-card__empty";
            empty.textContent = "Belum ada nomor dipanggil";
            const hint = document.createElement("p");
            hint.className = "queue-card__hint";
            hint.textContent = "Nomor akan muncul setelah operator memanggil tiket.";
            display.append(empty, hint);
        }
        const footer = document.createElement("footer");
        footer.className = "queue-card__footer";
        const waitingCount = tickets.filter((ticket) => ticket.typeId === type.id && ticket.status === "waiting").length;
        footer.textContent = `${waitingCount} tiket menunggu`;
        card.append(heading, display, footer);
        return card;
    }
    function render() {
        const types = getQueueTypes().filter((type) => type.active === true);
        const tickets = getTickets();
        const snapshot = JSON.stringify({ types, tickets });
        updateLabel.textContent = `Diperbarui ${timeText(Date.now())}`;
        if (snapshot === lastSnapshot)
            return;
        const nextCalled = new Map();
        const newlyCalled = [];
        for (const type of types) {
            const called = tickets.find((ticket) => ticket.typeId === type.id && ticket.status === "called");
            if (called) {
                nextCalled.set(type.id, called.label);
                if (!firstRender && previousCalled.get(type.id) !== called.label)
                    newlyCalled.push({ ticket: called, type });
            }
        }
        screenGrid.replaceChildren(...types.map((type) => createCard(type, tickets, newlyCalled.some((item) => item.type.id === type.id))));
        if (types.length === 0) {
            const empty = document.createElement("p");
            empty.className = "grid-empty";
            empty.textContent = "Belum ada layanan yang tersedia.";
            screenGrid.append(empty);
        }
        if (!firstRender)
            newlyCalled.forEach(({ ticket, type }) => speakTicket(ticket, type));
        firstRender = false;
        previousCalled = nextCalled;
        lastSnapshot = snapshot;
    }
    function updateFullscreenButton() {
        const isFullscreen = document.fullscreenElement !== null;
        fullscreenControl.textContent = isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh";
        fullscreenControl.setAttribute("aria-pressed", String(isFullscreen));
    }
    fullscreenControl.addEventListener("click", () => {
        const action = document.fullscreenElement
            ? document.exitFullscreen()
            : document.documentElement.requestFullscreen();
        void action.then(updateFullscreenButton, updateFullscreenButton);
    });
    document.addEventListener("fullscreenchange", updateFullscreenButton);
    function updateSoundButton() {
        soundControl.textContent = soundEnabled ? "Suara: Aktif" : "Suara: Nonaktif";
        soundControl.setAttribute("aria-pressed", String(soundEnabled));
    }
    soundControl.addEventListener("click", () => {
        soundEnabled = !soundEnabled;
        try {
            localStorage.setItem(soundKey, String(soundEnabled));
        }
        catch {
            // The in-page preference remains usable if storage is blocked.
        }
        updateSoundButton();
    });
    seedIfEmpty();
    updateFullscreenButton();
    updateSoundButton();
    render();
    window.setInterval(render, 2000);
    window.addEventListener("storage", (event) => {
        if (event.key === null || [QUEUE_STORAGE_TYPES, QUEUE_STORAGE_TICKETS].includes(event.key))
            render();
        if (event.key === soundKey) {
            soundEnabled = event.newValue === "true";
            updateSoundButton();
        }
    });
})();
