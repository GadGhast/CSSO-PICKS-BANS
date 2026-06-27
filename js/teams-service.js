// ============================================================
// TEAMS SERVICE
// Capa de acceso a la colección "teams" de Firestore y al
// bucket "teams/" de Storage. Mismo patrón que maps-service.js.
// ============================================================

import { db, storage } from "./firebase-config.js";
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
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

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
 * Sube un logo de equipo a Storage y devuelve la URL pública.
 */
export async function uploadTeamLogo(file, teamName) {
  const safeName = `${teamName || "team"}-${Date.now()}-${file.name}`;
  const storageRef = ref(storage, `teams/${safeName}`);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}

/**
 * Crea un equipo nuevo en Firestore.
 * data = { name, logoUrl, storagePath, order }
 */
export async function addTeam(data) {
  return await addDoc(teamsCol, {
    name: data.name,
    logoUrl: data.logoUrl || null,
    storagePath: data.storagePath || null,
    order: data.order ?? Date.now(),
    createdAt: serverTimestamp()
  });
}

/**
 * Elimina un equipo de Firestore (y su logo de Storage si existe).
 */
export async function deleteTeam(teamId, storagePath) {
  await deleteDoc(doc(db, "teams", teamId));
  if (storagePath) {
    try {
      await deleteObject(ref(storage, storagePath));
    } catch (e) {
      console.warn("No se pudo borrar el logo de Storage:", e);
    }
  }
}
