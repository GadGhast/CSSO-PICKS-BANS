// ============================================================
// CONFIGURACIÓN DEL ADMIN
// ============================================================
// Lista de emails de Google autorizados a entrar al panel de admin.
// Esto es solo un filtro en el front-end para dar feedback rápido
// (mostrar "no tienes permiso" en vez de un error feo). La seguridad
// REAL está en las reglas de Firestore (ver README, sección 4), que
// también deben restringir por este mismo email — si solo filtras
// aquí pero no en las reglas, cualquiera con cuenta de Google podría
// escribir directamente en la base de datos sin pasar por esta UI.
// ============================================================
export const ALLOWED_ADMIN_EMAILS = ["albverrob@gmail.com"];
