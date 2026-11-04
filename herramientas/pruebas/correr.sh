#!/bin/sh
# Suite de regresión de Calmo con JavaScriptCore (sin Node ni npm).
# Uso:  sh herramientas/pruebas/correr.sh            corre todo
#       sh herramientas/pruebas/correr.sh sincro     solo los archivos cuyo nombre contiene «sincro»
# Termina con 0 si todo pasa (las fallas conocidas no rompen), 1 si algo falla, 2 si no pudo correr.

DIR=$(cd "$(dirname "$0")" && pwd)
JSC=${JSC:-/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc}
# Huso fijo (sin horario de verano) para que las fechas sean deterministas.
export TZ=${TZ_PRUEBAS:-America/Mexico_City}
FILTRO=${1:-}

if [ ! -x "$JSC" ]; then
  echo "No encuentro jsc en $JSC. Define JSC=/ruta/a/jsc y vuelve a correr."
  exit 2
fi

cd "$DIR" || exit 2
total=0; pasan=0; fallan=0; conocidas=0; arregladas=0; archivos=0; rotos=""

valor() { printf '%s\n' "$resumen" | sed -n "s/.* $1=\([0-9]*\).*/\1/p"; }

for f in *.prueba.js; do
  case "$f" in *"$FILTRO"*) ;; *) continue ;; esac
  archivos=$((archivos + 1))
  echo ""
  echo "== $f"
  salida=$("$JSC" -m "$f" 2>&1)
  codigo=$?
  # Muestra todo menos la línea de resumen y el aviso con el que fin() hace terminar a jsc con error.
  printf '%s\n' "$salida" | awk '/^#RESUMEN/ {next} /prueba\(s\) fallaron en/ {skip=1; next} skip && /@/ {next} {skip=0; print}'
  resumen=$(printf '%s\n' "$salida" | grep '^#RESUMEN' | tail -n 1)
  if [ -z "$resumen" ]; then
    rotos="$rotos $f"
    continue
  fi
  total=$((total + $(valor pruebas)))
  pasan=$((pasan + $(valor pasan)))
  fallan=$((fallan + $(valor fallan)))
  conocidas=$((conocidas + $(valor conocidas)))
  arregladas=$((arregladas + $(valor arregladas)))
  if [ "$codigo" -ne 0 ] && [ "$(valor fallan)" -eq 0 ]; then rotos="$rotos $f"; fi
done

echo ""
echo "=================================================="
if [ "$archivos" -eq 0 ]; then
  echo "Ningún archivo *.prueba.js coincide con «$FILTRO»."
  exit 2
fi
echo "Total: $total pruebas en $archivos archivos"
echo "  pasan:            $((pasan + arregladas))"
echo "  fallan:           $fallan"
echo "  fallas conocidas: $conocidas (errores de la app ya reportados; ver LEEME.md)"
if [ "$arregladas" -gt 0 ]; then
  echo "  ¡$arregladas falla(s) conocida(s) ya pasan! Quítales la marca en su archivo."
fi
if [ -n "$rotos" ]; then
  echo "  no terminaron:   $rotos"
fi
if [ "$fallan" -gt 0 ] || [ -n "$rotos" ]; then
  echo "RESULTADO: FALLA"
  exit 1
fi
echo "RESULTADO: OK"
exit 0
