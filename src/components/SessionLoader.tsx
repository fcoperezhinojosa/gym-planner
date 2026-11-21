import "./SessionLoader.css";

export type LoaderVariant = "curl" | "flex" | "press";

const MESSAGES: Record<LoaderVariant, [string, string, string]> = {
  curl: ["Calentando motores…", "Cargando tu sesión…", "Una repe más…"],
  flex: ["Cargando tu sesión…", "Sacando bíceps…", "Casi listo…"],
  press: ["Cargando discos…", "Preparando tu plan…", "¡Arriba!"],
};

/**
 * Pantalla de carga de la primera sesión. Es solo SVG + CSS (sin estado ni efectos),
 * así que se pinta ya en el HTML del servidor, antes de hidratar.
 */
export function SessionLoader({ variant, fullscreen = true }: { variant: LoaderVariant; fullscreen?: boolean }) {
  const Art = variant === "curl" ? CurlArt : variant === "flex" ? FlexArt : PressArt;
  return (
    <div className={fullscreen ? "sl-screen" : "sl-inline"} role="status" aria-live="polite" aria-label="Cargando tu sesión">
      <Art />
      {fullscreen && <div className="sl-brand">Gym Planner</div>}
      <div className="sl-messages" aria-hidden="true">
        {MESSAGES[variant].map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>
    </div>
  );
}

function Dumbbell({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <line className="sl-iron" x1={x - 10} y1={y} x2={x + 10} y2={y} strokeWidth={4} />
      <rect className="sl-plate" x={x - 14} y={y - 8} width={6} height={16} rx={2} />
      <rect className="sl-plate" x={x + 8} y={y - 8} width={6} height={16} rx={2} />
    </g>
  );
}

/** A · Curl alterno con mancuernas. */
function CurlArt() {
  return (
    <svg className="sl-art" viewBox="0 0 200 200" aria-hidden="true">
      <ellipse className="sl-shadow" cx={100} cy={174} rx={40} ry={5} />
      <g className="sl-breath">
        <path className="sl-body" d="M100 56 V112 M100 112 L84 168 M100 112 L116 168" />
        <path className="sl-body" d="M100 66 L126 100 M100 66 L74 100" />
        <circle className="sl-head" cx={100} cy={40} r={14} />
      </g>
      <g className="sl-curlR">
        <line className="sl-body" x1={126} y1={100} x2={126} y2={128} />
        <Dumbbell x={126} y={134} />
      </g>
      <g className="sl-curlL">
        <line className="sl-body" x1={74} y1={100} x2={74} y2={128} />
        <Dumbbell x={74} y={134} />
      </g>
      <path className="sl-drop" d="M118 28 q4 6 0 9 q-4 -3 0 -9z" />
    </svg>
  );
}

/** B · Doble bíceps dentro de un anillo de progreso. */
function FlexArt() {
  return (
    <svg className="sl-art" viewBox="0 0 200 200" aria-hidden="true">
      <circle className="sl-ring" cx={100} cy={100} r={85} />
      <circle className="sl-ringFill" cx={100} cy={100} r={85} />
      <path className="sl-body" d="M100 66 V112 M100 112 L88 152 M100 112 L112 152" />
      <path className="sl-body" d="M100 74 L134 82 M100 74 L66 82" />
      <ellipse className="sl-bicep" cx={119} cy={72} rx={10} ry={8} />
      <ellipse className="sl-bicep" cx={81} cy={72} rx={10} ry={8} />
      <g className="sl-foreR">
        <line className="sl-body" x1={134} y1={82} x2={134} y2={52} />
        <circle className="sl-head" cx={134} cy={47} r={7} />
      </g>
      <g className="sl-foreL">
        <line className="sl-body" x1={66} y1={82} x2={66} y2={52} />
        <circle className="sl-head" cx={66} cy={47} r={7} />
      </g>
      <circle className="sl-head" cx={100} cy={50} r={13} />
      <g strokeDasharray="10">
        <line className="sl-spark" x1={146} y1={38} x2={154} y2={30} />
        <line className="sl-spark" x1={148} y1={50} x2={158} y2={50} />
        <line className="sl-spark" x1={136} y1={30} x2={138} y2={20} />
        <line className="sl-spark" x1={54} y1={38} x2={46} y2={30} />
        <line className="sl-spark" x1={52} y1={50} x2={42} y2={50} />
        <line className="sl-spark" x1={64} y1={30} x2={62} y2={20} />
      </g>
    </svg>
  );
}

const PRESS_TIMES = "0;0.4;0.55;0.7;0.85;1";
const PRESS_SPLINES = "0 0 1 1;.4 0 .2 1;0 0 1 1;.4 0 .2 1;0 0 1 1";

function pressArm(side: 1 | -1, up: boolean) {
  const x = (dx: number) => 100 + side * dx;
  return up ? `M100 68 L${x(18)} 44 L${x(24)} 14` : `M100 68 L${x(24)} 88 L${x(28)} 64`;
}

/** C · Press militar: se cargan los discos y luego sube la barra. */
function PressArt() {
  const arm = (side: 1 | -1) => {
    const down = pressArm(side, false);
    const up = pressArm(side, true);
    return (
      <path className="sl-body" d={down}>
        <animate
          attributeName="d"
          dur="4s"
          repeatCount="indefinite"
          calcMode="spline"
          keyTimes={PRESS_TIMES}
          keySplines={PRESS_SPLINES}
          values={[down, down, up, up, down, down].join(";")}
        />
      </path>
    );
  };
  return (
    <svg className="sl-art" viewBox="0 0 200 200" aria-hidden="true">
      <ellipse className="sl-shadow" cx={100} cy={174} rx={40} ry={5} />
      <path className="sl-body" d="M100 60 V114 M100 114 L86 168 M100 114 L114 168" />
      <circle className="sl-head" cx={100} cy={44} r={13} />
      {arm(-1)}
      {arm(1)}
      <g>
        <animateTransform
          attributeName="transform"
          type="translate"
          dur="4s"
          repeatCount="indefinite"
          calcMode="spline"
          keyTimes={PRESS_TIMES}
          keySplines={PRESS_SPLINES}
          values="0 0;0 0;0 -50;0 -50;0 0;0 0"
        />
        <line className="sl-iron sl-bar" x1={30} y1={64} x2={170} y2={64} />
        <rect className="sl-plate sl-p1" x={52} y={49} width={7} height={30} rx={2} />
        <rect className="sl-plate sl-p2" x={44} y={52} width={7} height={24} rx={2} />
        <rect className="sl-plate sl-p3" x={36} y={55} width={7} height={18} rx={2} />
        <rect className="sl-plate sl-p1" x={141} y={49} width={7} height={30} rx={2} />
        <rect className="sl-plate sl-p2" x={149} y={52} width={7} height={24} rx={2} />
        <rect className="sl-plate sl-p3" x={157} y={55} width={7} height={18} rx={2} />
      </g>
      <rect className="sl-loadBar" x={60} y={186} width={80} height={4} rx={2} />
      <rect className="sl-loadFill" x={60} y={186} width={80} height={4} rx={2} />
    </svg>
  );
}
