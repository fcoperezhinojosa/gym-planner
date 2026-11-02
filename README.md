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
| `src/lib/offline-queue.ts` | Cola local de series y cierre de entreno sin conexión |

Al cambiar el esquema: edita `src/db/schema.ts` y ejecuta `npm run db:generate`.

## Pendiente / ideas

- Iniciar entrenos y añadir ejercicios sin conexión.
- Exportar a CSV.
- Supersets y notas por serie.
