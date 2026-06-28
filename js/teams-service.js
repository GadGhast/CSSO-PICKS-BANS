// ============================================================
// TEAMS SERVICE
// Capa de acceso a la colección "teams" de Firestore.
// Los logos ya NO se suben a Firebase Storage: se guarda
// directamente la URL pública (GitHub + jsDelivr, ver README).
// Mismo patrón que maps-service.js.
// ============================================================

import { db } from "./firebase-config.js";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const teamsCol = collection(db, "teams");

/**
 * Escucha en tiempo real la colección de equipos, ordenada por "order".
 */
export function subscribeToTeams(callback, onError) {
  const q = query(teamsCol, orderBy("order", "asc"));
  return onSnapshot(
    q,
    (snapshot) => {
      const teams = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(teams);
    },
    (error) => {
      console.error("Error en subscribeToTeams:", error);
      if (onError) onError(error);
    }
  );
}

/**
 * Crea un equipo nuevo en Firestore.
 * data = { name, logoUrl, order }
 */
export async function addTeam(data) {
  return await addDoc(teamsCol, {
    name: data.name,
    logoUrl: data.logoUrl || null,
    order: data.order ?? Date.now(),
    createdAt: serverTimestamp()
  });
}

/**
 * Elimina un equipo de Firestore (solo el documento; el logo
 * vive en GitHub, no en Firebase).
 */
export async function deleteTeam(teamId) {
  await deleteDoc(doc(db, "teams", teamId));
}
