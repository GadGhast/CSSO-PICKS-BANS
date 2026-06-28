# CS VETO — Herramienta de Pick/Ban de mapas (CS:GO / CS2)

Sitio web estático (HTML + CSS + JS, sin frameworks ni build tools) para hacer
el veto de mapas de un enfrentamiento de esports, con gestión de mapas y
equipos (nombre + imagen) en **Firebase Firestore**. Las imágenes se alojan
gratis en **GitHub + jsDelivr** — no se usa Firebase Storage, así que no
necesitas activar el plan de facturación de Firebase ni poner una tarjeta.
El panel de Admin está protegido con **login** (Firebase Authentication):
el veto público y la galería de mapas siguen siendo de acceso libre, pero
solo tú puedes agregar o eliminar mapas/equipos.

## 1. Estructura del proyecto

```
csgo-veto/
├── index.html          → Pantalla pública de veto (setup → veto → resultado)
├── maps.html             → Galería pública de mapas (solo lectura)
├── admin.html             → Panel de administración — pide login
├── css/
│   └── style.css         → Estilos compartidos (tema táctico/consola)
├── js/
│   ├── firebase-config.js → Credenciales de tu proyecto Firebase (EDITAR)
│   ├── auth-service.js     → Login con Google / logout (Firebase Auth)
│   ├── admin-config.js      → Lista de emails autorizados a administrar
│   ├── maps-service.js      → Acceso a Firestore (CRUD de mapas)
│   ├── teams-service.js      → Acceso a Firestore (CRUD de equipos)
│   ├── admin.js                → Lógica del panel admin (login, mapas, equipos)
│   ├── maps-page.js              → Lógica de la galería pública de mapas
│   └── veto.js                     → Lógica del veto (sorteo, secuencia, terminal, resultado)
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
al salir del campo (función `githubBlobToJsdelivr()` en `js/admin.js`).
Si ya tienes una URL de otro lado (imgur, jsDelivr, etc.), simplemente se
deja igual.

> Nota: jsDelivr cachea los archivos del repo. Si reemplazas una imagen con
> el mismo nombre, puede tardar unos minutos en reflejar el cambio. Si
> necesitas que se actualice al instante, sube la imagen con un nombre
> distinto.

## 3. Crear el proyecto en Firebase (Firestore + Authentication, sin Storage)

1. Ve a https://console.firebase.google.com → **Crear proyecto**.
2. Dentro del proyecto, ve a **Compilación → Firestore Database → Crear base
   de datos**. Elige modo "producción" y la región más cercana.
3. Ve a **Configuración del proyecto (⚙) → General → Tus apps → Web (`</>`)**.
   Registra una app web (no necesitas Hosting todavía) y copia el objeto
   `firebaseConfig` que te muestra.
4. Pega ese objeto en `js/firebase-config.js`, reemplazando los valores
   `"TU_API_KEY"`, `"TU_PROYECTO"`, etc.

No necesitas activar Storage ni el plan Blaze para nada de esto — Firestore
y Authentication en su nivel gratuito ("Spark", el plan por defecto) son más
que suficientes para este proyecto.

## 4. Proteger el panel de Admin con Google Sign-In (solo tu cuenta)

Esto tiene **dos partes**: activar el login con Google en Firebase, y
restringir las reglas de Firestore a tu email específico. Con Google,
**cualquiera con una cuenta de Google podría iniciar sesión** si no
restringes por email — por eso el paso 4.2 (reglas de Firestore) es
obligatorio, no opcional. La seguridad real vive ahí, no en que el botón
de login esté oculto.

Tu email ya está configurado como el único autorizado:
**`albverrob@gmail.com`** (en `js/admin-config.js`).

### 4.1. Activa Google como proveedor de login
1. En la consola de Firebase, ve a **Compilación → Authentication → Comenzar**.
2. En la pestaña **"Sign-in method"**, activa el proveedor **"Google"**
   (elige un email de soporte del proyecto si te lo pide, puede ser el
   mismo `albverrob@gmail.com`).
3. No necesitas crear ningún usuario manualmente — Google se encarga de la
   identidad. Lo único que controla quién puede *editar* es la lista de
   `js/admin-config.js` + las reglas de Firestore del paso 4.2.

### 4.2. Restringe las reglas de Firestore a tu email
En **Firestore Database → Reglas**, pega esto y publica:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /maps/{mapId} {
      allow read: if true; // el veto y la galería son públicos
      allow write: if request.auth != null
                    && request.auth.token.email == "albverrob@gmail.com";
    }
    match /teams/{teamId} {
      allow read: if true;
      allow write: if request.auth != null
                    && request.auth.token.email == "albverrob@gmail.com";
    }
  }
}
```
Con esto: `index.html` y `maps.html` siguen funcionando para cualquiera sin
login (solo leen), pero agregar/eliminar mapas o equipos en Firestore solo
funciona si el usuario autenticado es exactamente `albverrob@gmail.com` —
ni siquiera escribiendo directo desde la consola del navegador se puede
saltar esto.

> Si en el futuro quieres dar acceso a más personas, agrega sus emails
> tanto en `ALLOWED_ADMIN_EMAILS` (`js/admin-config.js`) como en la regla
> de Firestore, por ejemplo:
> `request.auth.token.email in ["albverrob@gmail.com", "otro@gmail.com"]`

### 4.3. Dominios autorizados (solo si usas un dominio propio)
Firebase ya autoriza automáticamente `localhost` y tu dominio
`*.web.app` / `*.firebaseapp.com` para el popup de Google. Si despliegas el
sitio en un dominio propio (ej. `csveto.tuequipo.com`), agrégalo en
**Authentication → Settings → Authorized domains**, o el popup de Google
fallará con `auth/unauthorized-domain`.

### Cómo funciona en el sitio
- Al abrir `admin.html` sin sesión iniciada, ves un botón **"Iniciar sesión
  con Google"** (no el formulario de mapas/equipos).
- Si inicias sesión con una cuenta de Google que **no** sea
  `albverrob@gmail.com`, el sitio te cierra la sesión automáticamente y
  muestra "esta cuenta no tiene permiso" — aunque eso es solo cortesía de
  la interfaz, ya que las reglas de Firestore bloquean la escritura de
  todas formas.
- Aparece un botón **"Cerrar sesión"** arriba a la derecha mientras estás
  logueado.
- La sesión persiste entre visitas (Firebase la recuerda en el navegador)
  hasta que le das "Cerrar sesión" explícitamente.

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
Luego abre `http://localhost:8080/admin.html` para iniciar sesión y agregar
mapas/equipos, y `http://localhost:8080/index.html` para hacer el veto.

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

- La pestaña **Mapas** (`maps.html`) es una galería pública de solo lectura
  con todos los mapas registrados (sin importar cuántos sean, ej. 47).
- Al darle "Iniciar veto", la web **sortea automáticamente 10 mapas al
  azar** (constante `VETO_POOL_SIZE` en `js/veto.js`) de entre todos los
  activos, y solo esos 10 se usan en esa partida. Si tienes menos de 10
  mapas activos, se usan todos los que haya.
- En la pantalla de inicio eliges el **Equipo A** y el **Equipo B** desde un
  cajón desplegable (con logo, si tiene). El **Equipo A siempre empieza
  vetando** (es el "local").
- **Bo1**: solo bans alternados hasta que queda 1 mapa → ese es el decider.
- **Bo3**: ban, ban, pick, pick, ban, ban → el último que sobra es el decider.
- **Bo5**: ban, ban, pick, pick, pick, pick → el último que sobra es el decider.
- El **decider** se resuelve automáticamente cuando solo queda 1 mapa.
- La secuencia se recalcula según cuántos mapas haya en el pool sorteado
  (10, o menos si no hay suficientes registrados).
- El panel derecho ("terminal") muestra el log completo del veto en tiempo
  real, como una consola de CS, incluyendo qué mapas salieron sorteados.
- Al terminar, la pantalla de resultado muestra los mapas elegidos y el
  decider como tarjetas horizontales (1 columna en Bo1, 3 en Bo3, 5 en Bo5),
  con marco verde en los picks (+ logo del equipo que lo eligió) y marco
  amarillo en el decider.

## 9. Problemas comunes

**El botón ✕ de eliminar no borra nada / "Error al guardar: Missing or
insufficient permissions"**
Casi siempre son las reglas de Firestore (sección 4.2): revísalas en
**Firestore → Reglas** de la consola de Firebase, y confirma que el email
ahí escrito sea exactamente `albverrob@gmail.com` (sin espacios, mismo
mayúsculas/minúsculas que usa tu cuenta de Google).

**El popup de Google no abre, o da error `auth/unauthorized-domain`**
Activa el proveedor "Google" en **Authentication → Sign-in method**, y si
usas un dominio propio (no `*.web.app`), agrégalo en **Authentication →
Settings → Authorized domains** (sección 4.3).

**Inicié sesión con Google pero dice "esta cuenta no tiene permiso"**
Solo `albverrob@gmail.com` puede administrar. Si necesitas agregar otra
cuenta, edita `ALLOWED_ADMIN_EMAILS` en `js/admin-config.js` **y** la regla
de Firestore (sección 4.2) — los dos lugares, no solo uno.

Recuerda también: el primer click en la ✕ de borrar solo arma la
confirmación (se pone roja con un "✓" durante 3 segundos); hay que hacer un
segundo click para borrar de verdad.

## 10. Personalización rápida

- Colores y tipografías: variables CSS al inicio de `css/style.css`
  (`--bg`, `--accent`, `--font-display`, etc.).
- Reglas de la secuencia de veto: función `buildSequence()` en `js/veto.js`.
- Tamaño del pool aleatorio de mapas: constante `VETO_POOL_SIZE` en
  `js/veto.js` (por defecto, 10).
- Conversor GitHub → jsDelivr: función `githubBlobToJsdelivr()` en
  `js/admin.js`, si en algún momento cambias de repo de imágenes.
- Login/logout: `js/auth-service.js`.
- Emails autorizados a administrar: `ALLOWED_ADMIN_EMAILS` en
  `js/admin-config.js` (recuerda actualizar también la regla de Firestore,
  sección 4.2, si cambias esta lista).
