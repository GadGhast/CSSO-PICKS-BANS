# CS VETO — Herramienta de Pick/Ban de mapas (CS:GO / CS2)

Sitio web estático (HTML + CSS + JS, sin frameworks ni build tools) para hacer
el veto de mapas de un enfrentamiento de esports, con gestión de mapas
(nombre + imagen) en **Firebase Firestore** y **Firebase Storage**.

## 1. Estructura del proyecto

```
csgo-veto/
├── index.html          → Pantalla pública de veto (setup → veto → resultado)
├── admin.html           → Panel de administración de mapas y equipos (CRUD)
├── css/
│   └── style.css         → Estilos compartidos (tema táctico/consola)
├── js/
│   ├── firebase-config.js → Credenciales de tu proyecto Firebase (EDITAR)
│   ├── maps-service.js    → Acceso a Firestore + Storage (CRUD de mapas)
│   ├── teams-service.js    → Acceso a Firestore + Storage (CRUD de equipos)
│   ├── admin.js              → Lógica del panel admin (mapas y equipos)
│   └── veto.js                 → Lógica del veto (secuencia, terminal, resultado)
└── README.md
```

## 2. Crear el proyecto en Firebase

1. Ve a https://console.firebase.google.com → **Crear proyecto**.
2. Dentro del proyecto, ve a **Compilación → Firestore Database → Crear base
   de datos**. Elige modo "producción" y la región más cercana.
3. Ve a **Compilación → Storage → Comenzar**. Acepta la configuración por
   defecto (esto es donde se guardarán las imágenes que subas desde el panel
   de admin).
4. Ve a **Configuración del proyecto (⚙) → General → Tus apps → Web (`</>`)**.
   Registra una app web (no necesitas Hosting todavía) y copia el objeto
   `firebaseConfig` que te muestra.
5. Pega ese objeto en `js/firebase-config.js`, reemplazando los valores
   `"TU_API_KEY"`, `"TU_PROYECTO"`, etc.

## 3. Reglas de seguridad (importante)

Por defecto, Firestore y Storage en "modo producción" **bloquean todo**.
Tienes dos opciones:

### Opción rápida (solo para probar / proyecto interno)
En **Firestore → Reglas**, pega:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /maps/{mapId} {
      allow read: if true;
      allow write: if true; // ⚠️ cualquiera puede escribir, solo para pruebas
    }
    match /teams/{teamId} {
      allow read: if true;
      allow write: if true; // ⚠️ cualquiera puede escribir, solo para pruebas
    }
  }
}
```
En **Storage → Reglas**, pega:
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /maps/{fileName} {
      allow read: if true;
      allow write: if true; // ⚠️ solo para pruebas
    }
    match /teams/{fileName} {
      allow read: if true;
      allow write: if true; // ⚠️ solo para pruebas
    }
  }
}
```

### Opción recomendada (con autenticación para el admin)
Si vas a publicar esto, protege la escritura para que solo tú (o tu equipo)
pueda agregar/borrar mapas y equipos:
1. Activa **Authentication → Email/contraseña** (o Google) en Firebase.
2. Crea tu usuario admin desde la consola de Firebase.
3. En `admin.html`/`admin.js` agrega un login con
   `signInWithEmailAndPassword` (te lo puedo generar si lo necesitas).
4. Cambia las reglas a:
```
match /maps/{mapId} {
  allow read: if true;
  allow write: if request.auth != null;
}
match /teams/{teamId} {
  allow read: if true;
  allow write: if request.auth != null;
}
```
y lo mismo en Storage (`allow write: if request.auth != null;`).

## 4. Estructura de datos en Firestore

Colección `maps`, un documento por mapa:

| Campo        | Tipo    | Descripción                                  |
|--------------|---------|-----------------------------------------------|
| `name`       | string  | Nombre visible, ej. `"Mirage"`                |
| `code`       | string  | Código de consola, ej. `"de_mirage"`          |
| `imageUrl`   | string  | URL pública de la imagen                      |
| `storagePath`| string  | Ruta en Storage (si se subió archivo), o null |
| `active`     | boolean | Si aparece o no en el veto                    |
| `order`      | number  | Orden de aparición en el grid                 |
| `createdAt`  | timestamp | Generado automáticamente                    |

No necesitas crear nada manualmente: el panel de admin crea los documentos
automáticamente al agregar el primer mapa.

Colección `teams`, un documento por equipo:

| Campo        | Tipo    | Descripción                                  |
|--------------|---------|-----------------------------------------------|
| `name`       | string  | Nombre visible, ej. `"Team Spirit"`           |
| `logoUrl`    | string  | URL pública del logo, o `null` si no tiene    |
| `storagePath`| string  | Ruta en Storage (si se subió archivo), o null |
| `order`      | number  | Orden de aparición en el selector             |
| `createdAt`  | timestamp | Generado automáticamente                    |

Igual que con los mapas, se crea automáticamente desde el panel de admin —
sección "Gestión de equipos", debajo de la de mapas.

## 5. Probar en local

Como los archivos usan `type="module"`, **no puedes** abrirlos con doble
clic (`file://`) porque los navegadores bloquean los módulos ES por CORS.
Necesitas un servidor local simple:

```bash
cd csgo-veto
python3 -m http.server 8080
# o si tienes Node:
npx serve .
```
Luego abre `http://localhost:8080/admin.html` para agregar mapas, y
`http://localhost:8080/index.html` para hacer el veto.

## 6. Desplegar a Firebase Hosting (opcional, recomendado)

```bash
npm install -g firebase-tools
firebase login
cd csgo-veto
firebase init hosting
# Cuando pregunte "public directory", responde: .  (el directorio actual)
# "Configure as single-page app": No
firebase deploy
```
Esto te da una URL pública tipo `https://tu-proyecto.web.app`.

## 7. Cómo funciona el veto

- En la pantalla de inicio eliges el **Equipo A** y el **Equipo B** haciendo
  click en sus tarjetas (con logo, si tiene). Si un equipo ya está elegido en
  un lado, aparece atenuado y no se puede elegir en el otro lado.
- **Bo1**: solo bans alternados hasta que queda 1 mapa → ese es el decider.
- **Bo3**: ban, ban, pick, pick, ban, ban → el último que sobra es el decider.
- **Bo5**: ban, ban, pick, pick, pick, pick → el último que sobra es el decider.
- El **decider** se resuelve automáticamente cuando solo queda 1 mapa.
- La secuencia se recalcula según cuántos mapas activos tengas en Firestore
  en ese momento (si tienes más o menos de 7 mapas, sigue funcionando).
- El panel derecho ("terminal") muestra el log completo de la veto en tiempo
  real, como una consola de CS.

## 8. El botón ✕ de eliminar no borra nada

Si haces click en la ✕ de un mapa y no pasa nada (o solo funciona borrando
manualmente desde la consola de Firestore), casi siempre es uno de estos
dos motivos:

1. **Reglas de Firestore bloqueando el borrado.** Por defecto, Firestore en
   modo producción bloquea toda escritura (incluido `delete`). Revisa la
   sección 3 de este README y aplica las reglas ahí indicadas en
   **Firestore → Reglas** de la consola de Firebase. Ahora el botón muestra
   un aviso en pantalla (arriba a la derecha) con el motivo exacto si esto
   pasa — ya no depende de `alert()`.
2. **Diálogos nativos bloqueados.** Si estás probando el sitio dentro de un
   iframe, vista previa embebida o algunos navegadores con restricciones,
   `confirm()`/`alert()` del navegador pueden no dispararse nunca. Por eso
   el botón ya no usa `confirm()`: ahora el primer click lo pone en modo
   "✓ confirmar" (se pone rojo) durante 3 segundos, y un segundo click sobre
   ese mismo botón borra el mapa de verdad. Si no confirmas, vuelve solo al
   estado normal.

Si tras esto sigue sin funcionar, abre la consola del navegador (F12) y
revisa el error exacto que se imprime ahí — el código ya loguea cualquier
fallo con `console.error`.

## 9. Personalización rápida

- Colores y tipografías: variables CSS al inicio de `css/style.css`
  (`--bg`, `--accent`, `--font-display`, etc.).
- Reglas de la secuencia de veto: función `buildSequence()` en `js/veto.js`.
