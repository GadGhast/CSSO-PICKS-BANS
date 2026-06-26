// ============================================================
// CONFIGURACIÓN DE FIREBASE
// ============================================================
// 1. Ve a https://console.firebase.google.com
// 2. Crea un proyecto (o usa uno existente)
// 3. Ve a "Configuración del proyecto" > "General" > "Tus apps" > Web (</>)
// 4. Copia el objeto firebaseConfig que te da Firebase y pégalo abajo
// 5. Activa Firestore Database (modo producción) en la consola de Firebase
// 6. Activa Storage (para las imágenes de los mapas)
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

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
export const storage = getStorage(app);
