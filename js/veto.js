// CS VETO — veto.js — v9 (más transparencia en el velo de color)
import { subscribeToMaps } from "./maps-service.js";
import { subscribeToTeams } from "./teams-service.js";

// ---------------------------------------------------------------
// Estado
// ---------------------------------------------------------------
let allMaps = [];           // mapas activos cargados desde Firestore
let allTeams = [];          // equipos cargados desde Firestore
let selectedTeam = { A: null, B: null }; // { id, name, logoUrl } | null
let sequence = [];          // [{ team:'A'|'B', action:'ban'|'pick'|'decider' }]
let stepIndex = 0;
let mapState = {};          // mapId -> { status:'available'|'banned'|'picked'|'decider' }
let teamNames = { A: { name: "Equipo A", logoUrl: null }, B: { name: "Equipo B", logoUrl: null } };
let finalResults = [];      // log de resultado final

// ---------------------------------------------------------------
// DOM refs
// ---------------------------------------------------------------
const setupScreen = document.getElementById("setup-screen");
const vetoScreen = document.getElementById("veto-screen");
const resultScreen = document.getElementById("result-screen");

const teamAPicker = document.getElementById("team-a-picker");
const teamBPicker = document.getElementById("team-b-picker");
const formatSelect = document.getElementById("format");
const startsSelect = document.getElementById("starts");
const setupError = document.getElementById("setup-error");
const startBtn = document.getElementById("start-btn");

const mapsGrid = document.getElementById("maps-grid");
const terminal = document.getElementById("terminal");
const turnBannerEl = document.getElementById("turn-banner");
const turnTeamLogoEl = document.getElementById("turn-team-logo");
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
  validateSetup();
});

// ---------------------------------------------------------------
// Cargar equipos desde Firebase y dibujar los selectores (chips)
// ---------------------------------------------------------------
subscribeToTeams((teams) => {
  allTeams = teams;

  // Si un equipo seleccionado fue eliminado de Firestore, deselecciona
  if (selectedTeam.A && !allTeams.find((t) => t.id === selectedTeam.A.id)) selectedTeam.A = null;
  if (selectedTeam.B && !allTeams.find((t) => t.id === selectedTeam.B.id)) selectedTeam.B = null;

  renderTeamPicker("A");
  renderTeamPicker("B");
  validateSetup();
});

function teamChipHTML(team, side) {
  const isSelected = selectedTeam[side]?.id === team.id;
  const otherSide = side === "A" ? "B" : "A";
  const isTaken = selectedTeam[otherSide]?.id === team.id; // ya elegido en el otro lado
  const classes = ["team-chip"];
  if (isSelected) classes.push("selected");
  if (isTaken) classes.push("taken");

  const logo = team.logoUrl
    ? `<img src="${team.logoUrl}" alt="" />`
    : `<span class="no-logo">${team.name.slice(0, 2).toUpperCase()}</span>`;

  return `
    <div class="${classes.join(" ")}" data-id="${team.id}">
      <div class="logo-wrap">${logo}</div>
      <div class="chip-name">${team.name}</div>
    </div>`;
}

function renderTeamPicker(side) {
  const container = side === "A" ? teamAPicker : teamBPicker;

  if (!allTeams.length) {
    container.innerHTML = `<div class="empty-state" style="padding:14px;">No hay equipos. Agrégalos desde Admin.</div>`;
    return;
  }

  container.innerHTML = allTeams.map((t) => teamChipHTML(t, side)).join("");

  container.querySelectorAll(".team-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      if (chip.classList.contains("taken")) return;
      const team = allTeams.find((t) => t.id === chip.dataset.id);
      selectedTeam[side] = team;
      renderTeamPicker("A");
      renderTeamPicker("B");
      validateSetup();
    });
  });
}

// ---------------------------------------------------------------
// Validación general de la pantalla de setup
// ---------------------------------------------------------------
function validateSetup() {
  if (vetoScreen.style.display !== "none") return; // ya empezó el veto

  if (!allMaps.length) {
    setupError.textContent = "No hay mapas activos. Agrega mapas desde el panel de Admin.";
    startBtn.disabled = true;
    return;
  }
  if (!allTeams.length) {
    setupError.textContent = "No hay equipos. Agrega al menos dos equipos desde el panel de Admin.";
    startBtn.disabled = true;
    return;
  }
  if (!selectedTeam.A || !selectedTeam.B) {
    setupError.textContent = "Selecciona el Equipo A y el Equipo B.";
    startBtn.disabled = true;
    return;
  }
  if (selectedTeam.A.id === selectedTeam.B.id) {
    setupError.textContent = "El Equipo A y el Equipo B no pueden ser el mismo.";
    startBtn.disabled = true;
    return;
  }

  setupError.textContent = "";
  startBtn.disabled = false;
}

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
  if (!allMaps.length || !selectedTeam.A || !selectedTeam.B) return;

  teamNames.A = { name: selectedTeam.A.name, logoUrl: selectedTeam.A.logoUrl || null };
  teamNames.B = { name: selectedTeam.B.name, logoUrl: selectedTeam.B.logoUrl || null };

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
  logLine(`sys`, `Veto iniciado — ${formatSelect.value.toUpperCase()} — ${teamNames.A.name} vs ${teamNames.B.name}`);
  logLine(`sys`, `Empieza: ${teamNames[firstTeam].name}`);

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

  const team = teamNames[step.team];
  turnTeamEl.textContent = team.name;

  if (team.logoUrl) {
    turnTeamLogoEl.src = team.logoUrl;
    turnTeamLogoEl.classList.add("visible");
  } else {
    turnTeamLogoEl.removeAttribute("src");
    turnTeamLogoEl.classList.remove("visible");
  }

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
    logLine("ban", `[${teamNames[step.team].name}] BANEÓ ${map.code.toUpperCase()}`);
    stepIndex++;
    renderGrid();
    renderTurnBanner();
  } else if (step.action === "pick") {
    st.status = "picked";
    logLine("pick", `[${teamNames[step.team].name}] ELIGIÓ ${map.code.toUpperCase()}`);
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
          `PICK — ${teamNames[r.team].name}`;
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
  validateSetup();
}
resetBtn.addEventListener("click", resetVeto);
resetBtn2.addEventListener("click", resetVeto);
