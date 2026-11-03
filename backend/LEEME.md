# Servidor de Calmo (Google Apps Script)

Guarda los datos de la familia en una hoja "Calmo · datos" de tu Google Drive y controla el ingreso con usuario y contraseña. Las contraseñas se guardan como huella cifrada (SHA-256 con sal), nunca en texto.

## Instalarlo (una sola vez, unos 5 minutos)

1. Entra a <https://script.google.com> con tu cuenta de Google y toca **Nuevo proyecto**.
2. Ponle de nombre **Calmo servidor**.
3. Borra lo que trae el archivo `Código.gs` y pega todo el contenido de [`Codigo.gs`](Codigo.gs).
4. Guarda (ícono del disquete).
5. Toca **Implementar → Nueva implementación**.
   - Tipo: **Aplicación web**.
   - Ejecutar como: **Yo**.
   - Quién tiene acceso: **Cualquier usuario**. La app pide usuario y contraseña de todas formas; esto solo permite que la página llegue al servidor.
6. Toca **Implementar** y autoriza los permisos. Google avisa que la app no está verificada: elige **Configuración avanzada → Ir a Calmo servidor**. Es tu propio script.
7. Copia la **URL de la aplicación web**, que termina en `/exec`, y pásasela a Claude para ponerla en `web/js/config.js`.

La primera vez que alguien abra la app, la pantalla de ingreso ofrece **crear la cuenta de administrador**. Después, en **Ajustes → Cuenta y usuarios**, das de alta a los demás: adulto, administrador o maestra.

## Notas

- La hoja "Calmo · datos" se crea sola en tu Drive la primera vez. No cambies los nombres de sus pestañas.
- Si cambias el código, usa **Implementar → Administrar implementaciones → Editar → Versión nueva** para que la URL siga siendo la misma.
- Si tu cuenta de trabajo no permite elegir "Cualquier usuario", instala el script con una cuenta personal de Gmail.
- Después de 5 contraseñas incorrectas seguidas, ese usuario espera 10 minutos.
