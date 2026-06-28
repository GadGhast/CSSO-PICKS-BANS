# CS VETO — Herramienta de Pick/Ban de mapas (CS:GO / CS2)

Sitio web estático (HTML + CSS + JS, sin frameworks ni build tools) para hacer
el veto de mapas de un enfrentamiento de esports, con gestión de mapas y
equipos (nombre + imagen) en **Firebase Firestore**. Las imágenes se alojan
gratis en **GitHub + jsDelivr** — no se usa Firebase Storage, así que no
necesitas activar el plan de facturación de Firebase ni poner una tarjeta.

## 1. Estructura del proyecto

```
csgo-veto/
├── index.html          → Pantalla pública de veto (setup → veto → resultado)
├── admin.html           → Panel de administración de mapas y equipos (CRUD)
├── css/
│   └── style.css         → Estilos compartidos (tema táctico/consola)
├── js/
│   ├── firebase-config.js → Credenciales de tu proyecto Firebase (EDITAR)
│   ├── maps-service.js    → Acceso a Firestore (CRUD de mapas)
│   ├── teams-service.js    → Acceso a Firestore (CRUD de equipos)
│   ├── admin.js              → Lógica del panel admin (mapas y equipos)
│   └── veto.js                 → Lógica del veto (secuencia, terminal, resultado)
└── README.md
```

## 2. Alojar imágenes (GitHub + jsDelivr) — gratis, sin tarjeta

En vez de Firebase Storage, las imágenes de mapas y logos se alojan en tu
repo de GitHub y se sirven a través del CDN gratuito de jsDelivr:
**https://github.com/GadGhast/CSSO-PICKS-BANS**

Pasos para subir una imagen:

1. Entra a ese repo en GitHub.
2. Click en **"Add file" → "Upload files"** y sube la imagen. Puedes
   organizar en carpetas, por ejemplo `mapas/mirage.jpg` o
   `logos/team-spirit.png`.
3. Una vez subida, ábrela en GitHub y copia la URL de la barra del
   navegador (la que contiene `/blob/`), por ejemplo:
   ```
   https://github.com/GadGhast/CSSO-PICKS-BANS/blob/main/mapas/mirage.jpg
   ```
4. Pega **esa misma URL de GitHub** en el campo de imagen del panel de
   admin (al agregar un mapa o un equipo). El sitio la convierte sola al
   formato de jsDelivr al salir del campo:
   ```
   https://cdn.jsdelivr.net/gh/GadGhast/CSSO-PICKS-BANS@main/mapas/mirage.jpg
   ```

No tienes que hacer la conversión a mano — el campo de URL en `admin.html`
detecta automáticamente links de `github.com/.../blob/...` y los reescribe
al cargar el formulario (función `githubBlobToJsdelivr()` en `js/admin.js`).
Si ya tienes una URL de otro lado (imgur, jsDelivr, etc.), simplemente se
deja igual.

> Nota: jsDelivr cachea los archivos del repo. Si reemplazas una imagen con
> el mismo nombre, puede tardar unos minutos en reflejar el cambio. Si
> necesitas que se actualice al instante, sube la imagen con un nombre
> distinto.

## 3. Crear el proyecto en Firebase (solo Firestore, sin Storage)

1. Ve a https://console.firebase.google.com → **Crear proyecto**.
2. Dentro del proyecto, ve a **Compilación → Firestore Database → Crear base
   de datos**. Elige modo "producción" y la región más cercana.
3. Ve a **Configuración del proyecto (⚙) → General → Tus apps → Web (`</>`)**.
   Registra una app web (no necesitas Hosting todavía) y copia el objeto
   `firebaseConfig` que te muestra.
4. Pega ese objeto en `js/firebase-config.js`, reemplazando los valores
   `"TU_API_KEY"`, `"TU_PROYECTO"`, etc.

No necesitas activar Storage ni el plan Blaze para nada de esto — Firestore
en su nivel gratuito ("Spark", el plan por defecto) es más que suficiente
para este proyecto.

## 4. Reglas de seguridad de Firestore (importante)

Por defecto, Firestore en "modo producción" **bloquea toda escritura**.
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

## 5. Estructura de datos en Firestore

Colección `maps`, un documento por mapa:

| Campo       | Tipo      | Descripción                                                      |
|-------------|-----------|-------------------------------------------------------------------|
| `name`      | string    | Nombre visible, ej. `"Mirage"`                                    |
| `code`      | string    | Generado automáticamente a partir del nombre (slug), ej. `"mirage"`. No se pide en el formulario. |
| `imageUrl`  | string    | URL pública de la imagen (link de jsDelivr, ver sección 2)        |
| `active`    | boolean   | Si aparece o no en el veto                                        |
| `order`     | number    | Orden de aparición en el grid                                     |
| `createdAt` | timestamp | Generado automáticamente                                          |

Colección `teams`, un documento por equipo:

| Campo       | Tipo      | Descripción                                              |
|-------------|-----------|------------------------------------------------------------|
| `name`      | string    | Nombre visible, ej. `"Team Spirit"`                       |
| `logoUrl`   | string    | URL pública del logo (jsDelivr), o `null` si no tiene      |
| `order`     | number    | Orden de aparición en el selector                          |
| `createdAt` | timestamp | Generado automáticamente                                    |

No necesitas crear nada manualmente: el panel de admin crea los documentos
automáticamente al agregar el primer mapa o equipo.

## 6. Probar en local

Como los archivos usan `type="module"`, **no puedes** abrirlos con doble
clic (`file://`) porque los navegadores bloquean los módulos ES por CORS.
Necesitas un servidor local simple:

```bash
cd csgo-veto
python3 -m http.server 8080
# o si tienes Node:
npx serve .
```
Luego abre `http://localhost:8080/admin.html` para agregar mapas y equipos,
y `http://localhost:8080/index.html` para hacer el veto.

## 7. Desplegar a Firebase Hosting (opcional, recomendado)

```bash
npm install -g firebase-tools
firebase login
cd csgo-veto
firebase init hosting
# Cuando pregunte "public directory", responde: .  (el directorio actual)
# "Configure as single-page app": No
firebase deploy
```
Esto te da una URL pública tipo `https://tu-proyecto.web.app`. Firebase
Hosting también tiene un nivel gratuito amplio, así que esto tampoco
requiere tarjeta.

## 8. Cómo funciona el veto

- En la pantalla de inicio eliges el **Equipo A** y el **Equipo B** desde un
  cajón desplegable (con logo, si tiene). El **Equipo A siempre empieza
  vetando** (es el "local").
- **Bo1**: solo bans alternados hasta que queda 1 mapa → ese es el decider.
- **Bo3**: ban, ban, pick, pick, ban, ban → el último que sobra es el decider.
- **Bo5**: ban, ban, pick, pick, pick, pick → el último que sobra es el decider.
- El **decider** se resuelve automáticamente cuando solo queda 1 mapa.
- La secuencia se recalcula según cuántos mapas activos tengas en Firestore
  en ese momento (si tienes más o menos de 7 mapas, sigue funcionando).
- El panel derecho ("terminal") muestra el log completo del veto en tiempo
  real, como una consola de CS.
- Al terminar, la pantalla de resultado muestra los mapas elegidos y el
  decider como tarjetas horizontales (1 columna en Bo1, 3 en Bo3, 5 en Bo5),
  con marco verde en los picks (+ logo del equipo que lo eligió) y marco
  amarillo en el decider.

## 9. El botón ✕ de eliminar no borra nada

Si haces click en la ✕ de un mapa o equipo y no pasa nada, casi siempre es
por las reglas de Firestore: revisa la sección 4 y aplícalas en
**Firestore → Reglas** de la consola de Firebase. El botón ya muestra un
aviso en pantalla (arriba a la derecha) con el motivo exacto si Firestore
rechaza la operación — no depende de `alert()` nativo, que algunos
navegadores/vistas previas bloquean en silencio.

Recuerda: el primer click en la ✕ solo arma la confirmación (se pone roja
con un "✓" durante 3 segundos); hay que hacer un segundo click para borrar
de verdad.

## 10. Personalización rápida

- Colores y tipografías: variables CSS al inicio de `css/style.css`
  (`--bg`, `--accent`, `--font-display`, etc.).
- Reglas de la secuencia de veto: función `buildSequence()` en `js/veto.js`.
- Conversor GitHub → jsDelivr: función `githubBlobToJsdelivr()` en
  `js/admin.js`, si en algún momento cambias de repo de imágenes.
