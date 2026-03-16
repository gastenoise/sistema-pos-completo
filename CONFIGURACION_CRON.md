# Configuración del Cron para Automatización (Render)

Este proyecto utiliza el **Laravel Scheduler** para manejar tareas automáticas, como la sincronización de productos SEPA y la actualización de la cotización del dólar.

En producción (Render), el backend está desplegado en `https://sistema-pos-completo.onrender.com/`. Para que las tareas programadas se ejecuten, es necesario configurar un **Cron Job** en el dashboard de Render.

## Tareas Programadas Actuales

Según `backend/routes/console.php`, las tareas activas son:

1.  **Sincronización SEPA (`sepa:sync`)**: Se ejecuta todos los días a las **15:30 (Hora de Argentina)**.
2.  **Cotización del Dólar (`FetchDollarRate`)**: Se ejecuta todos los días a las **09:00**.

## Pasos para configurar en Render

Para que Laravel pueda ejecutar estas tareas, se debe crear un servicio adicional de tipo "Cron Job" que llame al comando de programación de Laravel cada minuto.

### 1. Crear el Cron Job
1. Inicia sesión en tu dashboard de [Render](https://dashboard.render.com/).
2. Haz clic en **"New +"** y selecciona **"Cron Job"**.
3. Conecta el mismo repositorio de GitHub que usas para el backend.

### 2. Configuración del Servicio
*   **Name**: `pos-backend-cron` (o el nombre que prefieras).
*   **Environment**: `Docker` (ya que el backend usa un Dockerfile).
*   **Schedule**: `* * * * *`
    *   *Nota: Esto significa que el comando se ejecutará cada minuto. Laravel Scheduler se encargará internamente de decidir si corresponde ejecutar alguna tarea específica (como la de las 15:30) en ese momento.*
*   **Command**: `php artisan schedule:run`
    *   **Importante**: Si el "Root Directory" de tu servicio en Render está configurado como `backend`, el comando es simplemente `php artisan schedule:run`. Si no tienes configurado el Root Directory, deberás usar `cd backend && php artisan schedule:run`.

### 3. Variables de Entorno
Es fundamental que el Cron Job tenga acceso a las mismas variables de entorno que tu Web Service principal (Base de datos, App Key, etc.).

1. Ve a la pestaña **Environment** de tu nuevo Cron Job.
2. Puedes copiar las variables manualmente o, preferiblemente, usar un **Environment Group** en Render para compartir las variables entre el Web Service y el Cron Job.

## Verificación
Una vez activo, puedes ver los logs del Cron Job en Render. Cada minuto verás que el comando se ejecuta. Si hay una tarea programada para ese momento, verás algo como:
`Running [sepa:sync] ......................................................................... 12ms DONE`

## Notas Adicionales
*   **Zona Horaria**: El comando `sepa:sync` está configurado específicamente para la zona horaria `America/Argentina/Buenos_Aires`. Asegúrate de que el servidor tenga la hora correcta o que Laravel esté configurado para manejar UTC correctamente (por defecto lo hace bien).
*   **Costos**: Ten en cuenta que en Render, los Cron Jobs tienen un costo asociado según el plan que elijas.

---

## Alternativa para el Plan Gratuito (Render Free)

Si estás usando el plan gratuito de Render, no tienes acceso a la funcionalidad de "Cron Jobs". Para solucionar esto, hemos habilitado un endpoint que permite ejecutar el scheduler mediante una petición HTTP POST.

### 1. Configurar Token de Seguridad
Para evitar que cualquiera ejecute el scheduler, debes configurar una variable de entorno en tu Web Service de Render:

*   **Key**: `SYSTEM_CRON_TOKEN`
*   **Value**: Una cadena aleatoria y segura (ej: `tu_token_secreto_123`).

### 2. Configurar un servicio de Cron Externo
Puedes usar un servicio gratuito como [Cron-job.org](https://cron-job.org/) o similar para llamar a tu endpoint automáticamente.

1.  Crea una cuenta en Cron-job.org.
2.  Crea un nuevo "Cronjob".
3.  **URL**: `https://sistema-pos-completo.onrender.com/protected/system/run-scheduler`
4.  **Execution schedule**: Cada 1 minuto (o la frecuencia que desees, aunque Laravel espera 1 minuto para chequear todas las tareas).
5.  **Request Method**: `POST`
6.  **Request Headers**: Añade el siguiente header:
    *   `X-Cron-Token`: (El valor que pusiste en `SYSTEM_CRON_TOKEN`).

### 3. Consideración sobre el "Spin down"
En el plan gratuito de Render, el servidor se "duerme" tras 15 minutos de inactividad.
*   Si el servicio externo de Cron llama al endpoint cada minuto, el servidor **nunca se dormirá**.
*   Si prefieres que se duerma, puedes configurar el Cron externo para que solo llame en las horas necesarias (ej: a las 09:00 y a las 15:30), pero ten en cuenta que el primer request tardará unos segundos en despertar al servidor.
