import {
  subscribeToMaps,
  addMap,
  deleteMap,
  uploadMapImage
} from "./maps-service.js";
import {
  subscribeToTeams,
  addTeam,
  deleteTeam,
  uploadTeamLogo
} from "./teams-service.js";

// ---------------------------------------------------------------
// Toast de feedback (sin alert() nativo, que algunos navegadores
// o vistas previas en iframe bloquean silenciosamente)
// ---------------------------------------------------------------
const toastContainer = document.getElementById("toast-container");

function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.textContent = message;
  toast.style.padding = "10px 16px";
  toast.style.borderRadius = "2px";
  toast.style.fontFamily = "var(--font-body)";
  toast.style.fontSize = "13px";
  toast.style.border = "1px solid var(--border)";
  toast.style.background = "var(--panel-2)";
  toast.style.color = type === "error" ? "var(--ban)" : "var(--text)";
  toast.style.borderColor = type === "error" ? "var(--ban)" : "var(--border)";
  toast.style.boxShadow = "0 4px 14px rgba(0,0,0,0.4)";
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

// ---------------------------------------------------------------
// Botón ✕ de borrado con confirmación en 2 clicks (genérico,
// se usa tanto para mapas como para equipos)
// ---------------------------------------------------------------
function resetRemoveBtn(btn) {
  btn.dataset.confirming = "false";
  btn.textContent = "✕";
  btn.title = "Eliminar";
  btn.style.background = "";
  btn.style.color = "";
  btn.style.borderColor = "";
}

function attachDeleteHandler(btn, deleteFn, entityLabel) {
  btn.addEventListener("click", (e) => {
    e.stopPropagation();

    if (btn.dataset.confirming !== "true") {
      btn.dataset.confirming = "true";
      btn.textContent = "✓";
      btn.title = "Click de nuevo para confirmar el borrado";
      btn.style.background = "var(--ban)";
      btn.style.color = "#fff";
      btn.style.borderColor = "var(--ban)";

      btn._confirmTimeout = setTimeout(() => resetRemoveBtn(btn), 3000);
      return;
    }

    clearTimeout(btn._confirmTimeout);
    performDelete(btn, deleteFn, entityLabel);
  });
}

async function performDelete(btn, deleteFn, entityLabel) {
  const id = btn.dataset.id;
  const storagePath = btn.dataset.storage || null;
  btn.disabled = true;
  btn.textContent = "…";

  try {
    await deleteFn(id, storagePath);
    showToast(`${entityLabel} eliminado.`, "info");
    // No hace falta tocar el DOM: el subscribe vuelve a renderizar el grid solo.
  } catch (err) {
    console.error(err);
    let msg = err.message || "Error desconocido al eliminar.";
    if (err.code === "permission-denied") {
      msg =
        "Firestore rechazó el borrado (permission-denied). Revisa las reglas de seguridad en la consola de Firebase.";
    }
    showToast(msg, "error");
    btn.disabled = false;
    resetRemoveBtn(btn);
  }
}

// ================================================================
// MAPAS
// ================================================================
const form = document.getElementById("map-form");
const nameInput = document.getElementById("map-name");
const urlInput = document.getElementById("map-image-url");
const fileInput = document.getElementById("map-image-file");
const errorBox = document.getElementById("form-error");
const submitBtn = document.getElementById("submit-btn");
const grid = document.getElementById("maps-grid");

// Genera un código interno tipo "de_mirage" a partir del nombre,
// solo para uso interno (log de consola, identificadores).
function slugify(name) {
  return name
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // quita acentos
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorBox.textContent = "";

  const name = nameInput.value.trim();
  const code = slugify(name);
  const url = urlInput.value.trim();
  const file = fileInput.files[0];

  if (!name) {
    errorBox.textContent = "El nombre es obligatorio.";
    return;
  }
  if (!url && !file) {
    errorBox.textContent = "Debes pegar una URL de imagen o subir un archivo.";
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Guardando…";

  try {
    let imageUrl = url;
    let storagePath = null;

    if (file) {
      imageUrl = await uploadMapImage(file, code);
      storagePath = `maps/${code}-${Date.now()}-${file.name}`;
    }

    await addMap({ name, code, imageUrl, storagePath, active: true });

    form.reset();
  } catch (err) {
    console.error(err);
    errorBox.textContent = "Error al guardar el mapa: " + err.message;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "+ Agregar mapa";
  }
});

subscribeToMaps(
  (maps) => {
    if (!maps.length) {
      grid.innerHTML = `<div class="empty-state">Todavía no hay mapas. Agrega el primero arriba.</div>`;
      return;
    }

    grid.innerHTML = maps
      .map(
        (m) => `
      <div class="map-card" data-id="${m.id}">
        <button type="button" class="remove-btn" title="Eliminar mapa" data-id="${m.id}" data-storage="${m.storagePath || ""}">✕</button>
        <img src="${m.imageUrl}" alt="${m.name}" />
        <div class="meta">
          <div class="name">${m.name}</div>
        </div>
      </div>
    `
      )
      .join("");

    grid.querySelectorAll(".remove-btn").forEach((btn) => {
      attachDeleteHandler(btn, deleteMap, "Mapa");
    });
  },
  (err) => {
    console.error(err);
    grid.innerHTML = `<div class="empty-state">No se pudieron cargar los mapas: ${err.message}</div>`;
    showToast("Error al leer los mapas desde Firestore: " + err.message, "error");
  }
);

// ================================================================
// EQUIPOS
// ================================================================
const teamForm = document.getElementById("team-form");
const teamNameInput = document.getElementById("team-name");
const teamLogoUrlInput = document.getElementById("team-logo-url");
const teamLogoFileInput = document.getElementById("team-logo-file");
const teamErrorBox = document.getElementById("team-form-error");
const teamSubmitBtn = document.getElementById("team-submit-btn");
const teamsGrid = document.getElementById("teams-grid");

teamForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  teamErrorBox.textContent = "";

  const name = teamNameInput.value.trim();
  const url = teamLogoUrlInput.value.trim();
  const file = teamLogoFileInput.files[0];

  if (!name) {
    teamErrorBox.textContent = "El nombre del equipo es obligatorio.";
    return;
  }

  teamSubmitBtn.disabled = true;
  teamSubmitBtn.textContent = "Guardando…";

  try {
    let logoUrl = url || null;
    let storagePath = null;

    if (file) {
      logoUrl = await uploadTeamLogo(file, name);
      storagePath = `teams/${name}-${Date.now()}-${file.name}`;
    }

    await addTeam({ name, logoUrl, storagePath });

    teamForm.reset();
  } catch (err) {
    console.error(err);
    teamErrorBox.textContent = "Error al guardar el equipo: " + err.message;
  } finally {
    teamSubmitBtn.disabled = false;
    teamSubmitBtn.textContent = "+ Agregar equipo";
  }
});

subscribeToTeams(
  (teams) => {
    if (!teams.length) {
      teamsGrid.innerHTML = `<div class="empty-state">Todavía no hay equipos. Agrega el primero arriba.</div>`;
      return;
    }

    teamsGrid.innerHTML = teams
      .map(
        (t) => `
      <div class="team-card" data-id="${t.id}">
        <button type="button" class="remove-btn" title="Eliminar equipo" data-id="${t.id}" data-storage="${t.storagePath || ""}">✕</button>
        <div class="logo-wrap">
          ${
            t.logoUrl
              ? `<img src="${t.logoUrl}" alt="${t.name}" />`
              : `<span class="no-logo">${t.name.slice(0, 2).toUpperCase()}</span>`
          }
        </div>
        <div class="team-name">${t.name}</div>
      </div>
    `
      )
      .join("");

    teamsGrid.querySelectorAll(".remove-btn").forEach((btn) => {
      attachDeleteHandler(btn, deleteTeam, "Equipo");
    });
  },
  (err) => {
    console.error(err);
    teamsGrid.innerHTML = `<div class="empty-state">No se pudieron cargar los equipos: ${err.message}</div>`;
    showToast("Error al leer los equipos desde Firestore: " + err.message, "error");
  }
);
