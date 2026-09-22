/* App Lavori — Falegnameria Gianni
   Vanilla JS, no build step. Dati salvati in IndexedDB, solo su questo dispositivo. */

(function () {
  "use strict";

  const OPERATORS = ["Fabrizio", "Luigi", "Marco"];
  const OPERATOR_COLOR = { Fabrizio: "var(--op-fabrizio)", Luigi: "var(--op-luigi)", Marco: "var(--op-marco)" };
  const DEFAULT_RATE = 25;

  const STATUS_LIST = ["Preventivo inviato", "In lavorazione", "Consegna", "Concluso", "Fatturato"];
  const STATUS_CLASS = {
    "Preventivo inviato": "status-preventivo",
    "In lavorazione": "status-lavorazione",
    "Consegna": "status-consegna",
    "Concluso": "status-concluso",
    "Fatturato": "status-fatturato",
    "Lavoro extra": "status-preventivo"
  };

  const PREDEFINED_EVENTS = [
    "Preventivo inviato",
    "Preventivo accettato",
    "Preventivo rifiutato",
    "Presa in carico",
    "Ordine materiale effettuato",
    "Arrivo materiale",
    "Inizio lavorazione",
    "Consegna parziale",
    "Consegna finale",
    "Installazione / montaggio",
    "Pagamento acconto",
    "Pagamento saldo",
    "Lavoro concluso"
  ];

  const MATERIAL_CATEGORIES = ["Materiale", "Ferramenta", "Verniciatura"];

  const ICONS = {
    chevronRight: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
    pencil: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
    trash: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>',
    check: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    camera: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
    image: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
    doc: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    plusCircle: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    paint: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C9 6 5 10.5 5 14.5A7 7 0 0 0 19 14.5C19 10.5 15 6 12 2z"/></svg>',
    wrench: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L2 19l3 3 7.3-7.3a4 4 0 0 0 5.4-5.4l-2.8 2.8-2-2z"/></svg>',
    box: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>'
  };

  /* ---------------- IndexedDB ---------------- */

  const DB_NAME = "falegnameria-lavori";
  const DB_VERSION = 1;
  let dbPromise = null;

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains("jobs")) {
          db.createObjectStore("jobs", { keyPath: "id", autoIncrement: true });
        }
        ["events", "hours", "materials", "documents"].forEach((name) => {
          if (!db.objectStoreNames.contains(name)) {
            const store = db.createObjectStore(name, { keyPath: "id", autoIncrement: true });
            store.createIndex("jobId", "jobId", { unique: false });
          }
        });
        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings", { keyPath: "key" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  function tx(storeNames, mode) {
    return openDB().then((db) => db.transaction(storeNames, mode));
  }

  function dbAll(storeName, indexName, indexValue) {
    return tx([storeName], "readonly").then((t) => new Promise((resolve, reject) => {
      const store = t.objectStore(storeName);
      const source = indexName ? store.index(indexName) : store;
      const req = indexValue !== undefined ? source.getAll(indexValue) : source.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }));
  }

  function dbGet(storeName, id) {
    return tx([storeName], "readonly").then((t) => new Promise((resolve, reject) => {
      const req = t.objectStore(storeName).get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }));
  }

  function dbAdd(storeName, obj) {
    return tx([storeName], "readwrite").then((t) => new Promise((resolve, reject) => {
      const req = t.objectStore(storeName).add(obj);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }));
  }

  function dbPut(storeName, obj) {
    return tx([storeName], "readwrite").then((t) => new Promise((resolve, reject) => {
      const req = t.objectStore(storeName).put(obj);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }));
  }

  function dbDelete(storeName, id) {
    return tx([storeName], "readwrite").then((t) => new Promise((resolve, reject) => {
      const req = t.objectStore(storeName).delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    }));
  }

  function getSetting(key, fallback) {
    return dbGet("settings", key).then((row) => (row ? row.value : fallback));
  }

  function setSetting(key, value) {
    return dbPut("settings", { key, value });
  }

  function getOperatorRate(name) {
    return getSetting("rate_" + name, DEFAULT_RATE);
  }

  /* ---------------- Helpers ---------------- */

  const MONTHS_IT = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];

  function formatDateISO(iso) {
    if (!iso) return "";
    const d = new Date(iso + "T00:00:00");
    if (isNaN(d.getTime())) return iso;
    return `${d.getDate()} ${MONTHS_IT[d.getMonth()]} ${d.getFullYear()}`;
  }

  function todayISO() {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
  }

  function groupThousands(intPart) {
    return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  function formatEUR(n) {
    n = Number(n) || 0;
    const fixed = n.toFixed(2);
    const [intPart, decPart] = fixed.split(".");
    const sign = intPart.startsWith("-") ? "-" : "";
    const digits = sign ? intPart.slice(1) : intPart;
    return "€" + sign + groupThousands(digits) + "," + decPart;
  }

  function formatNum(n) {
    n = Number(n) || 0;
    const rounded = Math.round(n * 100) / 100;
    const [intPart, decPart] = String(Math.abs(rounded)).split(".");
    const sign = rounded < 0 ? "-" : "";
    return sign + groupThousands(intPart) + (decPart ? "," + decPart : "");
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  let toastTimer = null;
  function showToast(msg) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 1800);
  }

  /* ---------------- State ---------------- */

  const state = {
    view: "home",
    currentJobId: null,
    currentTab: "timeline",
    statusFilter: "",
    searchQuery: "",
    lastOperator: OPERATORS[0]
  };

  /* ---------------- Overlay / sheet ---------------- */

  const overlay = document.getElementById("overlay");
  const overlayContent = document.getElementById("overlay-content");

  function openSheet(html) {
    overlayContent.innerHTML = html;
    overlay.classList.add("active");
  }
  function closeSheet() {
    overlay.classList.remove("active");
    overlayContent.innerHTML = "";
  }
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeSheet();
  });

  /* ---------------- Navigation ---------------- */

  function showView(name) {
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
    document.getElementById("view-" + name).classList.add("active");
    state.view = name;
    document.querySelectorAll(".nav-item").forEach((n) => n.classList.toggle("active", n.dataset.nav === name || (name === "job" && n.dataset.nav === "home")));
  }

  function goHome() {
    showView("home");
    renderHome();
  }

  async function openJob(id) {
    state.currentJobId = id;
    state.currentTab = "timeline";
    showView("job");
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === "timeline"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.toggle("active", p.dataset.panel === "timeline"));
    await renderJobHeader(id);
    await renderTimeline(id);
    await renderDocumenti(id);
    await renderOre(id);
    await renderMateriali(id);
  }

  function switchTab(tab) {
    state.currentTab = tab;
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.toggle("active", p.dataset.panel === tab));
  }

  /* ---------------- Cost aggregation ---------------- */

  async function computeJobCost(jobId) {
    const [hours, materials] = await Promise.all([
      dbAll("hours", "jobId", jobId),
      dbAll("materials", "jobId", jobId)
    ]);
    const hoursCost = hours.reduce((s, h) => s + (Number(h.ore) || 0) * (Number(h.costoOrario) || 0), 0);
    const materialsCost = materials
      .filter((m) => m.stato !== "ordinato")
      .reduce((s, m) => s + (Number(m.quantita) || 0) * (Number(m.costoUnitario) || 0), 0);
    return { hoursCost, materialsCost, total: hoursCost + materialsCost };
  }

  /* ---------------- HOME ---------------- */

  function jobDisplayName(j) {
    return j.titolo ? `${j.titolo} — ${j.cliente}` : (j.cliente || "");
  }

  async function renderHome() {
    const allJobs = await dbAll("jobs");
    const jobs = allJobs.filter((j) => !j.extra);
    const extraJobs = allJobs.filter((j) => j.extra);
    jobs.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
    extraJobs.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));

    const q = state.searchQuery.trim().toLowerCase();
    const filtered = jobs.filter((j) => {
      if (state.statusFilter && j.stato !== state.statusFilter) return false;
      if (q && !((j.cliente || "").toLowerCase().includes(q) || (j.titolo || "").toLowerCase().includes(q))) return false;
      return true;
    });
    const filteredExtra = extraJobs.filter((j) => !q || (j.cliente || "").toLowerCase().includes(q));

    const listEl = document.getElementById("job-list");
    let html = "";

    if (filtered.length === 0) {
      html += `<div class="empty-state">${jobs.length === 0 ? "Nessun lavoro ancora.<br>Tocca + per crearne uno." : "Nessun lavoro trovato."}</div>`;
    } else {
      const cards = await Promise.all(filtered.map(async (j) => {
        const cost = await computeJobCost(j.id);
        const preventivo = Number(j.preventivo) || 0;
        const pct = preventivo > 0 ? Math.min(100, Math.round((cost.total / preventivo) * 100)) : 0;
        const over = preventivo > 0 && cost.total > preventivo;
        const title = j.titolo ? `${escapeHtml(j.titolo)} — ${escapeHtml(j.cliente)}` : escapeHtml(j.cliente);
        return `
          <div class="job-card" data-job-id="${j.id}">
            <div class="job-card-top">
              <div class="job-card-title">${title}</div>
              <div class="status-badge ${STATUS_CLASS[j.stato] || "status-preventivo"}">${escapeHtml(j.stato)}</div>
            </div>
            <div class="job-card-meta">Ultima attività: ${j.updatedAt ? formatDateISO(j.updatedAt) : "—"}</div>
            <div class="cost-row">
              <span>Costi finora <strong>${formatEUR(cost.total)}</strong></span>
              <span>${preventivo > 0 ? "Preventivo " + formatEUR(preventivo) : "Nessun preventivo"}</span>
            </div>
            <div class="progress-track"><div class="progress-fill ${over ? "over" : ""}" style="width:${preventivo > 0 ? Math.max(pct, cost.total > 0 ? 4 : 0) : 0}%"></div></div>
          </div>`;
      }));
      html += cards.join("");
    }

    if (filteredExtra.length > 0) {
      const extraCards = await Promise.all(filteredExtra.map(async (j) => {
        const cost = await computeJobCost(j.id);
        const hours = await dbAll("hours", "jobId", j.id);
        const totalH = hours.reduce((s, h) => s + (Number(h.ore) || 0), 0);
        return `
          <div class="job-card extra" data-job-id="${j.id}">
            <div class="job-card-top">
              <div class="job-card-title">${escapeHtml(j.cliente)}</div>
            </div>
            <div class="job-card-meta">Ultima attività: ${j.updatedAt ? formatDateISO(j.updatedAt) : "—"}</div>
            <div class="cost-row">
              <span>Ore totali <strong>${formatNum(totalH)} h</strong></span>
              <span>${formatEUR(cost.total)}</span>
            </div>
          </div>`;
      }));
      html += `<div class="extra-section-header">Lavori extra</div>` + extraCards.join("");
    }

    listEl.innerHTML = html;
    listEl.querySelectorAll(".job-card").forEach((card) => {
      card.addEventListener("click", () => openJob(Number(card.dataset.jobId)));
    });
  }

  function openNewJobSheet() {
    openSheet(`
      <div class="sheet">
        <div class="sheet-grabber"></div>
        <div class="sheet-title">Nuovo lavoro</div>
        <div class="form-scroll">
          <div>
            <div class="field-label">Cliente</div>
            <input class="field-input" id="f-cliente" placeholder="es. Sig.ra Bianchi" autocomplete="off">
          </div>
          <div>
            <div class="field-label">Descrizione lavoro (opzionale)</div>
            <input class="field-input" id="f-titolo" placeholder="es. Libreria soggiorno" autocomplete="off">
          </div>
          <div>
            <div class="field-label">Preventivo totale (opzionale)</div>
            <input class="field-input" id="f-preventivo" type="number" inputmode="decimal" placeholder="es. 2100">
          </div>
          <div>
            <div class="field-label">Stato iniziale</div>
            <select class="field-input" id="f-stato">
              ${STATUS_LIST.map((s) => `<option value="${s}" ${s === "Preventivo inviato" ? "selected" : ""}>${s}</option>`).join("")}
            </select>
          </div>
          <button class="btn-primary" id="btn-save-job">Crea lavoro</button>
        </div>
      </div>
    `);
    document.getElementById("f-cliente").focus();
    document.getElementById("btn-save-job").addEventListener("click", async () => {
      const cliente = document.getElementById("f-cliente").value.trim();
      if (!cliente) { showToast("Inserisci almeno il nome del cliente"); return; }
      const titolo = document.getElementById("f-titolo").value.trim();
      const preventivo = parseFloat(document.getElementById("f-preventivo").value) || 0;
      const stato = document.getElementById("f-stato").value;
      const now = new Date().toISOString().slice(0, 10);
      const id = await dbAdd("jobs", { cliente, titolo, preventivo, stato, createdAt: now, updatedAt: now });
      closeSheet();
      showToast("Lavoro creato");
      await openJob(id);
    });
  }

  function openEditJobSheet(job) {
    openSheet(`
      <div class="sheet">
        <div class="sheet-grabber"></div>
        <div class="sheet-title">Modifica lavoro</div>
        <div class="form-scroll">
          <div>
            <div class="field-label">Cliente</div>
            <input class="field-input" id="f-cliente" value="${escapeHtml(job.cliente)}" autocomplete="off">
          </div>
          <div>
            <div class="field-label">Descrizione lavoro</div>
            <input class="field-input" id="f-titolo" value="${escapeHtml(job.titolo || "")}" autocomplete="off">
          </div>
          <div>
            <div class="field-label">Preventivo totale</div>
            <input class="field-input" id="f-preventivo" type="number" inputmode="decimal" value="${job.preventivo || ""}">
          </div>
          <button class="btn-primary" id="btn-save-job">Salva modifiche</button>
          <button class="btn-secondary" id="btn-delete-job" style="color:var(--danger);border-color:var(--danger-bg);">Elimina lavoro</button>
        </div>
      </div>
    `);
    document.getElementById("btn-save-job").addEventListener("click", async () => {
      const cliente = document.getElementById("f-cliente").value.trim();
      if (!cliente) { showToast("Inserisci almeno il nome del cliente"); return; }
      job.cliente = cliente;
      job.titolo = document.getElementById("f-titolo").value.trim();
      job.preventivo = parseFloat(document.getElementById("f-preventivo").value) || 0;
      job.updatedAt = new Date().toISOString().slice(0, 10);
      await dbPut("jobs", job);
      closeSheet();
      await renderJobHeader(job.id);
      showToast("Lavoro aggiornato");
    });
    document.getElementById("btn-delete-job").addEventListener("click", async () => {
      if (!confirm("Eliminare definitivamente questo lavoro e tutti i suoi dati (eventi, ore, materiali, documenti)?")) return;
      await deleteJobCascade(job.id);
      closeSheet();
      goHome();
      showToast("Lavoro eliminato");
    });
  }

  async function deleteJobCascade(jobId) {
    const [events, hours, materials, documents] = await Promise.all([
      dbAll("events", "jobId", jobId),
      dbAll("hours", "jobId", jobId),
      dbAll("materials", "jobId", jobId),
      dbAll("documents", "jobId", jobId)
    ]);
    await Promise.all([
      ...events.map((e) => dbDelete("events", e.id)),
      ...hours.map((h) => dbDelete("hours", h.id)),
      ...materials.map((m) => dbDelete("materials", m.id)),
      ...documents.map((d) => dbDelete("documents", d.id))
    ]);
    await dbDelete("jobs", jobId);
  }

  function openStatusSheet(job) {
    openSheet(`
      <div class="sheet">
        <div class="sheet-grabber"></div>
        <div class="sheet-title">Stato lavoro</div>
        <div class="sheet-list">
          ${STATUS_LIST.map((s) => `
            <button class="sheet-row" data-status="${s}">
              <span>${s}</span>
              ${s === job.stato ? ICONS.check.replace("currentColor", "var(--accent)") : ""}
            </button>`).join("")}
        </div>
      </div>
    `);
    overlayContent.querySelectorAll("[data-status]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        job.stato = btn.dataset.status;
        job.updatedAt = new Date().toISOString().slice(0, 10);
        await dbPut("jobs", job);
        closeSheet();
        await renderJobHeader(job.id);
        showToast("Stato aggiornato");
      });
    });
  }

  /* ---------------- JOB HEADER ---------------- */

  async function renderJobHeader(jobId) {
    const job = await dbGet("jobs", jobId);
    if (!job) { goHome(); return; }
    document.getElementById("job-name-label").textContent = job.titolo || job.cliente;
    document.getElementById("job-client-label").textContent = job.titolo ? job.cliente : "";
    document.getElementById("job-client-label").style.display = job.titolo ? "block" : "none";
    const badge = document.getElementById("job-status-badge");
    badge.textContent = job.stato;
    badge.className = "status-badge " + (STATUS_CLASS[job.stato] || "status-preventivo");
    badge.onclick = () => openStatusSheet(job);
    document.getElementById("job-name-label").onclick = () => openEditJobSheet(job);
    document.getElementById("job-client-label").onclick = () => openEditJobSheet(job);
  }

  /* ---------------- TIMELINE TAB ---------------- */

  async function renderTimeline(jobId) {
    const events = await dbAll("events", "jobId", jobId);
    events.sort((a, b) => (a.date || "").localeCompare(b.date || "") || a.id - b.id);
    const listEl = document.getElementById("timeline-list");
    if (events.length === 0) {
      listEl.innerHTML = `<div class="empty-state" style="padding:20px 0;text-align:left;">Nessun evento ancora.<br>Tocca + per aggiungere il primo.</div>`;
      return;
    }
    listEl.innerHTML = events.map((ev, i) => {
      const isLatest = i === events.length - 1;
      const isDone = /accettat|conclus|final/i.test(ev.label);
      return `
        <div class="timeline-item">
          <div class="timeline-dot ${isDone ? "done" : ""} ${isLatest ? "latest" : ""}">${isDone ? ICONS.check : ""}</div>
          <div style="flex:1;">
            <div class="timeline-label">${escapeHtml(ev.label)}</div>
            <div class="timeline-date">${formatDateISO(ev.date)}${isLatest ? " · più recente" : ""}</div>
          </div>
          <button class="timeline-del" data-del-event="${ev.id}">${ICONS.trash}</button>
        </div>`;
    }).join("");
    listEl.querySelectorAll("[data-del-event]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Eliminare questo evento?")) return;
        await dbDelete("events", Number(btn.dataset.delEvent));
        await renderTimeline(jobId);
      });
    });
  }

  function openAddEventSheet(jobId) {
    openSheet(`
      <div class="sheet">
        <div class="sheet-grabber"></div>
        <div class="sheet-title">Aggiungi evento</div>
        <div class="sheet-list">
          ${PREDEFINED_EVENTS.map((label) => `<button class="sheet-row" data-event="${escapeHtml(label)}"><span>${label}</span>${ICONS.chevronRight}</button>`).join("")}
          <button class="sheet-row custom" id="btn-custom-event">${ICONS.pencil}<span>Evento personalizzato…</span></button>
        </div>
      </div>
    `);
    overlayContent.querySelectorAll("[data-event]").forEach((btn) => {
      btn.addEventListener("click", () => selectPredefinedEvent(jobId, btn.dataset.event));
    });
    document.getElementById("btn-custom-event").addEventListener("click", () => {
      openSheet(`
        <div class="sheet">
          <div class="sheet-grabber"></div>
          <div class="sheet-title">Evento personalizzato</div>
          <div class="form-scroll">
            <div>
              <div class="field-label">Descrizione</div>
              <input class="field-input" id="f-event-label" placeholder="es. Sopralluogo cliente" autocomplete="off">
            </div>
            <div>
              <div class="field-label">Data</div>
              <input class="field-input" id="f-event-date" type="date" value="${todayISO()}">
            </div>
            <button class="btn-primary" id="btn-save-event">Aggiungi</button>
          </div>
        </div>
      `);
      document.getElementById("f-event-label").focus();
      document.getElementById("btn-save-event").addEventListener("click", async () => {
        const label = document.getElementById("f-event-label").value.trim();
        if (!label) { showToast("Inserisci una descrizione"); return; }
        const date = document.getElementById("f-event-date").value || todayISO();
        await dbAdd("events", { jobId, label, date });
        await touchJob(jobId);
        closeSheet();
        await renderTimeline(jobId);
        showToast("Evento aggiunto");
      });
    });
  }

  function selectPredefinedEvent(jobId, label) {
    if (label === "Ordine materiale effettuato") return openOrderMaterialFlow(jobId);
    if (label === "Arrivo materiale") return openMaterialArrivalFlow(jobId);
    return openEventDateConfirm(jobId, label);
  }

  function openEventDateConfirm(jobId, label) {
    openSheet(`
      <div class="sheet">
        <div class="sheet-grabber"></div>
        <div class="sheet-title">${escapeHtml(label)}</div>
        <div class="form-scroll">
          <div>
            <div class="field-label">Data</div>
            <input class="field-input" id="f-event-date" type="date" value="${todayISO()}">
          </div>
          <button class="btn-primary" id="btn-save-event">Aggiungi</button>
        </div>
      </div>
    `);
    document.getElementById("btn-save-event").addEventListener("click", async () => {
      const date = document.getElementById("f-event-date").value || todayISO();
      await dbAdd("events", { jobId, label, date });
      await touchJob(jobId);
      closeSheet();
      await renderTimeline(jobId);
      showToast("Evento aggiunto");
    });
  }

  function openOrderMaterialFlow(jobId) {
    openMaterialFormSheet(jobId, {
      title: "Cosa hai ordinato?",
      saveLabel: "Aggiungi",
      includeDate: true,
      defaultDate: todayISO(),
      stato: "ordinato",
      onDone: async (saved, dateVal) => {
        await dbAdd("events", { jobId, label: `Ordine materiale effettuato — ${saved.descrizione}`, date: dateVal });
        await touchJob(jobId);
        await renderTimeline(jobId);
        showToast("Ordine registrato");
      }
    });
  }

  async function openMaterialArrivalFlow(jobId) {
    const materials = await dbAll("materials", "jobId", jobId);
    const pending = materials.filter((m) => m.stato === "ordinato");
    if (pending.length === 0) {
      openMaterialArrivalForm(jobId, {});
      return;
    }
    openSheet(`
      <div class="sheet">
        <div class="sheet-grabber"></div>
        <div class="sheet-title">Cosa è arrivato?</div>
        <div class="sheet-list">
          ${pending.map((m) => `<button class="sheet-row" data-pending="${m.id}"><span>${escapeHtml(m.descrizione)} ${m.quantita ? "(" + formatNum(m.quantita) + " " + escapeHtml(m.unita || "") + ")" : ""}</span>${ICONS.chevronRight}</button>`).join("")}
          <button class="sheet-row custom" id="btn-arrival-other">${ICONS.plusCircle}<span>Altro materiale (non ordinato prima)</span></button>
        </div>
      </div>
    `);
    overlayContent.querySelectorAll("[data-pending]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const m = await dbGet("materials", Number(btn.dataset.pending));
        if (m) openMaterialArrivalForm(jobId, m);
      });
    });
    document.getElementById("btn-arrival-other").addEventListener("click", () => openMaterialArrivalForm(jobId, {}));
  }

  async function touchJob(jobId) {
    const job = await dbGet("jobs", jobId);
    if (job) { job.updatedAt = todayISO(); await dbPut("jobs", job); }
  }

  /* ---------------- DOCUMENTI TAB ---------------- */

  async function renderDocumenti(jobId) {
    const docs = await dbAll("documents", "jobId", jobId);
    docs.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    const grid = document.getElementById("doc-grid");
    const addTile = `
      <button class="doc-add-tile" id="doc-add-inline">
        <div class="icon-circle">${ICONS.plusCircle}</div>
        <div style="font-size:13px;font-weight:600;">Aggiungi</div>
      </button>`;
    if (docs.length === 0) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;padding:30px 0;">Nessun documento ancora.</div>` + addTile;
    } else {
      grid.innerHTML = docs.map((d) => `
        <div class="doc-card" data-doc-id="${d.id}">
          <div class="doc-thumb">${d.tipo === "image" ? `<img src="${d.dataUrl}" alt="">` : ICONS.doc}</div>
          <div class="doc-name">${escapeHtml(d.nome)}</div>
          <button class="doc-del" data-del-doc="${d.id}">${ICONS.trash}</button>
        </div>`).join("") + addTile;
    }
    grid.querySelectorAll("[data-del-doc]").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (!confirm("Eliminare questo documento?")) return;
        await dbDelete("documents", Number(btn.dataset.delDoc));
        await renderDocumenti(jobId);
      });
    });
    const addInline = document.getElementById("doc-add-inline");
    if (addInline) addInline.addEventListener("click", () => openAddDocumentSheet(jobId));
  }

  function openAddDocumentSheet(jobId) {
    openSheet(`
      <div class="sheet">
        <div class="sheet-grabber"></div>
        <div class="sheet-title">Aggiungi documento</div>
        <button class="action-row" id="act-camera">
          <div class="icon-circle">${ICONS.camera}</div>
          <span>Scatta foto</span>${ICONS.chevronRight}
        </button>
        <button class="action-row" id="act-library">
          <div class="icon-circle">${ICONS.image}</div>
          <span>Scegli da libreria</span>${ICONS.chevronRight}
        </button>
        <button class="action-row" id="act-pdf">
          <div class="icon-circle">${ICONS.doc}</div>
          <span>Importa PDF</span>${ICONS.chevronRight}
        </button>
        <button class="btn-secondary" id="btn-cancel-doc">Annulla</button>
      </div>
    `);
    document.getElementById("btn-cancel-doc").addEventListener("click", closeSheet);
    document.getElementById("act-camera").addEventListener("click", () => document.getElementById("input-camera").click());
    document.getElementById("act-library").addEventListener("click", () => document.getElementById("input-library").click());
    document.getElementById("act-pdf").addEventListener("click", () => document.getElementById("input-pdf").click());
  }

  async function handleFileInput(file, tipo) {
    if (!file) return;
    const jobId = state.currentJobId;
    const dataUrl = await fileToDataURL(file);
    await dbAdd("documents", { jobId, nome: file.name || (tipo === "pdf" ? "documento.pdf" : "foto.jpg"), tipo: tipo === "pdf" ? "pdf" : "image", dataUrl, createdAt: new Date().toISOString() });
    await touchJob(jobId);
    closeSheet();
    await renderDocumenti(jobId);
    showToast("Documento aggiunto");
  }

  document.getElementById("input-camera").addEventListener("change", (e) => handleFileInput(e.target.files[0], "image").then(() => e.target.value = ""));
  document.getElementById("input-library").addEventListener("change", (e) => handleFileInput(e.target.files[0], "image").then(() => e.target.value = ""));
  document.getElementById("input-pdf").addEventListener("change", (e) => handleFileInput(e.target.files[0], "pdf").then(() => e.target.value = ""));

  /* ---------------- ORE TAB ---------------- */

  async function renderOre(jobId) {
    const hours = await dbAll("hours", "jobId", jobId);
    hours.sort((a, b) => (b.date || "").localeCompare(a.date || "") || b.id - a.id);
    const listEl = document.getElementById("hours-list");
    if (hours.length === 0) {
      listEl.innerHTML = `<div class="empty-state" style="padding:30px 0;">Nessuna ora registrata ancora.</div>`;
    } else {
      listEl.innerHTML = hours.map((h) => {
        const initial = (h.operatore || "?").charAt(0).toUpperCase();
        const color = OPERATOR_COLOR[h.operatore] || "var(--ink-muted)";
        const rowTotal = (Number(h.ore) || 0) * (Number(h.costoOrario) || 0);
        return `
          <div class="entry-row">
            <div class="entry-left">
              <div class="entry-avatar" style="background:${color}">${initial}</div>
              <div>
                <div class="entry-title">${escapeHtml(h.operatore)}</div>
                <div class="entry-sub">${formatDateISO(h.date)}${h.costoOrario !== DEFAULT_RATE ? " · €" + formatNum(h.costoOrario) + "/h" : ""}</div>
              </div>
            </div>
            <div class="entry-right">
              <div>
                <div class="amount">${formatNum(h.ore)} h</div>
                <div class="sub">${formatEUR(rowTotal)}</div>
              </div>
              <button class="entry-del" data-del-hours="${h.id}">${ICONS.trash}</button>
            </div>
          </div>`;
      }).join("");
    }
    const totalH = hours.reduce((s, h) => s + (Number(h.ore) || 0), 0);
    const totalCost = hours.reduce((s, h) => s + (Number(h.ore) || 0) * (Number(h.costoOrario) || 0), 0);
    document.getElementById("hours-total-h").textContent = formatNum(totalH) + " h";
    document.getElementById("hours-total-cost").textContent = formatEUR(totalCost);
    listEl.querySelectorAll("[data-del-hours]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Eliminare questa registrazione ore?")) return;
        await dbDelete("hours", Number(btn.dataset.delHours));
        await renderOre(jobId);
      });
    });
  }

  async function openAddHoursSheet(jobId) {
    const selectedOperator = state.lastOperator || OPERATORS[0];
    const rate = await getOperatorRate(selectedOperator);
    openSheet(`
      <div class="sheet">
        <div class="sheet-grabber"></div>
        <div class="sheet-title">Aggiungi ore lavorate</div>
        <div class="form-scroll">
          <div>
            <div class="field-label">Operatore</div>
            <div class="pill-group" id="op-pills">
              ${OPERATORS.map((op) => `<button class="pill-option ${op === selectedOperator ? "selected" : ""}" data-op="${op}">${op}</button>`).join("")}
            </div>
          </div>
          <div>
            <div class="field-label">Data</div>
            <input class="field-input" id="f-hours-date" type="date" value="${todayISO()}">
          </div>
          <div class="field-row2">
            <div>
              <div class="field-label">Ore</div>
              <div class="stepper">
                <button class="stepper-btn" id="hours-minus">−</button>
                <div class="stepper-val" id="hours-val">1</div>
                <button class="stepper-btn" id="hours-plus">+</button>
              </div>
            </div>
            <div>
              <div class="field-label">Costo orario</div>
              <input class="field-input" id="f-hours-rate" type="number" inputmode="decimal" step="0.5" value="${rate}">
            </div>
          </div>
          <button class="btn-primary" id="btn-save-hours">Salva</button>
        </div>
      </div>
    `);
    let hoursVal = 1;
    let currentOp = selectedOperator;
    const valEl = document.getElementById("hours-val");
    document.getElementById("hours-minus").addEventListener("click", () => { hoursVal = Math.max(0.5, hoursVal - 0.5); valEl.textContent = formatNum(hoursVal); });
    document.getElementById("hours-plus").addEventListener("click", () => { hoursVal = hoursVal + 0.5; valEl.textContent = formatNum(hoursVal); });
    overlayContent.querySelectorAll("[data-op]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        currentOp = btn.dataset.op;
        overlayContent.querySelectorAll("[data-op]").forEach((b) => b.classList.toggle("selected", b === btn));
        document.getElementById("f-hours-rate").value = await getOperatorRate(currentOp);
      });
    });
    document.getElementById("btn-save-hours").addEventListener("click", async () => {
      const date = document.getElementById("f-hours-date").value || todayISO();
      const costoOrario = parseFloat(document.getElementById("f-hours-rate").value) || 0;
      if (hoursVal <= 0) { showToast("Inserisci un numero di ore valido"); return; }
      await dbAdd("hours", { jobId, operatore: currentOp, date, ore: hoursVal, costoOrario });
      state.lastOperator = currentOp;
      await touchJob(jobId);
      closeSheet();
      await renderOre(jobId);
      showToast("Ore aggiunte");
    });
  }

  /* ---------------- REGISTRA ORE (rapido, da Home) ---------------- */

  async function openQuickHoursSheet() {
    const allJobs = await dbAll("jobs");
    const selectedOperator = state.lastOperator || OPERATORS[0];
    const rate = await getOperatorRate(selectedOperator);
    openSheet(`
      <div class="sheet">
        <div class="sheet-grabber"></div>
        <div class="sheet-title">Registra ore</div>
        <div class="form-scroll">
          <div>
            <div class="field-label">Data</div>
            <input class="field-input" id="f-qh-date" type="date" value="${todayISO()}">
          </div>
          <div>
            <div class="field-label">Operatore</div>
            <div class="pill-group" id="qh-op-pills">
              ${OPERATORS.map((op) => `<button class="pill-option ${op === selectedOperator ? "selected" : ""}" data-op="${op}">${op}</button>`).join("")}
            </div>
          </div>
          <div>
            <div class="field-label">Lavoro</div>
            <input class="field-input" id="f-qh-job" list="qh-job-list" placeholder="Scrivi o scegli un lavoro" autocomplete="off">
            <datalist id="qh-job-list">
              ${allJobs.map((j) => `<option value="${escapeHtml(jobDisplayName(j))}"></option>`).join("")}
            </datalist>
          </div>
          <div class="field-row2">
            <div>
              <div class="field-label">Ore</div>
              <div class="stepper">
                <button class="stepper-btn" id="qh-hours-minus">−</button>
                <div class="stepper-val" id="qh-hours-val">1</div>
                <button class="stepper-btn" id="qh-hours-plus">+</button>
              </div>
            </div>
            <div>
              <div class="field-label">Costo orario</div>
              <input class="field-input" id="f-qh-rate" type="number" inputmode="decimal" step="0.5" value="${rate}">
            </div>
          </div>
          <button class="btn-primary" id="btn-save-qh">Salva</button>
        </div>
      </div>
    `);
    document.getElementById("f-qh-job").focus();
    let hoursVal = 1;
    let currentOp = selectedOperator;
    const valEl = document.getElementById("qh-hours-val");
    document.getElementById("qh-hours-minus").addEventListener("click", () => { hoursVal = Math.max(0.5, hoursVal - 0.5); valEl.textContent = formatNum(hoursVal); });
    document.getElementById("qh-hours-plus").addEventListener("click", () => { hoursVal = hoursVal + 0.5; valEl.textContent = formatNum(hoursVal); });
    overlayContent.querySelectorAll("[data-op]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        currentOp = btn.dataset.op;
        overlayContent.querySelectorAll("[data-op]").forEach((b) => b.classList.toggle("selected", b === btn));
        document.getElementById("f-qh-rate").value = await getOperatorRate(currentOp);
      });
    });
    document.getElementById("btn-save-qh").addEventListener("click", async () => {
      const lavoroText = document.getElementById("f-qh-job").value.trim();
      if (!lavoroText) { showToast("Inserisci il lavoro"); return; }
      const date = document.getElementById("f-qh-date").value || todayISO();
      const costoOrario = parseFloat(document.getElementById("f-qh-rate").value) || 0;
      if (hoursVal <= 0) { showToast("Inserisci un numero di ore valido"); return; }

      const match = allJobs.find((j) => jobDisplayName(j).trim().toLowerCase() === lavoroText.toLowerCase());
      let jobId, toastMsg;
      if (match) {
        jobId = match.id;
        toastMsg = `Ore aggiunte a "${jobDisplayName(match)}"`;
      } else {
        const now = todayISO();
        jobId = await dbAdd("jobs", { cliente: lavoroText, titolo: "", preventivo: 0, stato: "Lavoro extra", extra: true, createdAt: now, updatedAt: now });
        toastMsg = `Nuovo lavoro extra "${lavoroText}" creato`;
      }

      await dbAdd("hours", { jobId, operatore: currentOp, date, ore: hoursVal, costoOrario });
      state.lastOperator = currentOp;
      await touchJob(jobId);
      closeSheet();
      showToast(toastMsg);
      if (state.view === "home") await renderHome();
      if (state.view === "job" && state.currentJobId === jobId) await renderOre(jobId);
    });
  }

  /* ---------------- MATERIALI TAB ---------------- */

  function materialIcon(cat) {
    if (cat === "Verniciatura") return ICONS.paint;
    if (cat === "Ferramenta") return ICONS.wrench;
    return ICONS.box;
  }

  async function renderMateriali(jobId) {
    const materials = await dbAll("materials", "jobId", jobId);
    materials.sort((a, b) => {
      const pa = a.stato === "ordinato" ? 0 : 1;
      const pb = b.stato === "ordinato" ? 0 : 1;
      if (pa !== pb) return pa - pb;
      return b.id - a.id;
    });
    const listEl = document.getElementById("materials-list");
    if (materials.length === 0) {
      listEl.innerHTML = `<div class="empty-state" style="padding:30px 0;">Nessun acquisto registrato ancora.</div>`;
    } else {
      listEl.innerHTML = materials.map((m) => {
        const pending = m.stato === "ordinato";
        const rowTotal = (Number(m.quantita) || 0) * (Number(m.costoUnitario) || 0);
        return `
          <div class="entry-row ${pending ? "pending" : ""}" ${pending ? `data-arrive-mat="${m.id}"` : ""}>
            <div class="entry-left">
              <div class="entry-icon">${materialIcon(m.categoria)}</div>
              <div>
                <div class="entry-title">${escapeHtml(m.descrizione)}</div>
                <div class="entry-sub">${formatNum(m.quantita)} ${escapeHtml(m.unita || "")}${pending ? ' · <span class="status-badge status-preventivo" style="padding:2px 8px;">Ordinato</span>' : ""}</div>
              </div>
            </div>
            <div class="entry-right">
              <div class="amount">${pending ? "—" : formatEUR(rowTotal)}</div>
              <button class="entry-del" data-del-mat="${m.id}">${ICONS.trash}</button>
            </div>
          </div>`;
      }).join("");
    }
    const totalCost = materials
      .filter((m) => m.stato !== "ordinato")
      .reduce((s, m) => s + (Number(m.quantita) || 0) * (Number(m.costoUnitario) || 0), 0);
    document.getElementById("materials-total-cost").textContent = formatEUR(totalCost);
    listEl.querySelectorAll("[data-del-mat]").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (!confirm("Eliminare questo acquisto?")) return;
        await dbDelete("materials", Number(btn.dataset.delMat));
        await renderMateriali(jobId);
      });
    });
    listEl.querySelectorAll("[data-arrive-mat]").forEach((row) => {
      row.addEventListener("click", async () => {
        const m = await dbGet("materials", Number(row.dataset.arriveMat));
        if (m) openMaterialArrivalForm(jobId, m);
      });
    });
  }

  /**
   * Generalized material form. opts:
   *   title            sheet title
   *   saveLabel        save button text
   *   includeDate      show a date field (default today, editable)
   *   defaultDate      ISO date to prefill when includeDate
   *   initial          {categoria, descrizione, quantita, unita, costoUnitario} prefill
   *   stato            'arrivato' | 'ordinato' — status the saved record gets
   *   existingId       id of an existing materials record to update instead of creating
   *   onDone(material, dateVal)  called after save
   */
  function openMaterialFormSheet(jobId, opts) {
    const o = Object.assign({
      title: "Aggiungi acquisto", saveLabel: "Salva", includeDate: false,
      defaultDate: todayISO(), initial: {}, stato: "arrivato", existingId: null, onDone: null
    }, opts || {});
    const init = o.initial || {};
    let categoria = init.categoria || MATERIAL_CATEGORIES[0];
    openSheet(`
      <div class="sheet">
        <div class="sheet-grabber"></div>
        <div class="sheet-title">${escapeHtml(o.title)}</div>
        <div class="form-scroll">
          ${o.includeDate ? `
          <div>
            <div class="field-label">Data</div>
            <input class="field-input" id="f-mat-date" type="date" value="${o.defaultDate}">
          </div>` : ""}
          <div>
            <div class="field-label">Categoria</div>
            <select class="field-input" id="f-mat-cat">
              ${MATERIAL_CATEGORIES.map((c) => `<option value="${c}" ${c === categoria ? "selected" : ""}>${c}</option>`).join("")}
            </select>
          </div>
          <div>
            <div class="field-label">Descrizione</div>
            <input class="field-input" id="f-mat-desc" placeholder="es. Vernice PU trasparente" autocomplete="off" value="${escapeHtml(init.descrizione || "")}">
          </div>
          <div class="field-row2">
            <div>
              <div class="field-label">Quantità</div>
              <input class="field-input" id="f-mat-qty" type="number" inputmode="decimal" step="0.1" placeholder="0" value="${init.quantita || ""}">
            </div>
            <div>
              <div class="field-label">Unità</div>
              <input class="field-input" id="f-mat-unit" placeholder="L, pz, conf..." value="${escapeHtml(init.unita || "")}">
            </div>
          </div>
          <div>
            <div class="field-label">Costo unitario ${o.stato === "ordinato" ? "(se già noto)" : ""}</div>
            <input class="field-input" id="f-mat-cost" type="number" inputmode="decimal" step="0.01" placeholder="0,00" value="${init.costoUnitario || ""}">
          </div>
          <div class="total-pill">
            <span>Totale</span>
            <span id="mat-total-preview">${formatEUR((init.quantita || 0) * (init.costoUnitario || 0))}</span>
          </div>
          <button class="btn-primary" id="btn-save-material">${escapeHtml(o.saveLabel)}</button>
        </div>
      </div>
    `);
    document.getElementById("f-mat-desc").focus();
    document.getElementById("f-mat-cat").addEventListener("change", (e) => { categoria = e.target.value; });
    const qtyEl = document.getElementById("f-mat-qty");
    const costEl = document.getElementById("f-mat-cost");
    const previewEl = document.getElementById("mat-total-preview");
    function updatePreview() {
      const t = (parseFloat(qtyEl.value) || 0) * (parseFloat(costEl.value) || 0);
      previewEl.textContent = formatEUR(t);
    }
    qtyEl.addEventListener("input", updatePreview);
    costEl.addEventListener("input", updatePreview);
    document.getElementById("btn-save-material").addEventListener("click", async () => {
      const descrizione = document.getElementById("f-mat-desc").value.trim();
      if (!descrizione) { showToast("Inserisci una descrizione"); return; }
      const quantita = parseFloat(qtyEl.value) || 0;
      const unita = document.getElementById("f-mat-unit").value.trim();
      const costoUnitario = parseFloat(costEl.value) || 0;
      const dateVal = o.includeDate ? (document.getElementById("f-mat-date").value || o.defaultDate) : null;
      const record = { jobId, categoria, descrizione, quantita, unita, costoUnitario, stato: o.stato };
      let saved;
      if (o.existingId) {
        record.id = o.existingId;
        await dbPut("materials", record);
        saved = record;
      } else {
        const id = await dbAdd("materials", record);
        saved = Object.assign({ id }, record);
      }
      await touchJob(jobId);
      closeSheet();
      await renderMateriali(jobId);
      if (typeof o.onDone === "function") await o.onDone(saved, dateVal);
      else showToast("Acquisto aggiunto");
    });
  }

  function openAddMaterialSheet(jobId) {
    openMaterialFormSheet(jobId, { title: "Aggiungi acquisto", stato: "arrivato" });
  }

  function openMaterialArrivalForm(jobId, material) {
    openMaterialFormSheet(jobId, {
      title: "Materiale arrivato",
      saveLabel: "Conferma arrivo",
      includeDate: true,
      defaultDate: todayISO(),
      initial: material,
      stato: "arrivato",
      existingId: material.id,
      onDone: async (saved, dateVal) => {
        await dbAdd("events", { jobId, label: `Arrivo materiale — ${saved.descrizione}`, date: dateVal });
        await touchJob(jobId);
        await renderTimeline(jobId);
        showToast("Materiale segnato come arrivato");
      }
    });
  }

  /* ---------------- SETTINGS ---------------- */

  async function renderSettings() {
    const container = document.getElementById("operator-rates");
    const rows = await Promise.all(OPERATORS.map(async (op) => {
      const rate = await getOperatorRate(op);
      return `
        <div class="op-rate-row">
          <label><span style="width:10px;height:10px;border-radius:999px;background:${OPERATOR_COLOR[op]};display:inline-block;"></span>${op}</label>
          <input class="field-input" data-op-rate="${op}" type="number" inputmode="decimal" step="0.5" value="${rate}">
        </div>`;
    }));
    container.innerHTML = rows.join("");
    container.querySelectorAll("[data-op-rate]").forEach((input) => {
      input.addEventListener("change", async () => {
        const v = parseFloat(input.value) || 0;
        await setSetting("rate_" + input.dataset.opRate, v);
        showToast("Costo orario aggiornato");
      });
    });
  }

  async function exportBackup() {
    const [jobs, events, hours, materials, documents] = await Promise.all([
      dbAll("jobs"), dbAll("events"), dbAll("hours"), dbAll("materials"), dbAll("documents")
    ]);
    const rates = {};
    for (const op of OPERATORS) rates[op] = await getOperatorRate(op);
    const payload = { exportedAt: new Date().toISOString(), version: 1, jobs, events, hours, materials, documents, rates };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = todayISO();
    a.href = url;
    a.download = `backup-lavori-falegnameria-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast("Backup esportato");
  }

  async function importBackup(file) {
    const text = await file.text();
    let data;
    try { data = JSON.parse(text); } catch (e) { showToast("File non valido"); return; }
    if (!data || !Array.isArray(data.jobs)) { showToast("File non valido"); return; }
    if (!confirm("Importare questo backup? I dati attuali su questo dispositivo verranno sostituiti.")) return;

    const stores = ["jobs", "events", "hours", "materials", "documents"];
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const t = db.transaction(stores, "readwrite");
      stores.forEach((s) => t.objectStore(s).clear());
      t.oncomplete = resolve;
      t.onerror = () => reject(t.error);
    });
    for (const s of stores) {
      for (const row of data[s] || []) {
        await dbPut(s, row);
      }
    }
    if (data.rates) {
      for (const op of Object.keys(data.rates)) {
        await setSetting("rate_" + op, data.rates[op]);
      }
    }
    showToast("Backup importato");
    await renderSettings();
    goHome();
  }

  /* ---------------- Wiring ---------------- */

  document.getElementById("btn-new-job").addEventListener("click", openNewJobSheet);
  document.getElementById("btn-quick-hours").addEventListener("click", openQuickHoursSheet);
  document.getElementById("btn-back-home").addEventListener("click", goHome);
  document.getElementById("btn-back-home-2").addEventListener("click", goHome);

  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.nav;
      if (target === "home") goHome();
      else if (target === "new") openNewJobSheet();
      else if (target === "settings") { showView("settings"); renderSettings(); }
    });
  });

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  document.querySelectorAll("[data-add]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const jobId = state.currentJobId;
      const kind = btn.dataset.add;
      if (kind === "event") openAddEventSheet(jobId);
      else if (kind === "document") openAddDocumentSheet(jobId);
      else if (kind === "hours") openAddHoursSheet(jobId);
      else if (kind === "material") openAddMaterialSheet(jobId);
    });
  });

  document.getElementById("search-input").addEventListener("input", (e) => {
    state.searchQuery = e.target.value;
    renderHome();
  });

  document.getElementById("filter-chips").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    document.querySelectorAll("#filter-chips .chip").forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    state.statusFilter = chip.dataset.status;
    renderHome();
  });

  document.getElementById("btn-export").addEventListener("click", exportBackup);
  document.getElementById("import-file").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) importBackup(file);
    e.target.value = "";
  });

  /* ---------------- Boot ---------------- */

  openDB().then(renderHome).catch((err) => {
    console.error("Errore apertura database", err);
    showToast("Errore nell'apertura del database");
  });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }
})();
