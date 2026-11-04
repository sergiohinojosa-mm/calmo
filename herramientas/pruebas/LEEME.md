# Pruebas de regresión de Calmo

Pruebas automáticas de la lógica de la app (sin pantallas). Usan **JavaScriptCore**, que ya viene en la Mac, e importan los módulos reales de `web/js/`: no hace falta Node ni npm.

## Cómo correrlas

Desde la carpeta del proyecto:

```sh
sh herramientas/pruebas/correr.sh          # todo
sh herramientas/pruebas/correr.sh sincro   # solo los archivos que contienen «sincro»
```

Termina con código 0 si todo pasa, 1 si algo falla y 2 si no pudo correr. Las **fallas conocidas** se muestran, pero no hacen fallar la suite. Si una ya pasa, sale «ARREGLADA»: quítale la marca (`conocida` → `prueba`).

## Qué hay

| Archivo | Qué revisa |
|---|---|
| `store.prueba.js` | Familia y perfiles, rutina ±3 h, BOLT a cualquier hora, agenda, racha, últimos 7 días |
| `insignias.prueba.js` | 25 por perfil, las de Peque con ejercicios de Peque, umbral exacto, +10 hojas una vez |
| `premios.prueba.js` | Saldo, pedir, «Ahora no», insignia «premio», el nivel no baja |
| `sincronizacion.prueba.js` | `mergeRemote`, `cleanState`, `snapshot`, `importJSON` |
| `catalogo.prueba.js` | Todo por la nariz, palabras prohibidas, textos para niñas, duraciones |
| `utilidades.prueba.js` | `esc`, `dayKey`, `addDays`, `dow`, `plural` |
| `lib/entorno.js` | Imitación mínima del navegador: `localStorage`, `window`, `document`, `navigator`, temporizadores y un reloj fijo |
| `lib/prueba.js` | Mini marco: `prueba`, `conocida`, `igual`, `parecido`, `verdad`… |
| `lib/ayudas.js` | Escenarios: `nuevaFamilia`, `sesion`, `como`, `datos` |

Todo es determinista: el reloj empieza el lunes 1 de junio de 2026 a las 8:00 y solo avanza cuando la prueba lo pide (`reloj.fijar`, `reloj.avanzarMin`). `Math.random` tiene semilla y el huso es `America/Mexico_City`.

## Agregar una prueba

Cada archivo empieza importando `./lib/entorno.js` **antes** que cualquier módulo de la app y termina con `await fin('nombre.prueba.js')`. Prueba comportamientos (lo que ve la familia), no líneas de código.

## Fallas conocidas (errores de la app, sin corregir)

1. `updateProfile` deja volver niña al único adulto: la familia queda sin adulto ni administrador. Solo lo impide la pantalla de perfiles.
2. `removeProfile` puede quitar al único administrador si queda otro adulto que no lo es.
3. `cleanState` acepta el id `__proto__`. Un respaldo así contamina `Object.prototype` al practicar y los demás dejan de recibir insignias.
4. Catálogo: «Respiración coherente» (`steps`, `kidSteps`) y «Respira suavecito» (`kidSteps`) dicen «cierra la boca».
5. Catálogo: los textos de adulto de «Respira ligero en reposo» no mencionan la nariz.
