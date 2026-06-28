// ============================================================
// MAPS SERVICE
// Capa única de acceso a la colección "maps" de Firestore.
// Las imágenes ya NO se suben a Firebase Storage: se guarda
// directamente la URL pública (GitHub + jsDelivr, ver README).
// Lo usan tanto admin.html como index.html.
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

const mapsCol = collection(db, "maps");

/**
 * Escucha en tiempo real la colección de mapas, ordenada por "order".
 * callback(mapsArray) se ejecuta cada vez que hay cambios.
 * Devuelve una función para cancelar la suscripción.
 */
export function subscribeToMaps(callback, onError) {
  const q = query(mapsCol, orderBy("order", "asc"));
  return onSnapshot(
    q,
    (snapshot) => {
      const maps = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(maps);
    },
    (error) => {
      console.error("Error en subscribeToMaps:", error);
      if (onError) onError(error);
    }
  );
}

/**
 * Crea un mapa nuevo en Firestore.
 * data = { name, code, imageUrl, active, order }
 */
export async function addMap(data) {
  return await addDoc(mapsCol, {
    name: data.name,
    code: data.code,
    imageUrl: data.imageUrl,
    active: data.active !== undefined ? data.active : true,
    order: data.order ?? Date.now(),
    createdAt: serverTimestamp()
  });
}

/**
 * Elimina un mapa de Firestore (solo borra el documento; la imagen
 * vive en GitHub, no en Firebase, así que no hay nada más que borrar).
 */
export async function deleteMap(mapId) {
  await deleteDoc(doc(db, "maps", mapId));
}
