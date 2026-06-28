// ============================================================
// CONFIGURACIÓN DE FIREBASE
// ============================================================
// 1. Ve a https://console.firebase.google.com
// 2. Crea un proyecto (o usa uno existente)
// 3. Ve a "Configuración del proyecto" > "General" > "Tus apps" > Web (</>)
// 4. Copia el objeto firebaseConfig que te da Firebase y pégalo abajo
// 5. Activa Firestore Database (modo producción) en la consola de Firebase
// 6. Activa Authentication > Email/contraseña y crea tu usuario admin
//    (ver README, sección "Proteger el panel de Admin")
//
// Nota: ya NO se usa Firebase Storage. Las imágenes de mapas y logos
// se alojan gratis en GitHub y se sirven vía jsDelivr (ver README,
// sección "Alojar imágenes"). Esto evita tener que activar el plan
// de facturación "Blaze" de Firebase solo para subir archivos.
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDzTjm_CV6Y_SjbD3aVu9svJion5ZMDDkE",
  authDomain: "gadghast-test.firebaseapp.com",
  projectId: "gadghast-test",
  storageBucket: "gadghast-test.firebasestorage.app",
  messagingSenderId: "581856217022",
  appId: "1:581856217022:web:425afea90ff04be4b6dbef"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
