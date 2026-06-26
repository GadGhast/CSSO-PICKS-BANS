// CS VETO — veto.js — v7 (velo de color más transparente en las tarjetas)
import { subscribeToMaps } from "./maps-service.js";

// ---------------------------------------------------------------
// Estado
// ---------------------------------------------------------------
let allMaps = [];           // mapas activos cargados desde Firestore
let sequence = [];          // [{ team:'A'|'B', action:'ban'|'pick'|'decider' }]
let stepIndex = 0;
let mapState = {};          // mapId -> { status:'available'|'banned'|'picked'|'decider' }
let teamNames = { A: "Equipo A", B: "Equipo B" };
let finalResults = [];      // log de resultado final

// ---------------------------------------------------------------
// DOM refs
// ---------------------------------------------------------------
const setupScreen = document.getElementById("setup-screen");
const vetoScreen = document.getElementById("veto-screen");
const resultScreen = document.getElementById("result-screen");

const teamAInput = document.getElementById("team-a");
const teamBInput = document.getElementById("team-b");
const formatSelect = document.getElementById("format");
const startsSelect = document.getElementById("starts");
const setupError = document.getElementById("setup-error");
const startBtn = document.getElementById("start-btn");

const mapsGrid = document.getElementById("maps-grid");
const terminal = document.getElementById("terminal");
const turnBannerEl = document.getElementById("turn-banner");
const turnTeamEl = document.getElementById("turn-team");
const turnActionEl = document.getElementById("turn-action");
const resetBtn = document.getElementById("reset-btn");
const resetBtn2 = document.getElementById("reset-btn-2");

const resultList = document.getElementById("result-list");

// ---------------------------------------------------------------
// Cargar mapas activos desde Firebase
// ---------------------------------------------------------------
subscribeToMaps((maps) => {
  allMaps = maps.filter((m) => m.active !== false);
  if (vetoScreen.style.display === "none" && setupScreen.style.display !== "none") {
    if (!allMaps.length) {
      setupError.textContent = "No hay mapas activos. Agrega mapas desde el panel de Admin.";
      startBtn.disabled = true;
    } else {
      setupError.textContent = "";
      startBtn.disabled = false;
    }
  }
});

// ---------------------------------------------------------------
// Generar secuencia de veto según formato y cantidad de mapas
// ---------------------------------------------------------------
function buildSequence(format, mapCount, firstTeam) {
  const picksNeeded = format === "bo1" ? 0 : format === "bo3" ? 2 : 4;
  let bansNeeded = mapCount - picksNeeded - 1; // el último mapa restante es el decider
  if (bansNeeded < 0) bansNeeded = 0;

  const seq = [];
  let turn = firstTeam;
  const other = (t) => (t === "A" ? "B" : "A");

  for (let i = 0; i < bansNeeded; i++) {
    seq.push({ team: turn, action: "ban" });
    turn = other(turn);
  }
  for (let i = 0; i < picksNeeded; i++) {
    seq.push({ team: turn, action: "pick" });
    turn = other(turn);
  }
  // El mapa que sobra es el decider automático (no consume turno de equipo)
  seq.push({ team: null, action: "decider" });
  return seq;
}

// ---------------------------------------------------------------
// Iniciar veto
// ---------------------------------------------------------------
startBtn.addEventListener("click", () => {
  if (!allMaps.length) return;

  teamNames.A = teamAInput.value.trim() || "Equipo A";
  teamNames.B = teamBInput.value.trim() || "Equipo B";

  let firstTeam = startsSelect.value;
  if (firstTeam === "random") firstTeam = Math.random() < 0.5 ? "A" : "B";

  sequence = buildSequence(formatSelect.value, allMaps.length, firstTeam);
  stepIndex = 0;
  mapState = {};
  finalResults = [];
  allMaps.forEach((m) => (mapState[m.id] = { status: "available" }));

  setupScreen.style.display = "none";
  resultScreen.style.display = "none";
  vetoScreen.style.display = "block";

  terminal.innerHTML = "";
  logLine(`sys`, `Veto iniciado — ${formatSelect.value.toUpperCase()} — ${teamNames.A} vs ${teamNames.B}`);
  logLine(`sys`, `Empieza: ${teamNames[firstTeam]}`);

  renderGrid();
  renderTurnBanner();
});

// ---------------------------------------------------------------
// Render del grid de mapas
// ---------------------------------------------------------------
function renderGrid() {
  mapsGrid.innerHTML = allMaps
    .map((m) => {
      const st = mapState[m.id];
      const classes = ["map-card"];
      if (st.status === "banned") classes.push("banned");
      if (st.status === "picked") classes.push("picked");
      if (st.status === "decider") classes.push("decider");
      if (st.status !== "available") classes.push("disabled-action");

      let stamp = "";
      if (st.status === "banned") stamp = `<div class="status-stamp">BANEADO</div>`;
      if (st.status === "picked") stamp = `<div class="status-stamp">PICK</div>`;
      if (st.status === "decider") stamp = `<div class="status-stamp">DECIDER</div>`;

      return `
        <div class="${classes.join(" ")}" data-id="${m.id}">
          <img src="${m.imageUrl}" alt="${m.name}" />
          <div class="meta">
            <div class="name">${m.name}</div>
            <div class="code">${m.code}</div>
          </div>
          ${stamp}
        </div>`;
    })
    .join("");

  mapsGrid.querySelectorAll(".map-card").forEach((card) => {
    card.addEventListener("click", () => onMapClick(card.dataset.id));
  });
}

// ---------------------------------------------------------------
// Banner de turno actual
// ---------------------------------------------------------------
function renderTurnBanner() {
  if (stepIndex >= sequence.length) {
    finishVeto();
    return;
  }

  const step = sequence[stepIndex];

  if (step.action === "decider") {
    resolveDecider();
    return;
  }

  turnTeamEl.textContent = teamNames[step.team];
  turnActionEl.textContent = step.action === "ban" ? "BAN" : "PICK";
  turnActionEl.className = "action-tag " + (step.action === "ban" ? "ban" : "pick");
  turnBannerEl.className = "turn-banner " + (step.action === "ban" ? "is-ban" : "is-pick");
}

// ---------------------------------------------------------------
// Click en un mapa
// ---------------------------------------------------------------
function onMapClick(mapId) {
  if (stepIndex >= sequence.length) return;

  const step = sequence[stepIndex];
  if (step.action === "decider") return; // se resuelve solo

  const st = mapState[mapId];
  if (st.status !== "available") return;

  const map = allMaps.find((m) => m.id === mapId);

  if (step.action === "ban") {
    st.status = "banned";
    logLine("ban", `[${teamNames[step.team]}] BANEÓ ${map.code.toUpperCase()}`);
    stepIndex++;
    renderGrid();
    renderTurnBanner();
  } else if (step.action === "pick") {
    st.status = "picked";
    logLine("pick", `[${teamNames[step.team]}] ELIGIÓ ${map.code.toUpperCase()}`);
    finalResults.push({ type: "pick", team: step.team, map });
    stepIndex++;
    renderGrid();
    renderTurnBanner();
  }
}

// ---------------------------------------------------------------
// Resolver el decider automático
// ---------------------------------------------------------------
function resolveDecider() {
  const remaining = allMaps.filter((m) => mapState[m.id].status === "available");
  if (remaining.length !== 1) {
    // Seguridad: si por algún motivo hay más de uno, no se rompe la app
    if (remaining.length === 0) return finishVeto();
  }
  const decider = remaining[0];
  mapState[decider.id].status = "decider";
  logLine("decider", `DECIDER → ${decider.code.toUpperCase()}`);
  finalResults.push({ type: "decider", team: null, map: decider });
  stepIndex++;
  renderGrid();
  finishVeto();
}

// ---------------------------------------------------------------
// Terminal log
// ---------------------------------------------------------------
function logLine(type, text) {
  const ts = new Date().toLocaleTimeString();
  const tagClass =
    type === "ban" ? "tag-ban" :
    type === "pick" ? "tag-pick" :
    type === "decider" ? "tag-decider" : "tag-sys";

  const line = document.createElement("div");
  line.className = "line";
  line.innerHTML = `<span class="ts">${ts}</span><span class="${tagClass}">${text}</span>`;
  terminal.appendChild(line);
  terminal.scrollTop = terminal.scrollHeight;
}

// ---------------------------------------------------------------
// Pantalla final de resultado
// ---------------------------------------------------------------
function finishVeto() {
  logLine("sys", "Veto finalizado.");
  setTimeout(() => {
    vetoScreen.style.display = "none";
    resultScreen.style.display = "block";

    resultList.innerHTML = finalResults
      .map((r) => {
        const label =
          r.type === "decider" ? "DECIDER" :
          `PICK — ${teamNames[r.team]}`;
        return `<li class="${r.type}">
          <span class="mono">${r.map.code.toUpperCase()}</span>
          <span>${label}</span>
        </li>`;
      })
      .join("");
  }, 600);
}

// ---------------------------------------------------------------
// Reiniciar
// ---------------------------------------------------------------
function resetVeto() {
  vetoScreen.style.display = "none";
  resultScreen.style.display = "none";
  setupScreen.style.display = "block";
  stepIndex = 0;
  sequence = [];
  mapState = {};
  finalResults = [];
}
resetBtn.addEventListener("click", resetVeto);
resetBtn2.addEventListener("click", resetVeto);
