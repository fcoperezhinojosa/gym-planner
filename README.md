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

## Despliegue (Vercel + Supabase, ambos con plan gratuito)

1. Crea un proyecto en Supabase y copia la cadena de conexión del **Transaction pooler** (puerto 6543).
2. Aplica las migraciones y carga el catálogo:
   ```bash
   DATABASE_URL="postgres://…" npm run db:setup
   ```
3. Importa el repo en Vercel y añade las variables de `.env.example`: `DATABASE_URL`, `SESSION_SECRET` (`openssl rand -base64 32`) y, si quieres que solo entren tus amigos, `INVITE_CODE`.

Se puede instalar en el móvil como app ("Añadir a pantalla de inicio").

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

Al cambiar el esquema: edita `src/db/schema.ts` y ejecuta `npm run db:generate`.

## Pendiente / ideas

- Traducir al español los nombres de los ejercicios (el campo `name_es` ya existe).
- Funcionar sin conexión durante el entreno.
- Exportar a CSV.
- Supersets y notas por serie.
