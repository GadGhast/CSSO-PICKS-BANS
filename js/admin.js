import {
  subscribeToMaps,
  addMap,
  deleteMap,
  uploadMapImage
} from "./maps-service.js";

const form = document.getElementById("map-form");
const nameInput = document.getElementById("map-name");
const codeInput = document.getElementById("map-code");
const urlInput = document.getElementById("map-image-url");
const fileInput = document.getElementById("map-image-file");
const errorBox = document.getElementById("form-error");
const submitBtn = document.getElementById("submit-btn");
const grid = document.getElementById("maps-grid");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorBox.textContent = "";

  const name = nameInput.value.trim();
  const code = codeInput.value.trim();
  const url = urlInput.value.trim();
  const file = fileInput.files[0];

  if (!name || !code) {
    errorBox.textContent = "El nombre y el código son obligatorios.";
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
          <div class="code">${m.code}</div>
        </div>
      </div>
    `
      )
      .join("");

    grid.querySelectorAll(".remove-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();

        // Primer click: pide confirmación dentro del propio botón,
        // sin usar confirm() nativo (puede estar bloqueado en algunos
        // navegadores/vistas previas).
        if (btn.dataset.confirming !== "true") {
          btn.dataset.confirming = "true";
          btn.textContent = "✓";
          btn.title = "Click de nuevo para confirmar el borrado";
          btn.style.background = "var(--ban)";
          btn.style.color = "#fff";
          btn.style.borderColor = "var(--ban)";

          // Si no confirma en 3s, se revierte al estado normal
          btn._confirmTimeout = setTimeout(() => {
            resetRemoveBtn(btn);
          }, 3000);
          return;
        }

        // Segundo click dentro de los 3s: borra de verdad
        clearTimeout(btn._confirmTimeout);
        performDelete(btn);
      });
    });
  },
  (err) => {
    console.error(err);
    grid.innerHTML = `<div class="empty-state">No se pudieron cargar los mapas: ${err.message}</div>`;
    showToast("Error al leer los mapas desde Firestore: " + err.message, "error");
  }
);

function resetRemoveBtn(btn) {
  btn.dataset.confirming = "false";
  btn.textContent = "✕";
  btn.title = "Eliminar mapa";
  btn.style.background = "";
  btn.style.color = "";
  btn.style.borderColor = "";
}

async function performDelete(btn) {
  const id = btn.dataset.id;
  const storagePath = btn.dataset.storage || null;
  btn.disabled = true;
  btn.textContent = "…";

  try {
    await deleteMap(id, storagePath);
    showToast("Mapa eliminado.", "info");
    // No hace falta tocar el DOM: subscribeToMaps vuelve a renderizar el grid solo.
  } catch (err) {
    console.error(err);
    let msg = err.message || "Error desconocido al eliminar.";
    if (err.code === "permission-denied") {
      msg =
        "Firestore rechazó el borrado (permission-denied). Revisa las reglas de seguridad en la consola de Firebase (Firestore → Reglas) y permite 'write' en la colección 'maps'.";
    }
    showToast(msg, "error");
    btn.disabled = false;
    resetRemoveBtn(btn);
  }
}
