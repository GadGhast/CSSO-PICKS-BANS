// CS VETO — maps-page.js — v16 (galería pública de mapas, solo lectura)
import { subscribeToMaps } from "./maps-service.js";

const grid = document.getElementById("maps-grid");
const countEl = document.getElementById("maps-count");

subscribeToMaps(
  (maps) => {
    countEl.textContent = `${maps.length} mapa${maps.length === 1 ? "" : "s"} registrado${maps.length === 1 ? "" : "s"}.`;

    if (!maps.length) {
      grid.innerHTML = `<div class="empty-state">Todavía no hay mapas. Agrégalos desde el panel de Admin.</div>`;
      return;
    }

    grid.innerHTML = maps
      .map((m) => {
        const inactiveTag =
          m.active === false
            ? `<div class="status-stamp" style="opacity:1; color:var(--muted); border:2px solid var(--muted); margin:10px; border-radius:4px; font-size:14px;">INACTIVO</div>`
            : "";
        return `
        <div class="map-card disabled-action">
          <img src="${m.imageUrl}" alt="${m.name}" />
          <div class="meta">
            <div class="name">${m.name}</div>
          </div>
          ${inactiveTag}
        </div>`;
      })
      .join("");
  },
  (err) => {
    console.error(err);
    grid.innerHTML = `<div class="empty-state">No se pudieron cargar los mapas: ${err.message}</div>`;
  }
);
