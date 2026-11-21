export type RestAnimationId =
  | "hydrate"
  | "recharge"
  | "chalk"
  | "fistbump"
  | "zen"
  | "music"
  | "hotiron"
  | "stretch"
  | "dance"
  | "pulse"
  | "stopwatch"
  | "crown"
  | "levelup"
  | "towel";

export type RestPhrase = readonly [headline: string, subtitle: string];

export type RestAnimationSpec = {
  id: RestAnimationId;
  badge: string;
  phrases: readonly RestPhrase[];
  finalPhrase: RestPhrase;
};

/** A partir de este descanso (en segundos) se despliega automáticamente la tarjeta motivacional. */
export const LONG_REST_THRESHOLD_SEC = 60;

/** Últimos segundos del descanso en los que el aviso cambia a verde "¡a la barra!". */
export const FINAL_COUNTDOWN_SEC = 5;

export const REST_ANIMATIONS: readonly RestAnimationSpec[] = [
  {
    id: "hydrate",
    badge: "Bebe agua",
    phrases: [
      ["¡Serie clavada! Bebe agua, no seas cactus 💧", "Baja pulsaciones y vuelve a por la siguiente con todo."],
      ["Hidratación = +5 % de fuerza (fuente: créeme)", "Un buen trago ahora y la siguiente serie vuela."],
      ["¡Muy bien hecha! Suelta los hombros y respira", "El músculo crece cuando recuperas bien."],
    ],
    finalPhrase: ["¡Suelta el shaker, quedan 5 s!", "Manos a la barra, que esta también cae 💪"],
  },
  {
    id: "recharge",
    badge: "Recargando ATP",
    phrases: [
      ["¡Muy bien hecha esa! Recargando ATP… ⚡", "Respira hondo, tus músculos están subiendo de nivel."],
      ["Cargando energía… no tengas prisa, crack", "Un buen descanso ahora = más kilos luego."],
      ["Inhala fuerza, exhala agujetas 🔋", "Deja que baje el pulso y volvemos al ataque."],
    ],
    finalPhrase: ["¡Batería al 100 %! ⚡", "Energía a tope, a reventar la siguiente serie."],
  },
  {
    id: "chalk",
    badge: "Sécate y dale",
    phrases: [
      ["¡Brutal esa serie! Sécate el sudor de campeón 🙌", "Un poco de magnesio mental y volvemos."],
      ["Eso no fue una serie, fue una obra de arte", "Sacude los brazos que aún te queda gasolina."],
      ["Modo bestia en enfriamiento controlado ❄️", "Respira lento, la siguiente es tuya."],
    ],
    finalPhrase: ["¡Manos secas, agarre al 100 %!", "Palmada de magnesio y ¡a por ella! 🔥"],
  },
  {
    id: "fistbump",
    badge: "¡Serie al bolsillo!",
    phrases: [
      ["¡Pum! Serie al bolsillo, qué máquina 👊", "Descansa tranquilo, la siguiente tampoco se libra."],
      ["Venga, ¡que te estás poniendo fuerte!", "Aprovecha el descanso, que te lo has ganado."],
      ["Chócala. Otro ladrillo más en el muro 💪", "Respira y visualiza la siguiente serie."],
    ],
    finalPhrase: ["¡Último aviso, campeón!", "Toca volver al hierro en 5, 4, 3… 🚀"],
  },
  {
    id: "zen",
    badge: "Zen de titán",
    phrases: [
      ["Inhala fuerza, exhala excusas 🧘", "Baja pulsaciones despacio, que luego toca sufrir bonito."],
      ["Zen por fuera, bestia por dentro", "Respira profundo 4 segundos, suelta en 4."],
    ],
    finalPhrase: ["¡Ojos abiertos, modo titán!", "Fin de la paz interior, toca levantar hierro ⚡"],
  },
  {
    id: "music",
    badge: "Modo temazo",
    phrases: [
      ["Pon el temazo que viene la serie buena 🎧", "Subir el volumen equivale a +10 kg mentales."],
      ["Busca el estribillo justo para la primera repe", "Descansa al ritmo del bajo y a romperla."],
    ],
    finalPhrase: ["¡Que rompa el drop en 5 segundos!", "Cascos firmes y a comerte la barra 🔥"],
  },
  {
    id: "hotiron",
    badge: "Hierro echando humo",
    phrases: [
      ["Has dejado las mancuernas echando humo 🔥", "Deja que se enfríe el hierro un minuto, bestia."],
      ["Ojo que derrites el suelo del gimnasio", "Menuda serie te acabas de marcar."],
    ],
    finalPhrase: ["El hierro ya está templado… ¡vuelve!", "A dejarlas echando humo otra vez 💪"],
  },
  {
    id: "stretch",
    badge: "Estira y suelta",
    phrases: [
      ["Suelta los trapecios, no los lleves de pendientes ✨", "Un estiramiento rápido mientras baja el pulso."],
      ["Cuerpo suelto = técnica fina en la siguiente", "Sacude brazos y relaja el cuello."],
    ],
    finalPhrase: ["¡Cuerpo engrasado y listo!", "Posición firme que salimos en 5 s 💪"],
  },
  {
    id: "dance",
    badge: "Baile de victoria",
    phrases: [
      ["Un pasito de victoria, que nadie te mira 🕺", "Si la serie sale así de bien, se celebra."],
      ["Flow de gimnasio nivel leyenda", "Aprovecha el descanso para disfrutar lo pro que eres."],
    ],
    finalPhrase: ["¡Se acabó el baile, vuelve el rock!", "A por la siguiente con el mismo flow 🚀"],
  },
  {
    id: "pulse",
    badge: "Pulso de acero",
    phrases: [
      ["Tu corazón dice: «dame un minuto y te doy oro» ❤️", "Bajando pulsaciones para rendir al 100 %."],
      ["Motor en enfriamiento turbo", "Latido firme, respiración controlada."],
    ],
    finalPhrase: ["¡Pulso en zona verde!", "Sistema listo para despegar ⚡"],
  },
  {
    id: "stopwatch",
    badge: "Tic-tac del banco",
    phrases: [
      ["Tic-tac… el móvil no cuenta como serie, eh ⏱️", "Disfruta el descanso, que vuela más rápido de lo que parece."],
      ["Descanso medido al milímetro", "Ni un segundo de menos, ni diez minutos scrolleando."],
    ],
    finalPhrase: ["¡Riiing! Se acabó el recreo ⏱️", "Deja el móvil y a la carga."],
  },
  {
    id: "crown",
    badge: "Corona de campeón",
    phrases: [
      ["No se te caiga la corona entre series 👑", "Qué nivel estás demostrando hoy."],
      ["Dueño y señor de la sala de musculación", "Descansa como la realeza del hierro."],
    ],
    finalPhrase: ["¡Ajústate la corona, campeón!", "La siguiente serie lleva tu nombre 👑"],
  },
  {
    id: "levelup",
    badge: "¡Sube de nivel!",
    phrases: [
      ["+10 XP en fuerza desbloqueados ⬆️", "Cada serie bien descansada suma el doble."],
      ["Subiendo estadísticas mientras recuperas aire", "Nivel de disciplina: máximo."],
    ],
    finalPhrase: ["¡Nuevo nivel listo para estrenar!", "Vamos a por el siguiente jefe final 🚀"],
  },
  {
    id: "towel",
    badge: "Toalla al viento",
    phrases: [
      ["¡Que ruja la grada, menudo serión! 🏟️", "Aplauso merecido. Recupera y repite."],
      ["El público en pie esperando la siguiente", "Respira hondo que estás en modo estadio."],
    ],
    finalPhrase: ["¡Todos en pie, quedan 5 segundos!", "Sal al campo y hazlo tuyo 🔥"],
  },
];

export const REST_ANIMATION_BY_ID: Record<RestAnimationId, RestAnimationSpec> = Object.fromEntries(
  REST_ANIMATIONS.map((a) => [a.id, a]),
) as Record<RestAnimationId, RestAnimationSpec>;

export type RestRotationState = {
  seenIds: RestAnimationId[];
  lastId: RestAnimationId | null;
};

export type RestMoment = {
  animationId: RestAnimationId;
  phraseIndex: number;
};

export const EMPTY_REST_ROTATION: RestRotationState = {
  seenIds: [],
  lastId: null,
};

export function shouldExpandRest(restSeconds: number): boolean {
  return restSeconds >= LONG_REST_THRESHOLD_SEC;
}

/**
 * Rota aleatoriamente entre las 14 animaciones sin repetir ninguna hasta
 * completar el ciclo entero, y al reiniciar evita repetir la última mostrada.
 */
export function pickNextRestMoment(
  state: RestRotationState,
  rng: () => number = Math.random,
): { moment: RestMoment; nextState: RestRotationState } {
  const seenSet = new Set(state.seenIds);
  let pool = REST_ANIMATIONS.filter((a) => !seenSet.has(a.id));
  let resetCycle = false;

  if (pool.length === 0) {
    resetCycle = true;
    pool = REST_ANIMATIONS.filter((a) => a.id !== state.lastId);
    if (pool.length === 0) pool = [...REST_ANIMATIONS];
  }

  const chosen = pool[Math.floor(rng() * pool.length) % pool.length] ?? REST_ANIMATIONS[0];
  const phraseIndex = Math.floor(rng() * chosen.phrases.length) % chosen.phrases.length;

  return {
    moment: { animationId: chosen.id, phraseIndex },
    nextState: {
      seenIds: resetCycle ? [chosen.id] : [...state.seenIds, chosen.id],
      lastId: chosen.id,
    },
  };
}
