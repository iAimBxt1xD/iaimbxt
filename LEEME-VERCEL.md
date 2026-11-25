# Botón "🚀 Actualizar página" — ya viene configurado

Todo está preconfigurado para el repo `iAimBxt1xD/iaimbxt` (rama `main`) y el conector de Vercel Connect `github/iaimbxt`.

## Solo 3 pasos

1. **Sube TODO el contenido de este zip a la raíz del repo** (GitHub → Add file → Upload files → arrastra los archivos, no la carpeta → Commit changes).
2. **GitHub App `iaimbxt`** → Permissions & events → Repository permissions → **Contents: Read and write** (y acepta el cambio en la instalación). Debe estar instalada sobre el repo `iaimbxt`.
3. **Vercel → proyecto iaimbxt → Settings → Environment Variables** → agrega:
   - `ADMIN_PASSWORD` = tu contraseña nueva (no la escribas en ningún archivo: el repo es público).
   - (recomendado) `SESSION_SECRET` = un texto largo aleatorio.
   
   Luego **Redeploy** y entra a `iaimbxt.vercel.app/admin`.

## Opcionales
`GITHUB_REPO`, `GITHUB_BRANCH` (si tu rama no es `main`), `CONNECT_CONNECTOR` (si el conector se llama distinto) o `GITHUB_TOKEN` (token de GitHub; si existe, se usa en vez de Connect).

## Notas
- El botón ⬆ junto a cada imagen la sube a `img/`.
- En local (Live Server) el admin no publica porque no existe `/api`.
- Si algo falla, el botón muestra el motivo.

## Seguridad (ya incluida)
- La contraseña y los permisos viven solo en el servidor (variables de Vercel); en el código no hay ningún secreto.
- Solo quien entra con la contraseña puede publicar o subir imágenes; 5 intentos fallidos = bloqueo de 15 min; la sesión dura 8 h.
- Las peticiones se aceptan solo desde tu propio sitio; los datos se validan; solo se pueden subir imágenes reales (png/jpg/webp/gif) a `img/`.
- Cabeceras de seguridad (CSP, anti-iframe, nosniff, HSTS) en `vercel.json`.
- Cada publicación es un commit: si algo sale mal, revierte en GitHub (commit → Revert) o en Vercel → Deployments → Instant Rollback.

## Recomendado
- **Haz el repo privado** (GitHub → repo → Settings → Danger Zone → Change visibility). Vercel Hobby funciona con repos privados.
- Activa 2FA en GitHub y Vercel.
- Usa una contraseña larga y única en `ADMIN_PASSWORD`.
