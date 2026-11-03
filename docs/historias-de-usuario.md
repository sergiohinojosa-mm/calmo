# Calmo: historias de usuario (v1)

**Calmo**: app de ejercicios de respiración para uso personal y familiar. Lema: "Respira por la nariz, vive calmo".

---

## 1. Decisiones tomadas

| Tema | Decisión |
|---|---|
| Plataforma | **Fase 1: app web (PWA)** para probar ya en los iPhones, en la carpeta `web/`. **Fase 2:** app nativa iOS (SwiftUI) con cuenta Apple Developer de US$99 al año, si la web funciona bien |
| Distribución | Web: **publicada como página privada de claude.ai** (HTTPS, datos respaldados y sincronizados entre los dispositivos de Sergio). Para que Marcela y Pamela la usen sin cuenta de claude.ai, el siguiente paso es publicarla en GitHub Pages con la sincronización a Drive. En casa también se puede servir con `web/serve.py`. Nativa: **TestFlight** a los iPhones de la familia y de Pamela, con una versión nueva cada 90 días |
| Datos | **En el Google Drive de la cuenta de MultiMoney de Sergio** (sergio.hinojosa@multimoney.com), ya conectada. Al arrancar se verifica que la empresa permita Apps Script; si no, se usa su Gmail personal. una hoja de cálculo "Calmo · datos" con una pestaña por colección (sección 7). Un script de Google Apps Script, publicado desde la cuenta de Sergio, sirve de puente entre la app y la hoja, protegido con una clave privada de la familia. Cada teléfono guarda una copia local, funciona sin conexión y sincroniza al volver la red. Las niñas y Pamela no necesitan cuenta de Google |
| Usuarios | Familia con datos compartidos. Luciana, Mariel y Julia **no tienen iPhone propio**: usan el de Sergio o el de Marcela con cambio de perfil. La app también funciona en iPad |
| Acceso | Los adultos y Pamela entran con **Iniciar sesión con Apple**. Las niñas son perfiles dentro del teléfono de un adulto: entrar a su perfil es un toque y volver al del adulto pide su PIN |
| Pamela | Tiene iPhone y se instala por TestFlight. Ve **todo** de todos los miembros, incluidas las niñas. Sugiere metas y asigna prácticas. El administrador puede quitarle el acceso en cualquier momento |
| BOLT en niñas | Las tres hijas hacen la prueba de BOLT: Luciana y Mariel solas, Julia con un adulto y en una versión simple. Sus metas se ajustan desde el Perfil |
| Música y voz | De 4 a 6 pistas libres de derechos y 4 sonidos de naturaleza, incluidos en la app. Voz guía solo en el modo Peque ("huele la flor… suelta el aire por la nariz"): por defecto la voz en español del iPhone, con opción de grabar la de mamá o papá |
| Motivación | Hojas, niveles, insignias y **premios familiares** que se canjean con hojas y aprueban papá o mamá (E12). **Ranking semanal individual** por porcentaje de la meta propia, más el reto en equipo |
| Entrega | **Todo junto** en una sola versión 1.0, sin fases |
| Guía durante el ejercicio | Animación visual, tonos distintos por fase y vibración |
| Vibración | **Disponible:** una vibración distinta para cada fase, para practicar con los ojos cerrados |
| Pantalla bloqueada | La guía sigue con la pantalla bloqueada: el audio y la vibración continúan en segundo plano |
| Recordatorios | Notificaciones locales del iPhone, sin servidor |
| Música | Pistas ambientales incluidas + sonidos de naturaleza, con volúmenes separados |
| Metodología | **Oxygen Advantage** (Patrick McKeown): respirar por la nariz, ligero, lento y profundo, con el BOLT score como métrica central (ver sección 4) |
| Idioma / tema | Español, modo oscuro por defecto |
| Dirección visual | Paleta **Bosque en calma**, con tipografías Fraunces suave y Figtree (ver sección 8) |
| Navegación | Pestañas: Inicio · Calendario · Progreso · **Mi perfil** · Familia. **Medir** vive hasta arriba de Mi perfil. Progreso empieza con los logros (nivel, hojas, insignias). Junior: Inicio · Logros · Mi perfil (con "Mis retos") · Familia. El catálogo se abre desde Inicio |
| Fuera de v1 | Apple Health, pregunta de ánimo, voz guía para adultos, Apple Watch, integración con Spotify/Apple Music |

**Por qué nativa:** por US$99 al año se obtienen vibración por fase, guía con la pantalla bloqueada, notificaciones confiables y una instalación sencilla por TestFlight, incluso para Pamela, que no vive en la casa. La versión web no permitía nada de eso en iPhone.

## 2. Supuestos por confirmar

1. **Acceso:** el administrador crea la familia y recibe un *código familiar*. Marcela y Pamela se unen con el código e inician sesión con Apple. Cada adulto define un PIN de 4 dígitos para proteger su perfil en un teléfono compartido.
2. **Qué se comparte:** un panel familiar con los minutos, las rachas, el BOLT y los pasos de cada miembro, más un reto semanal sencillo de minutos de la familia.
3. **Extras en v1:** recordatorios diarios, ejercicio personalizado, rachas y logros.
4. **La semana empieza en lunes**, y los periodos se cuentan con la zona horaria del teléfono.
5. **Las tres hijas** usan el teléfono de mamá o papá. Por eso cambiar de perfil dentro de un mismo teléfono es imprescindible (HU-1.8).
6. **Notificaciones de las niñas:** sus rutinas avisan en el teléfono donde está su perfil, con su nombre: "Mariel, es hora de respirar antes de dormir".

## 3. Roles y usuarios

| Persona | Rol | Perfil |
|---|---|---|
| Sergio | Administrador | Adulto |
| Marcela (esposa) | Administradora | Adulto |
| Luciana (11) | Miembro | Junior |
| Mariel (9) | Miembro | Junior |
| Julia (5) | Miembro | Peque |
| Pamela (maestra de respiración) | Maestra | Seguimiento |

- **Miembro:** practica, mide su BOLT y sus pasos, y ve su progreso y el de la familia.
- **Administrador:** todo lo del miembro, más crear la familia, invitar y quitar miembros, y elegir el perfil de cada quien.
- **Maestra:** da seguimiento. Ve el progreso de todos, deja notas y asigna práctica. No aparece en el ranking ni en el reto familiar. También puede practicar y medirse, si quiere.

## 4. Principios Oxygen Advantage aplicados al diseño

Según el método de Patrick McKeown, respirar bien es respirar **ligero, lento y profundo**, siempre por la **nariz**. El **BOLT score sirve de brújula** para saber cómo vas.

| Principio | Cómo se refleja en la app |
|---|---|
| Respirar siempre por la nariz | **Todo se respira por la nariz, sin excepciones**, también en los ejercicios propios. Los textos dicen "Inhala suave por la nariz" |
| Respirar menos, no más (*Breathe Light*) | Hay dos ejercicios de respiración reducida (HU-2.6 y HU-2.7). Los textos nunca piden "respira profundo" ni "respira grande" |
| Respirar lento (unas 6 por minuto) | La respiración coherente (5.5·5.5) es la práctica recomendada por defecto |
| Profundo significa usar el diafragma, no meter más aire | La indicación es "deja que se mueva el abdomen, no el pecho" |
| El BOLT como métrica central | Se mide al crear el perfil. La pantalla de inicio muestra el BOLT actual y la meta de 40 segundos. Las recomendaciones dependen del BOLT |
| Progresar según el BOLT | Cada rango de BOLT tiene su práctica recomendada (HU-2.4). Las retenciones caminando fuertes piden un BOLT de 20 s o más |
| Tolerancia al CO₂ | Las retenciones caminando (simulación de altitud) se conectan con el registro de pasos |
| Recuperarse después de retener | Al terminar cada retención: "primera respiración pequeña, recupera la calma en 2 o 3 respiraciones" |
| Practicar con el estómago vacío | Antes de las sesiones intensas, la app sugiere hacerlas 2 horas después de comer |
| Medir siempre en las mismas condiciones | Se recomienda medir el BOLT al despertar. La app avisa si mides justo después de hacer ejercicio |

---

## 5. Épicas e historias

Prioridad: **M** = imprescindible en v1 · **S** = debería estar en v1 · **C** = puede esperar.

### E1. Acceso y familia

**HU-1.1 (M): Crear familia**
Como administrador, quiero crear una familia y obtener un código, para que mis familiares se unan.
- Al crear la familia se genera un código de 6 caracteres que se puede copiar o compartir por WhatsApp.
- El administrador queda registrado como el primer miembro.

**HU-1.2 (M): Unirse a la familia**
Como familiar, quiero entrar con el código, mi nombre y un PIN, para tener mi propio historial.
- Si el código no es válido, la app muestra un mensaje claro.
- No se pueden repetir nombres dentro de la misma familia.
- La sesión queda abierta en el teléfono y no pide el PIN cada vez.

**HU-1.3 (S): Administrar miembros**
Como administrador, quiero ver, renombrar y quitar miembros.

**HU-1.4 (M): Instalar con TestFlight**
Como familiar, quiero instalar Calmo en mi iPhone con pasos sencillos.
- Pasos:
  1. Recibir la invitación por correo o mensaje.
  2. Descargar TestFlight del App Store.
  3. Tocar "Aceptar" y luego "Instalar".
- Las actualizaciones llegan solas por TestFlight.
- Desde Perfil se puede invitar a otro iPhone.

**HU-1.5 (M): BOLT inicial**
Como usuario nuevo, quiero medir mi BOLT al crear mi perfil, para recibir una práctica adecuada a mi nivel.
- El paso se puede saltar. Si lo salto, la app me trata como nivel "Base" y me invita a medirlo después.

**HU-1.6 (M): Invitar a la maestra**
Como administrador, quiero invitar a mi maestra con un código de rol "Maestra", para que dé seguimiento a la familia sin contar como miembro.

**HU-1.7 (M): Perfiles por edad**
Como administrador, quiero asignar a cada hija un perfil según su edad, para que solo vea ejercicios seguros y textos a su medida.
- **Junior** (Luciana, 11, y Mariel, 9):
  - Las retenciones caminando son siempre moderadas.
  - Las retenciones son siempre moderadas y los textos más simples.
  - Mide su BOLT y sus pasos como juego, con metas propias de su edad.
- **Peque** (Julia, 5):
  - Pocos ejercicios: respiración suave, exhalación larga y "huele la flor" y "la vela tranquila", todo por la nariz.
  - Sesiones de 1 a 3 minutos.
  - No hay retenciones de ejercicio. El BOLT se mide con un adulto, en una versión simple: "tápate la nariz y avísame cuando quieras respirar".
  - La interfaz es muy visual, con un personaje que respira con ella. Practica acompañada por un adulto.

**HU-1.8 (M): Cambiar de perfil en un mismo teléfono**
Como mamá o papá, quiero cambiar al perfil de Luciana, Mariel o Julia en mi teléfono, para que su práctica se registre a su nombre.
- Entrar al perfil de una niña es un toque en su foto, sin PIN.
- El selector "¿Quién va a respirar?" se abre desde Perfil y desde el avatar de Inicio. Muestra los perfiles de este iPhone y permite agregar otro.
- Para volver al perfil del adulto se pide su PIN.

**HU-1.9 (M): Mis metas**
Como usuario, quiero definir mis metas en mi perfil, para saber hacia dónde voy.
- **BOLT:** 40 segundos por defecto, ajustable en pasos de 5 (de 20 a 60).
- **Pasos sin respirar:** 80 por defecto, en pasos de 10.
- **Minutos por semana:** 150 por defecto, en pasos de 10.
- Cada meta muestra el avance actual ("Hoy: 24 s · te faltan 16 s") con una barra.
- Pamela puede sugerir metas a cada alumno.
- Las metas aparecen en Inicio, Medir y Progreso.
- En perfiles Junior, las metas vienen ajustadas a su edad.

### E2. Catálogo de ejercicios

**HU-2.1 (M): Elegir ejercicio**
Como usuario, quiero ver los ejercicios con su objetivo y patrón, para elegir según cómo me siento.
- Cada tarjeta muestra el nombre, el objetivo (Calma · Enfoque · Dormir · Equilibrio · BOLT) y el patrón, por ejemplo "4·4·4·4".
- Se puede filtrar por objetivo.
- El detalle explica cómo hacerlo, sus beneficios y las precauciones.

**HU-2.2 (S): Ejercicio personalizado**
Como usuario, quiero crear mis propios patrones de inhalar, retener, exhalar y esperar, con nombre.
- Cada fase va de 0 a 20 segundos, en pasos de 0.5. Inhalar y exhalar duran como mínimo 1 segundo, y todo es por la nariz.
- Los ejercicios personalizados se guardan en mi perfil y se cuentan en las estadísticas como su propio tipo.

**HU-2.3 (C): Favoritos**
Como usuario, quiero marcar ejercicios favoritos para que aparezcan primero.

**HU-2.4 (M): Práctica recomendada según mi BOLT**
Como usuario, quiero que la pantalla de inicio me sugiera qué practicar según mi último BOLT.

| BOLT | Nivel | Práctica recomendada | Avisos |
|---|---|---|---|
| < 10 s | Inicio | Respira ligero en reposo (suave), Destapar la nariz, Exhalación larga 4-6 | Sin retenciones largas |
| 10–20 s | Base | Lo anterior + Respiración reducida con pausas de control, Coherente, Triángulo, Cuadrada, 4-7-8, Retenciones caminando con falta de aire moderada | Sin retenciones fuertes |
| 20–30 s | Intermedio | Lo anterior + Retenciones caminando con falta de aire fuerte | |
| > 30 s | Avanzado | Todo el catálogo | |

- Un ejercicio que pide más BOLT del que tengo **no se bloquea**. Muestra un aviso y lo puedo hacer de todos modos tras confirmar.

**HU-2.5 (M): Siempre por la nariz**
Como usuario, quiero que cada fase me recuerde respirar por la nariz. La app no ofrece respirar por la boca en ningún ejercicio.

#### Catálogo inicial

Todos los ejercicios son por la nariz, salvo que se indique otra cosa.

| Ejercicio | Fases (segundos) | Objetivo | BOLT recomendado | Notas |
|---|---|---|---|---|
| Respira ligero en reposo (*Breathe Light*, Oxygen Advantage) | Sin conteo fijo: respiración suave y lenta, con un 20–30% menos de aire. Bloques de 4 min + 1 min de respiración normal | BOLT · Calma | Todos | Respiración reducida. Ver HU-2.6 |
| Respiración reducida con pausas de control (Buteyko) | Pausa de control → de 3 a 5 min de respiración reducida → pausa de control, en 2 a 4 rondas | BOLT · Tolerancia al CO₂ | ≥ 10 (en Junior, versión suave) | Respiración reducida. Mide el BOLT antes y después de cada ronda. Ver HU-2.7 |
| **Destapar la nariz** | Exhala · retén con la nariz tapada moviendo la cabeza · recupera de 30 a 60 | Nariz congestionada | Todos | 5 o 6 repeticiones guiadas |
| Coherente o resonante | Inhala 5.5 · Exhala 5.5 | Equilibrio | Todos | Unas 6 respiraciones por minuto |
| Exhalación larga 5-8 | Inhala 5 · Exhala 8 | Calma | Todos | Variante 4-6 para principiantes |
| Triángulo | Inhala 4 · Retén 4 · Exhala 4 | Enfoque | Todos | |
| Respiración alterna | Inhala 4 · Retén 4 · Exhala 4, alternando lado | Equilibrio | Todos | La pantalla indica "izquierda" o "derecha" |
| Respiración cuadrada | Inhala 4 · Retén 4 · Exhala 4 · Espera 4 | Enfoque | ≥ 10 | |
| 4-7-8 | Inhala 4 · Retén 7 · Exhala 8 | Dormir | ≥ 10 | Aviso: puede marear al inicio |
| Suspiro cíclico | Inhala 2 + inhala corto 1 · Exhala 6, todo por la nariz | Estrés agudo | Todos | Herramienta puntual de 1 a 5 minutos |
| **Retenciones caminando** (simulación de altitud) | Exhala · retén caminando · recuperación obligatoria de 60 por la nariz · de 6 a 10 veces | Tolerancia al CO₂ | Moderada ≥ 10 · fuerte ≥ 20 | Registra los pasos de cada retención (HU-7.3) |

#### Respiración reducida: dos ejercicios

La respiración reducida es un tipo más del catálogo, con dos ejercicios propios: uno de Oxygen Advantage y uno de Buteyko.

**HU-2.6 (M): Respira ligero en reposo**
Como usuario, quiero que la app me guíe para respirar menos aire de forma suave, para subir mi BOLT y calmarme.
- **Preparación** de 30 segundos: sentado y erguido, una mano en el pecho y otra en el abdomen, boca cerrada.
- **Guía sin conteo rígido.** Un círculo de movimiento mínimo marca un ritmo lento y suave: inhala unos 3 segundos y exhala unos 4, que la persona puede ajustar.
- **Indicaciones rotativas** cada 30 o 45 segundos:
  - "Respira un poco menos de lo que tu cuerpo pide."
  - "Suaviza la respiración hasta que casi no se note."
  - "Relaja los hombros y el abdomen."
  - "Si la falta de aire se vuelve fuerte, respira normal 15 segundos y retoma."
- **Estructura por bloques**: 4 minutos de respiración ligera y luego 1 minuto de respiración normal. La duración total la elijo yo, con 10 minutos por defecto, 2 veces al día.
- **Botón "Necesito aire"**: pausa el bloque y da 15 segundos de respiración normal sin cortar la sesión.
- **Variante caminando (S)**: la misma técnica mientras caminas. Los tonos marcan el ritmo y la pantalla puede ir apagada.
- **Versión Junior**: bloques de 2 minutos y lenguaje simple, por ejemplo "respira suavecito como un ratón".

**HU-2.7 (M): Respiración reducida con pausas de control**
Como usuario, quiero hacer rondas de respiración reducida y medir mi pausa de control antes y después, para ver cómo mejora mi tolerancia al CO₂ en la misma sesión.
- Cada ronda:
  1. **Pausa de control** con la misma mecánica que el BOLT: toda la pantalla funciona como botón para detener.
  2. **Recuperación** de 15 segundos respirando normal.
  3. **Respiración reducida** guiada durante 3 a 5 minutos, igual que en HU-2.6.
  4. **Pausa de control** final.
- Se pueden hacer de 2 a 4 rondas (3 por defecto).
- **Resumen al terminar**: la pausa de cada ronda en una minigráfica, la diferencia entre la primera y la última ("+6 s") y el tiempo total de respiración reducida.
- Estas pausas se guardan **dentro de la sesión**. No se mezclan con el BOLT matutino de E6, porque no son comparables, pero se pueden consultar.
- La maestra ve la evolución de estas pausas en la vista de seguimiento (HU-5.5).

### E3. Sesión guiada

**HU-3.1 (M): Configurar la sesión**
Como usuario, quiero elegir la duración antes de empezar.
- Opciones rápidas: 3, 5, 10, 15 y 25 minutos, además de un valor libre de 1 a 60.
- Se recuerda la última duración usada en cada ejercicio.
- La pantalla tiene un botón grande de **Iniciar**.

**HU-3.2 (M): Seguir la guía**
Como usuario, quiero una animación y el conteo de cada fase, para respirar al ritmo correcto.
- El círculo crece al inhalar, se queda quieto al retener y se encoge al exhalar.
- En pantalla se ve el nombre de la fase ("Inhala"), los segundos restantes de la fase y el tiempo total restante.
- Cada fase muestra el ícono de nariz. Los textos invitan a respirar suave ("Inhala suave por la nariz") y nunca piden respirar "profundo".
- Después de cada retención, la app indica: "primera respiración pequeña, recupera la calma".
- Hay una cuenta regresiva de 3-2-1 antes de empezar.
- El temporizador debe ser preciso, sin desfase acumulado en 20 minutos.

**HU-3.3 (M): Tonos y vibración por fase**
Como usuario, quiero un tono y una vibración distintos en cada cambio de fase, para practicar con los ojos cerrados.
- Inhalar, retener y exhalar tienen cada uno un tono diferente y reconocible.
- Cada fase tiene su propio patrón de vibración: suave y creciente al inhalar, un toque corto al retener y largo y descendente al exhalar.
- Tonos y vibración se activan por separado, y los tonos tienen su propio volumen.

**HU-3.4 (M): Pausar y terminar**
Como usuario, quiero pausar, reanudar o terminar antes de tiempo.
- Si termino antes, la sesión se guarda con la duración real, siempre que dure al menos 30 segundos.
- Al llegar al tiempo elegido, la app termina el ciclo en curso en vez de cortarlo a la mitad.

**HU-3.5 (M): Pantalla encendida o bloqueada**
Como usuario, quiero practicar con la pantalla encendida o bloqueada, para respirar sin estar pendiente del teléfono.
- Por defecto la pantalla se queda encendida y la interfaz se oscurece. El botón "Atenuar" la oscurece aún más.
- Si bloqueo el iPhone, la guía sigue con sonido y vibración en segundo plano, y la sesión se registra igual.

**HU-3.6 (M): Resumen y felicitación al terminar**
Como usuario, quiero que la app me felicite al terminar y me muestre el tiempo, los ciclos, mi racha y las hojas que gané.
- La app **siempre felicita**, por ejemplo "Bien hecho, Sergio", con una pequeña animación de hojas.
- Si la sesión estaba planeada, se marca como cumplida ("2 de 2 hoy").
- Muestra el avance de la meta semanal y del nivel, con un enlace a "Mis logros" (E12).

**HU-3.7 (M): Seguridad**
Como usuario, quiero avisos antes de los ejercicios con retenciones largas o hiperventilación.
- El aviso dice: nunca en el agua, manejando ni de pie; consultar al médico si hay embarazo, hipertensión o epilepsia.
- La primera vez hay que aceptarlo y luego se puede ocultar.
- Si mi BOLT está por debajo del recomendado para el ejercicio, la app me lo dice y me sugiere una alternativa.
- En los ejercicios intensos sugiere practicar con el estómago vacío, unas 2 horas después de comer.

### E4. Música y sonido

**HU-4.1 (M): Música de fondo**
Como usuario, quiero elegir una pista relajante o un sonido de naturaleza antes de iniciar.
- Hay de 3 a 5 pistas libres de derechos y sonidos de naturaleza: lluvia, mar, bosque y ruido blanco.
- Una pista y un sonido de naturaleza se pueden mezclar.
- Música, naturaleza y tonos tienen volúmenes separados.
- Los sonidos se repiten sin cortes y se desvanecen suavemente al terminar.
- Los archivos se guardan en el teléfono para funcionar sin conexión.

### E5. Progreso y estadísticas

**HU-5.1 (M): Mi conteo diario, semanal y mensual**
Como usuario, quiero ver cuántos minutos y cuántas sesiones hice por periodo.
- Hay pestañas para Hoy, Semana y Mes, con flechas para ver periodos anteriores.
- Se muestran el total y el desglose **por tipo de ejercicio**.
- La gráfica de barras muestra días en las vistas de semana y mes.

**HU-5.2 (M): Historial de sesiones**
Como usuario, quiero ver una lista de mis sesiones con fecha, ejercicio y duración.

**HU-5.3 (S): Panel familiar**
Como miembro, quiero ver los minutos de la semana y la racha de cada familiar.
- Es una tarjeta por miembro, con minutos, racha y último BOLT.

**HU-5.4 (M): Reto familiar**
Como familia, queremos una meta semanal de minutos entre todos, con una barra de avance.

**HU-5.7 (M): Ranking semanal**
Como miembro, quiero ver una tabla semanal de la familia, para motivarme a practicar más.
- Se ordena por **porcentaje de la meta semanal propia** y no por minutos totales, para que sea justo entre edades: Julia con 15 minutos puede ganarle a un adulto con 150.
- Muestra posición, nombre, avatar y barra de avance. Los primeros lugares llevan una hoja dorada.
- Se mide sobre los **últimos 7 días** (ventana móvil). Pamela no participa.
- Los textos siempre animan: "Te faltan 2 sesiones para subir un lugar".

**HU-5.5 (M): Vista de seguimiento de la maestra**
Como maestra, quiero ver por alumno los minutos, la frecuencia, los ejercicios realizados y la evolución del BOLT y de los pasos, para ajustar su práctica.
- Hay una lista de alumnos con un semáforo de constancia de los últimos 7 días.
- El detalle de cada alumno muestra sus gráficas de BOLT y pasos, y sus sesiones recientes.

**HU-5.8 (M): Herramientas sencillas para Pamela** (todo en 3 toques o menos)
- **Asignar a varios a la vez:** elige ejercicio, minutos y horario una sola vez, y marca a quién (si incluye a Julia, solo ejercicios Peque de 1 a 3 min).
- **Editar, pausar o quitar** una práctica desde el mismo editor.
- **Notas rápidas:** "¡Vas muy bien!", "Mantén la boca cerrada al caminar", "Practica antes de dormir", o texto libre. El alumno la marca como leída.
- **Sugerir metas** de BOLT y pasos (±5 s, ±10 pasos); el alumno ve "Sugerida por Pamela".
- **Ver el detalle de cada alumno**, con datos para niñas (estrellas, Reto del aire con un adulto).
- Pamela entra con su propio **código de maestra** e inicia sesión con Apple.

**HU-5.6 (S): Notas y práctica asignada**
Como maestra, quiero dejar una nota y asignar una práctica a cada alumno, por ejemplo "Respira ligero, 5 minutos, 2 veces al día".
- El alumno ve la práctica asignada en su pantalla de inicio, con prioridad sobre la recomendación automática.
- El alumno ve la nota de la maestra y la marca como leída.

### E6. BOLT score

**HU-6.1 (M): Medir el BOLT**
Como usuario, quiero que la app me guíe para medir mi BOLT score.
- La app muestra los pasos: siéntate, respira normal, exhala normal, tápate la nariz y pulsa Iniciar.
- Durante la prueba, **toda la pantalla funciona como botón** para detener, sin tener que buscar el botón.
- Se detiene ante el **primer deseo** de respirar, y la app lo recuerda en pantalla.
- El resultado se muestra en segundos con su nivel: Inicio <10 · Base 10–20 · Intermedio 20–30 · Avanzado 30–40 · Meta 40+ (nombres amables, sin "malo").
- Se puede agregar una nota y marcar si fue la medición de la mañana.
- La app recomienda medir al despertar. Si acabo de hacer un ejercicio de respiración, me avisa que ese resultado no es comparable con los demás.

**HU-6.2 (M): Historial del BOLT**
Como usuario, quiero ver la evolución de mi BOLT en una gráfica.
- La gráfica muestra la tendencia de los últimos 30 y 90 días, además del mejor resultado y el promedio semanal.
- Las mediciones se pueden borrar o editar.
- Se ve la meta de 40 segundos con una barra de avance, y la app celebra cada mejora de 5 segundos.

**HU-6.3 (S): Recordatorio de BOLT**
Como usuario, quiero un recordatorio por la mañana, 1 o 2 veces por semana, para medir mi BOLT en condiciones iguales.

### E7. Pasos sin respirar

**HU-7.1 (M): Registrar pasos**
Como usuario, quiero hacer la prueba y registrar cuántos pasos di sin respirar.
- La app muestra las instrucciones: exhala normal, tápate la nariz, camina contando y detente con falta de aire moderada o fuerte.
- Durante la prueba hay un cronómetro opcional. Al terminar capturo el número de pasos.
- Se muestra la meta de referencia: 80 o más pasos.

**HU-7.2 (M): Historial de pasos**
Como usuario, quiero ver la gráfica de mis pasos, con el mejor resultado y la tendencia.

**HU-7.3 (S): Serie de retenciones caminando**
Como usuario, quiero que la app me guíe en una serie de retenciones caminando (simulación de altitud).
- La serie tiene de 6 a 10 retenciones. Entre una y otra hay una **recuperación obligatoria de 60 segundos** respirando normal por la nariz. Antes de que termine, el botón de la siguiente retención no se activa. Antes de la primera serie aparece el aviso de seguridad: lugar plano y seguro, nunca en el agua ni manejando.
- Después de cada retención registro los pasos con botones rápidos de ± y el último valor ya cargado.
- La intensidad, moderada o fuerte, se ajusta según mi BOLT.
- En el historial de pasos, la serie aparece separada de la prueba de máximo.

### E8. Consejos

**HU-8.1 (M): Biblioteca de consejos**
Como usuario, quiero leer consejos para mejorar mi respiración.
- Categorías: Principios de Oxygen Advantage · Hábitos diarios · Cuándo usar cada técnica · Mejorar el BOLT · Dormir · Ejercicio físico · Seguridad.
- Contenido de Oxygen Advantage: respirar por la nariz día y noche, cinta en la boca para dormir, respirar ligero, respirar por la nariz al hacer ejercicio, evitar suspiros y bostezos grandes, y por qué un BOLT alto mejora la energía y el sueño.
- Algunos consejos enlazan directo a un ejercicio, por ejemplo "Prueba 4-7-8 antes de dormir".

**HU-8.2 (S): Consejo del día**
Como usuario, quiero ver un consejo distinto cada día en la pantalla de inicio.

**HU-8.3 (M): Para este momento**
Como usuario, quiero accesos rápidos en Inicio ordenados como transcurre el día, para encontrar rápido el ejercicio adecuado.
- El orden es: **Enfocarme** (Cuadrada) → **Calmarme** (Exhalación larga) → **Dormir** (4-7-8).

**HU-8.4 (M): Inicio según la hora del día**
Como usuario, quiero que el encabezado de Inicio cambie con la hora, para que la app acompañe mi día.
- **Mañana (5 a 12 h):** paisaje claro con sol y niebla, y el saludo "Buenos días".
- **Tarde (12 a 19 h):** tonos medios con el sol bajo, y "Buenas tardes".
- **Noche (19 a 5 h):** paisaje oscuro con luna y estrellas, y "Buenas noches".
- Solo cambia el encabezado. El resto de la pantalla mantiene la paleta Bosque en calma.

### E9. Hábito: recordatorios y rachas

**HU-9.1 (S): Recordatorio diario**
Como usuario, quiero recibir una notificación a la hora que elija.
- Requiere que el usuario dé permiso de notificaciones.
- *Nota técnica:* son notificaciones locales del iPhone. Se programan en el teléfono y no necesitan servidor.

**HU-9.2 (M): Racha**
Como usuario, quiero ver cuántos días seguidos llevo practicando.
- Cuenta un día con al menos 1 sesión de 1 minuto o más.
- El mensaje es positivo y sin castigos. Por ejemplo, si se rompe la racha: "¡Retoma hoy!".

Los logros y las insignias pasaron a E12.

### E10. Ajustes

**HU-10.1 (M):** Como usuario, quiero configurar mis ajustes:
- Durante la sesión: tonos por fase, vibración por fase, cuenta regresiva y seguir con la pantalla bloqueada.
- Volúmenes por defecto de música, naturaleza y tonos.
- Recordatorios de rutinas, del BOLT y del resumen semanal.
- Tema: Automático, Noche o Día.
- El código de la familia para compartirlo, y cerrar sesión.

### E11. Calendario

**HU-11.1 (M): Ver mi calendario en dos vistas**
Como usuario, quiero ver las sesiones que debo hacer y las que hice, por día o por mes, para ver mi constancia de un vistazo.
- Un selector arriba cambia entre las vistas **Días** y **Mes**. El botón "+" abre Planear.
- **Vista Días** (por defecto):
  - Una lista de la semana, día por día, con el día de hoy resaltado.
  - Cada sesión es una tarjeta con su fuente (De Pamela · Tuya · Extra), el ejercicio, la hora y la duración, y su estado con ícono (Hecha · Pendiente · No realizada).
  - Se navega por semana, por ejemplo "Semana 45 · 2 – 8 nov", con el resumen "3 de 14 planeadas · 1 extra".
  - Un día vacío dice "Sin sesiones".
- **Vista Mes:**
  - Una cuadrícula con puntos por sesión: salvia relleno si está hecha, anillo salvia si está pendiente, anillo gris si no se realizó y brasa si fue extra.
  - Al tocar un día se ve su agenda.

**HU-11.2 (M): Las prácticas de Pamela aparecen solas**
Como alumno, quiero que la práctica que me asigna Pamela se agende en mi calendario, con su frecuencia y horario, sin tener que capturarla.

**HU-11.3 (M): Rutinas recurrentes**
Como usuario, quiero agregar con un toque las sesiones que repito todos los días, para no tener que planearlas una por una.
- **Rutinas rápidas de un toque:**
  - "Al despertar · 05:30 · todos los días" (Respiración coherente, 10 min).
  - "Antes de dormir · 21:00 · todos los días" (4-7-8, 5 min).
  - "Otra rutina".
- **Frecuencia:** Una vez · Todos los días · Entre semana · Días específicos. Solo la última muestra los días L M M J V S D para elegir.
- También se pueden agendar mediciones de BOLT, por ejemplo los lunes a las 06:45.
- Cada rutina tiene su propio recordatorio.
- Se pausa, edita o borra desde **Perfil › Mis rutinas**.

**HU-11.4 (M): Sesiones extra**
Como usuario, quiero que cualquier sesión que haga sin estar planeada se registre como **Extra** en el día que la hice.
- **Regla de emparejamiento:** una sesión cuenta como "hecha" si es del mismo ejercicio que una planeada del mismo día que siga pendiente, eligiendo la de horario más cercano. Si no, queda como extra.
- Las extra cuentan en todas las estadísticas y en la racha.

**HU-11.5 (S): Recordatorio de sesión planeada**
Como usuario, quiero recibir un aviso a la hora de cada sesión planeada, para no olvidarla.

**HU-11.6 (S): Calendario para la maestra**
Como maestra, quiero ver el calendario de cada alumno, para saber qué cumplió y qué hizo por su cuenta.

### E12. Logros y celebración

**Lenguaje para niñas** (resultado de la prueba de usabilidad con una niña de 8 años). En los perfiles Junior y Peque nunca se ven tecnicismos ni avisos que asusten:

| En adulto | En Junior y Peque |
|---|---|
| BOLT | "Reto del aire": los segundos que aguantas sin respirar, tranquila |
| Respiración coherente | "Respira como las olas" |
| Pausas de control, tolerancia, CO₂ | No se muestran |
| Racha | Días seguidos |
| Ciclos | Respiraciones |
| Prueba de máximo | Mi récord de pasos |
| Retención 5 de 8 | Vuelta 5 de 8 |
| Canjear | ¡Lo quiero! |

- **Barra de pestañas Junior:** Inicio · Logros · Mi perfil · Familia. Las niñas nunca llegan a pantallas de adulto (aprobar premios, ajustes, Pamela).
- **Flujo Junior:** de Inicio a Empezar, a la sesión y a la celebración, en 2 toques y sin decidir duración ni ambiente.

Es prioridad, sobre todo para Luciana, Mariel y Julia: que sientan que van logrando algo.

**HU-12.1 (M): Celebración al terminar**
Como usuario, quiero que la app me felicite cada vez que termino un ejercicio, para sentir el logro.
- La felicitación es siempre positiva, con una pequeña animación de hojas y las hojas ganadas ("+12 hojas").
- Si gané una insignia, aparece la pantalla de **insignia nueva**, con un botón para contarle a la familia.

**HU-12.2 (M): Hojas y niveles**
Como usuario, quiero ganar hojas al practicar y subir de nivel.
- **Hojas:** 1 por minuto, +5 por cumplir una sesión planeada y +10 por cada insignia.
- **Niveles:** Semilla (0) · Brote (100) · Planta (250) · Árbol (500) · Bosque (1000).
- Siempre se ve cuánto falta para el siguiente nivel.

**HU-12.3 (M): Insignias**
Como usuario, quiero desbloquear insignias y ver mi avance hacia las que me faltan.

| Insignia | Cómo se gana |
|---|---|
| Primera respiración | Terminar la primera sesión |
| Brote constante | 3 días seguidos |
| Semana de hojas | 7 días seguidos |
| Mes de calma | 30 días seguidos |
| Madrugadora | 5 sesiones al despertar |
| Búho sereno | 5 sesiones antes de dormir |
| Nariz despejada | Hacer "Destapar la nariz" 3 veces |
| Explorador | Probar 5 ejercicios distintos |
| Caminante | 50 pasos sin respirar |
| BOLT 20 | Llegar a 20 s de BOLT |
| Alumna estrella | 7 días cumpliendo la práctica de Pamela |
| Equipo Hinojosa | Insignia de equipo: la ganan todos cuando la familia llega a su meta de 7 días |

- Las insignias ganadas se ven a color. Las bloqueadas aparecen en silueta con su progreso ("3 de 7").

**HU-12.4 (S): Tu jardín de la semana**
Como Junior, quiero ver crecer una planta por cada día que practico, para ver mi semana de un vistazo.

**HU-12.5 (M): Inicio Junior**
Como Luciana o Mariel, quiero ver en Inicio mi nivel, mis hojas y la próxima insignia que puedo ganar.

**HU-12.6 (M): Estrellas para Peque**
Como Julia, quiero ganar una estrella cada día que respiro, con una celebración grande y simple al terminar ("¡Lo hiciste muy bien!").
- Las sesiones Peque terminan por número de respiraciones: flor 9 (~1 min), vela 17 (~2 min), ratón 45 (~3 min).
- **Reto del aire con mamá o papá:** el adulto toca un botón grande para empezar y terminar; Julia ve "¡12 segundos!" y gana su estrella.
- Las estrellas muestran los últimos 7 días, con la letra del día.

**HU-12.7 (M): Premios familiares**
Como Luciana o Mariel, quiero canjear mis hojas por premios reales que eligen papá y mamá, para que practicar valga la pena.
- Hay dos tipos de hojas:
  - **Hojas ganadas**: el total, que decide el nivel.
  - **Hojas para canjear**: el saldo que se gasta en premios. Canjear nunca baja de nivel.
- Cada premio muestra su costo, mi avance y un botón **Canjear** cuando me alcanza. Al canjear queda "Esperando a papá o mamá".
- **Lista inicial (aprobada):** Elegir la película del viernes (80) · Media hora más de pantalla (100) · Postre especial (120) · Ir por un helado (150) · Elegir la cena del domingo (180) · Libro nuevo (250) · Pijamada (400) · Salida especial con papá o mamá (500). Una niña junta de 10 a 15 hojas al día con su práctica.
- **Julia (Peque) participa igual que sus hermanas**, con hojas y los mismos premios. **Los adultos no canjean**: solo crean y aprueban.
- Al pedir un premio, las hojas se **apartan**; si papá o mamá dicen "Ahora no", regresan. Aprobar pide el PIN de un adulto.

**HU-1.10 (M): Administrar perfiles y a Pamela**
Como administrador, quiero agregar, renombrar, cambiar de tipo (Adulto · Junior · Peque) y quitar perfiles, y desde Ajustes pausar o quitar el acceso de Pamela.

**HU-12.8 (M): Administrar premios**
Como papá o mamá, quiero crear premios con su costo en hojas, elegir qué perfiles los ven y aprobar o posponer los canjes.

- Los mensajes son siempre positivos y sin castigos por fallar un día. El ranking (HU-5.7) se mide contra la meta propia, para que nadie quede avergonzado.

---

## 6. Requisitos no funcionales

- **Sin conexión:** las sesiones, las mediciones y los audios funcionan sin internet y sincronizan después.
- **Precisión:** el temporizador se basa en el reloj de audio, para que tonos y animación no se desfasen.
- **Privacidad:** los datos viven en el Google Drive de Sergio. El script de Apps Script solo responde a la app de la familia, con una clave privada, y Sergio puede revocar el acceso a Pamela.
- **Costo:** US$99 al año por la cuenta Apple Developer. Todo lo demás es gratis: Xcode, TestFlight, Google Drive, Hojas de cálculo y Apps Script.
- **Usabilidad:** se llega a una sesión en 3 toques o menos desde el inicio, con botones grandes y texto legible.

## 7. Modelo de datos (borrador)

Cada colección es una pestaña de la hoja "Calmo · datos" en el Google Drive de Sergio, y cada registro es una fila.

```
families/{familyId}            name, code, adminId, createdAt
  members/{memberId}           name, role (admin|miembro|maestra), profile (adulto|junior|peque), pinHash, joinedAt, settings
  assignments/{id}             memberId, byTeacherId, exerciseId, minutes, times[], days[], note, readAt
  plans/{id}                   memberId, kind (sesion|bolt), exerciseId, minutes, time, days[] | date, source (maestra|propia), assignmentId?
  sessions/{sessionId}         memberId, exerciseId, startedAt, durationSec, cycles, completed, planId? (null = extra), controlPauses[] (solo HU-2.7)
  bolt/{id}                    memberId, takenAt, seconds, isMorning, note
  steps/{id}                   memberId, takenAt, type (max|serie), steps[], seconds, note
  customExercises/{id}         memberId, name, phases[{type, sec}]
  goals/{memberId}             boltSec, steps, weeklyMinutes, suggestedBy? (maestra)
  achievements/{id}            memberId, badgeId, unlockedAt, progress
  points/{id}                  memberId, at, amount, reason (minutos|planeada|insignia|canje), sessionId?, rewardId?
  rewards/{id}                 name, cost, visibleTo[] (junior|peque|adulto), active, createdBy
  redemptions/{id}             memberId, rewardId, cost, status (pendiente|aprobado|pospuesto), requestedAt, decidedBy?
```

## 8. Dirección visual

El diseño en alta fidelidad de todas las pantallas está en el lienzo de diseño "Calmo · diseño visual".

**Encabezado de Inicio según la hora (HU-8.4):**
- **Mañana:** cielo #DCE7DA, sol y niebla, texto oscuro.
- **Tarde:** cielo #4A6855, con el sol bajo.
- **Noche:** cielo #101A15, con luna y estrellas.
- El primer plano del paisaje siempre se funde con el fondo #101A15.

**Buenas prácticas aplicadas:**
- **Paleta biofílica:** verdes desaturados y tonos tierra, que según los estudios de entornos naturales favorecen la recuperación del estrés. Nunca se usa negro ni blanco puros.
- **Paisaje plano por capas** (cerros, pinos, luna) en lugar de degradados. Es acogedor y no distrae.
- **Formas orgánicas:** el círculo de respiración tiene capas que giran muy lento, para que se sienta vivo. Radios grandes: 28 en tarjetas y 999 en botones.
- **Movimiento lento:** las transiciones duran lo mismo que la fase de respiración y usan curvas suaves. Si el teléfono pide "reducir movimiento", la animación se desactiva.
- **Una sola acción principal por pantalla**, con mucho espacio en blanco.
- **Tipografía con voz:** Fraunces suave en títulos y frases de guía, y Figtree, legible y amable, en el texto.
- **Tono cálido y personal:** saludo por nombre y hora del día. La racha y los logros usan un color brasa cálido, y nunca rojo ni mensajes de pérdida.
- **Accesibilidad:** contraste de al menos 4.5:1 en texto y botones de al menos 44 px.

| Token | Hex | Uso |
|---|---|---|
| Bosque nocturno | #101A15 | Fondo |
| Sotobosque | #16231C | Capa baja |
| Musgo profundo | #1C2B23 | Tarjetas |
| Niebla | #EEF3EC | Texto |
| Liquen | #A9B8AC | Texto secundario |
| Salvia | #9CC5A1 | Acción principal |
| Brasa | #E9B27D | Racha, extra, logros |
| Hoja nueva / Arena / Musgo / Neblina | #B9DEC3 / #E2CC94 / #6FA58A / #7C8F84 | Fases: inhala / retén / exhala / espera |
| Día: Crema / Pino / Corteza | #F3F1EA / #4F7D5F / #1F2A23 | Tema claro |

## 9. Catálogo predefinido (para validar)

Perfiles: **A** = Adulto · **J** = Junior · **P** = Peque. Junior ve todo; las retenciones caminando, solo en versión moderada. Todo se respira por la nariz.

| Ejercicio | Patrón | Objetivo | Perfiles | Notas |
|---|---|---|---|---|
| Respiración coherente | 5.5 · 5.5 | Equilibrio | A · J | Práctica recomendada por defecto |
| Exhalación larga 5-8 | 5 · 8 (variante 4 · 6) | Calma | A · J | Acceso rápido "Calmarme" |
| Triángulo | 4 · 4 · 4 | Enfoque | A · J | |
| Respiración cuadrada | 4 · 4 · 4 · 4 | Enfoque | A · J | Acceso rápido "Enfocarme". BOLT ≥ 10 |
| Respiración alterna | 4 · 4 · 4, alternando lado | Equilibrio | A · J | |
| 4-7-8 | 4 · 7 · 8 | Dormir | A · J | Acceso rápido "Dormir". BOLT ≥ 10 |
| Suspiro cíclico | 2 + 1 · 6, todo por la nariz | Estrés agudo | A · J | De 1 a 5 min |
| Destapar la nariz | Exhala · retén moviendo la cabeza · recupera | Nariz congestionada | A · J | De 5 a 6 repeticiones |
| Respira ligero en reposo | Suave, con un 20–30% menos de aire, bloques de 4 + 1 min | BOLT · Calma | A · J | Respiración reducida (Oxygen Advantage). En Junior, bloques de 2 min |
| Respiración reducida con pausas de control | Pausa → 3 a 5 min reducida → pausa, en 2 a 4 rondas | BOLT · CO₂ | A · J | Respiración reducida (Buteyko). En Junior, versión suave |
| Retenciones caminando | Exhala · retén caminando · recuperación obligatoria de 60 s por la nariz, de 6 a 10 veces | Tolerancia al CO₂ | A · J (solo moderada) | Fuerte con BOLT ≥ 20 |
| Huele la flor | Inhala 3 · exhala 4, guiado con una flor | Calma | P | 1 min |
| La vela tranquila | Inhala 3 · exhala 4 por la nariz, tan suave que la llama casi no se mueve | Calma | P | 2 min |
| Respira como ratón | Respiración suave y pequeña | Calma | P | 3 min |

Además, cada adulto o Junior puede crear **ejercicios personalizados** (HU-2.2).

## 10. Siguiente paso

**Diseño aprobado por Sergio el 3 de noviembre de 2026** (lienzo "Calmo · diseño visual", 68 pantallas, después de dos revisiones UX con 67 casos de prueba).

1. Llevar la app web al 100 % del diseño aprobado: premios familiares, vista de Pamela (alumnos, detalle, asignar a varios, notas) e inicio de sesión.
2. Abrirla a toda la familia: publicarla en GitHub Pages y sincronizar con la hoja "Calmo · datos" en el Drive de MultiMoney, para que Marcela y Pamela la usen sin cuenta de claude.ai.
3. Validar el catálogo predefinido (sección 9) con Pamela.
4. Si la web funciona bien, pasar a la app nativa en SwiftUI con TestFlight.
