// ============================================================
// MAPS SERVICE
// Capa única de acceso a la colección "maps" de Firestore
// y al bucket "maps/" de Storage. Lo usan tanto admin.html
// como index.html.
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
 * Sube un archivo de imagen a Storage y devuelve la URL pública.
 */
export async function uploadMapImage(file, mapCode) {
  const safeName = `${mapCode || "map"}-${Date.now()}-${file.name}`;
  const storageRef = ref(storage, `maps/${safeName}`);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}

/**
 * Crea un mapa nuevo en Firestore.
 * data = { name, code, imageUrl, active, order, storagePath }
 */
export async function addMap(data) {
  return await addDoc(mapsCol, {
    name: data.name,
    code: data.code,
    imageUrl: data.imageUrl,
    storagePath: data.storagePath || null,
    active: data.active !== undefined ? data.active : true,
    order: data.order ?? Date.now(),
    createdAt: serverTimestamp()
  });
}

/**
 * Elimina un mapa de Firestore. Si tiene imagen en Storage
 * (storagePath), también la borra.
 */
export async function deleteMap(mapId, storagePath) {
  await deleteDoc(doc(db, "maps", mapId));
  if (storagePath) {
    try {
      await deleteObject(ref(storage, storagePath));
    } catch (e) {
      console.warn("No se pudo borrar la imagen de Storage:", e);
    }
  }
}
