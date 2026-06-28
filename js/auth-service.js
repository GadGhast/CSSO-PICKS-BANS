// ============================================================
// AUTH SERVICE
// Login con Google (Firebase Authentication) para proteger el
// panel de Admin. El veto público (index.html) y la galería
// (maps.html) NO necesitan esto: solo leen datos, y la lectura
// sigue siendo pública en las reglas de Firestore.
// ============================================================

import { auth } from "./firebase-config.js";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const googleProvider = new GoogleAuthProvider();

/**
 * Abre el popup de Google y devuelve el usuario autenticado.
 * Lanza un error con `.code` si falla o si el usuario cierra el popup.
 */
export async function loginWithGoogle() {
  return await signInWithPopup(auth, googleProvider);
}

export async function logout() {
  return await signOut(auth);
}

/**
 * Se ejecuta cada vez que cambia el estado de sesión.
 * callback(user) recibe el usuario de Firebase o `null` si no
 * hay sesión iniciada.
 */
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Traduce los códigos de error más comunes de Firebase Auth
 * (Google sign-in) a un mensaje legible en español.
 */
export function authErrorMessage(error) {
  const map = {
    "auth/popup-closed-by-user": "Cerraste la ventana de Google antes de terminar.",
    "auth/popup-blocked": "El navegador bloqueó el popup de Google. Permite popups para este sitio e intenta de nuevo.",
    "auth/cancelled-popup-request": "Se canceló el inicio de sesión (¿abriste varios popups a la vez?).",
    "auth/network-request-failed": "Error de red. Revisa tu conexión e intenta de nuevo.",
    "auth/unauthorized-domain": "Este dominio no está autorizado en Firebase (Authentication → Settings → Authorized domains)."
  };
  return map[error.code] || error.message || "Error al iniciar sesión con Google.";
}
