#!/bin/sh
# Publica Calmo en GitHub (repo sergiohinojosa-mm/calmo):
#   publicar/  la app que sirve GitHub Pages (sin datos de la familia)
#   web/ backend/ docs/ diseno/ herramientas/  respaldo completo del proyecto
# Uso: sh herramientas/publicar.sh "Mensaje del commit"
set -eu

BASE="$(cd "$(dirname "$0")/.." && pwd)"
REPO="$BASE/repo"
DEST="$REPO/publicar"
MSG="${1:-Actualiza Calmo}"

[ -d "$REPO/.git" ] || { echo "Falta la copia del repositorio en $REPO"; exit 1; }

# 0. Las pruebas de regresión deben pasar antes de publicar.
if ! sh "$BASE/herramientas/pruebas/correr.sh" >/dev/null 2>&1; then
  echo "Alto: fallaron las pruebas (sh herramientas/pruebas/correr.sh). No se publicó nada."
  exit 1
fi

git -C "$REPO" pull -q --ff-only

# 1. La app publicada.
rsync -a --delete \
  --exclude '.DS_Store' --exclude 'artifact.html' --exclude 'backend/' \
  "$BASE/web/" "$DEST/"
mkdir -p "$DEST/backend"
rsync -a --delete --exclude '.DS_Store' "$BASE/backend/" "$DEST/backend/"

# La app publicada nunca debe llevar nombres de la familia: los datos viven en cada teléfono.
if grep -rIl -i -E "hinojosa|sergio|marcela|luciana|mariel|julia|pamela" "$DEST" >/dev/null; then
  echo "Alto: hay nombres de la familia en la app publicada:"
  grep -rIl -i -E "hinojosa|sergio|marcela|luciana|mariel|julia|pamela" "$DEST"
  exit 1
fi

# 2. Respaldo completo del proyecto.
for d in web backend docs diseno herramientas; do
  [ -d "$BASE/$d" ] && rsync -a --delete --exclude '.DS_Store' "$BASE/$d/" "$REPO/$d/"
done

# Nunca subir llaves ni tokens.
# El patrón va partido en dos para que este mismo script, que también se respalda, no se detecte a sí mismo.
if grep -rIl -E "BEGIN (RSA|OPENSSH|EC) PRIVATE KEY|ghp_[A-Za-z0-9]{20,}|github_""pat_[A-Za-z0-9_]{20,}" "$REPO" --exclude-dir=.git >/dev/null; then
  echo "Alto: parece haber una llave o token en el repositorio. No se publicó nada."
  exit 1
fi

git -C "$REPO" add -A
if git -C "$REPO" diff --cached --quiet; then
  echo "Sin cambios que publicar."
  exit 0
fi
git -C "$REPO" commit -q -m "$MSG"
git -C "$REPO" push -q origin HEAD:main
echo "Publicado: https://sergiohinojosa-mm.github.io/calmo/publicar/ (tarda 1 o 2 minutos en verse)"
