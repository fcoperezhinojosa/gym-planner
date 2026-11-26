# Gym Planner

Planificador de gimnasio inspirado en Gym WP, sin límite de ejercicios por rutina:

- **Catálogo de ~870 ejercicios** con imágenes, músculo y material (mancuernas, máquina, barra, polea…). Puedes añadir los tuyos.
- **Rutinas** sin límite de ejercicios. Cambias el peso de una serie y se actualiza en las demás que tenían el mismo peso (3×12 kg → 3×16 kg con un cambio; las pirámides no se rompen).
- **Plan semanal con rotación**: ciclo de 1 a 8 semanas (A/B…) para alternar, por ejemplo, pecho bajo y pecho alto. Cada día puede ser gimnasio, actividad (pádel, correr…) o descanso.
- **Hoy y calendario**: qué toca hoy y cada día, qué has hecho y qué no. Puedes cambiar un día concreto sin tocar el plan.
- **Entrenamiento en curso**: pesos prellenados con los de la última vez, marcar series, temporizador de descanso, y al terminar guarda los nuevos pesos en la rutina.
- **Analítica**: días entrenados frente a lo planificado, minutos, kcal por semana (gimnasio + actividades), series por grupo muscular, récords (1RM estimado) y progresión por ejercicio.

Las kcal son una **estimación** con MET (`kcal = MET × peso × horas`), usando tu peso del perfil.

## Puesta en marcha en local

```bash
npm install
npm run dev
```

Abre http://localhost:3000 y crea tu cuenta en `/registro`. No hace falta base de datos: en desarrollo se usa Postgres embebido (PGlite) en `./.pglite`, que se crea, migra y carga con el catálogo la primera vez.

```bash
npm test          # tests de la lógica (rotación, propagación de pesos, kcal…)
npm run lint
npm run typecheck
```

## Despliegue (Vercel + Prisma Postgres)

La app usa Drizzle sobre Postgres estándar, así que vale cualquier Postgres; la opción recomendada es **Prisma Postgres** (Vercel → Storage / Marketplace → Prisma Postgres, plan gratuito).

1. Crea la base de datos Prisma Postgres y copia su cadena de conexión `postgres://…` (variable `DATABASE_URL`).
2. Aplica las migraciones y carga el catálogo (ya con los nombres en español):
   ```bash
   DATABASE_URL="postgres://…" npm run db:setup
   ```
3. Importa el repo en Vercel y añade las variables de `.env.example`: `DATABASE_URL`, `SESSION_SECRET` (`openssl rand -base64 32`) y, si quieres que solo entren tus amigos, `INVITE_CODE`.

Se puede instalar en el móvil como app ("Añadir a pantalla de inicio").

### App Android con temporizador flotante (`mobile/`)

Para ver la cuenta atrás del descanso **flotando arriba mientras usas YouTube o Google** (y que suene al acabar sin pausar el vídeo), el repo incluye un wrapper ligero de Capacitor en `mobile/` que apunta a tu despliegue de Vercel:

1. **Compilación automática en GitHub Actions:** el workflow `.github/workflows/android-apk.yml` genera `gym-planner-android.apk` al hacer push en `mobile/` (o manualmente desde *Actions → Build Android APK*) y lo publica en la release **`android-latest`** para descargarlo directo en el móvil.
2. **Permisos en Android (OnePlus / OxygenOS):** tras instalar el APK y abrir la app, entra en **Más → Temporizador flotante (Android)** para activar:
   - *Mostrar sobre otras apps* (pastilla flotante encima de YouTube/Google).
   - *Notificaciones* (servicio en segundo plano y aviso al terminar).
   - *Batería sin restricciones* (recomendado en OnePlus para evitar retrasos).
   - Desde esa misma tarjeta puedes lanzar una **prueba de 10 s** para verlo en acción.
3. **Actualizaciones sin reinstalar (opcional):** si quieres actualizar el APK encima del anterior sin perder permisos, añade los secretos `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` y `ANDROID_KEY_PASSWORD` en GitHub. Los cambios de la web en Vercel se ven al instante sin recompilar el APK.

### App Android (pastilla flotante de descanso)

La carpeta `mobile/` envuelve la web desplegada en Vercel con Capacitor para añadir un **temporizador de descanso nativo** en Android:

- **Pastilla flotante arriba** (encima de YouTube y Google) con cuenta atrás en vivo, barra de progreso y botones `+15 s`, `Saltar` y `Abrir` al tocarla.
- **Notificación persistente** con cronómetro nativo en cuenta atrás.
- **Sonido al terminar con *audio ducking*** (baja un instante YouTube/Spotify sin pausar el vídeo; suena también por auriculares aunque el móvil esté en silencio) + vibración.
- **Compilación automática en GitHub Actions** (`.github/workflows/android-apk.yml`): al hacer push en `mobile/` o lanzar el workflow manualmente en **Actions → Build Android APK**, genera `gym-planner-android.apk` en el artefacto del run y en el release `android-latest` para descargarlo directo desde el móvil.
- Tras instalar el APK, abre **Más → Temporizador flotante (Android)** para activar los permisos (*Mostrar sobre otras apps*, *Notificaciones* y *Batería sin restricciones* en OnePlus/OxygenOS) y probar la pastilla con el botón de 10 s.
- *(Opcional)* Si añades los secrets `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` y `ANDROID_KEY_PASSWORD` en GitHub, el workflow firmará en modo `release` para actualizar el APK encima sin perder permisos.

### Notificaciones push (recordatorio diario)

La app soporta notificaciones Web Push (Android Chrome / PWA, escritorio e iOS 16.4+ instalada) para recordar al final del día registrar kcal y actividad, abriendo `/cierre`:

1. Genera un par de claves VAPID (gratuitas, una sola vez):
   ```bash
   npx web-push generate-vapid-keys
   ```
2. Añade en Vercel (Variables de entorno):
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (clave pública)
   - `VAPID_PRIVATE_KEY` (clave privada)
   - `VAPID_SUBJECT` (p. ej. `mailto:tu-email@ejemplo.com`)
3. Aplica la migración en producción (`DATABASE_URL="postgres://…" npm run db:setup`).
4. El archivo `vercel.json` programa automáticamente un Vercel Schedule cada hora (`daily-reminders`) que avisa a cada usuario a su hora configurada en **Más → Notificaciones** solo si hoy le falta registrar kcal o actividad.

## Acceso para IAs (API REST + MCP)

Para que Instinct u otra IA consulte qué toca hoy, analice tu entreno y cree rutinas y ejercicios:

1. En la app: **Más → Acceso para IAs → Crear token** (permiso *Leer + crear/editar* o *Solo lectura*). El token `gp_…` se muestra una sola vez; en la base solo se guarda su hash. Se puede revocar cuando quieras.
2. Conéctala con el token en la cabecera `Authorization: Bearer gp_…`:
   - **MCP** (servidor remoto, Streamable HTTP): `https://TU-APP.vercel.app/api/mcp`
   - **REST**: `https://TU-APP.vercel.app/api/v1/…`, descrita en `/api/v1/openapi.json`.

Ambas usan las mismas herramientas (`src/lib/api-tools.ts`):

| Herramienta | REST | Permiso |
|---|---|---|
| `get_today` (qué toca hoy + `link` a la rutina del día) | `GET /api/v1/today` | lectura |
| `get_calendar`, `get_plan`, `get_analytics` | `GET /api/v1/calendar`, `/plan`, `/analytics` | lectura |
| `search_exercises`, `get_exercise`, `get_meta` | `GET /api/v1/exercises?q=…`, `/exercises/:id`, `/meta` | lectura |
| `list_routines`, `get_routine` | `GET /api/v1/routines`, `/routines/:id` | lectura |
| `create_exercise` | `POST /api/v1/exercises` | edición |
| `create_routine`, `update_routine` | `POST /api/v1/routines`, `PUT /api/v1/routines/:id` | edición |
| `set_plan`, `set_plan_day` | `PUT /api/v1/plan`, `PUT /api/v1/plan/day` | edición |

El `link` de `get_today` abre la rutina en la app; hay que tener la sesión iniciada en el móvil. Si el dominio no es el que ve la petición, fija `APP_URL`. La API no permite borrar rutinas ni cerrar o borrar entrenos.

## Sin cobertura en el gimnasio

Un service worker (`public/sw.js`) guarda las pantallas que ya abriste y sus recursos, y la sesión de entreno guarda las series en el móvil (localStorage) hasta que haya red:

- **Antes de entrar**: con señal, inicia el entreno y deja abierta la pantalla de la sesión (así queda en caché).
- **Durante**: marcar series, cambiar pesos y el temporizador de descanso funcionan sin red. Los cambios se envían solos al volver la señal.
- **Al terminar sin red**: el cierre queda guardado y se envía automáticamente al recuperar conexión (abre la app con señal).
- No funciona sin red: iniciar un entreno nuevo, añadir/quitar ejercicios de la sesión y el resto de pantallas que no hayas abierto antes.

El service worker solo se registra en producción (`npm run build && npm start`).

## Estructura

| Ruta | Qué hay |
|---|---|
| `src/db/schema.ts` | Modelo de datos (Drizzle). Migraciones en `drizzle/` |
| `src/lib/schedule.ts` | Qué toca cada día: rotación A/B y excepciones |
| `src/lib/sets.ts` | Propagación de peso/reps entre series |
| `src/lib/kcal.ts` | Tabla MET y estimación de kcal |
| `src/lib/data.ts` | Consultas (capa de acceso a datos) |
| `src/app/actions.ts` | Server Actions (todas comprueban que los datos son del usuario) |
| `src/app/(app)/…` | Pantallas: Hoy, Calendario, Plan, Rutinas, Ejercicios, Sesión, Actividades, Analítica, Perfil |
| `data/exercises.json` | Catálogo de [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (dominio público) |
| `data/exercises-es.json` | Nombres de los ejercicios en español (id → nombre); se cargan en `name_es` |
| `src/lib/api-*.ts`, `src/app/api/` | API REST, servidor MCP y tokens para IAs |
| `src/lib/offline-queue.ts` | Cola local de series y cierre de entreno sin conexión |

Al cambiar el esquema: edita `src/db/schema.ts` y ejecuta `npm run db:generate`.

## Pendiente / ideas

- Iniciar entrenos y añadir ejercicios sin conexión.
- Exportar a CSV.
- Supersets y notas por serie.
