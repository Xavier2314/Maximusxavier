/**
 * Maximus illustrations: one flat style for the whole app.
 *
 * Every scene is built from the same figure (round head, rounded body, line limbs) in the brand
 * blue (#305EE6) and green (#7ED321). Neutral parts use theme colours, so scenes read in light and
 * dark mode. They sit next to text that already says the same thing, so they are hidden from
 * screen readers.
 */
import type { CSSProperties, ReactNode } from "react";

const BLUE = "#305ee6";
const GREEN = "#7ed321";
const SKY = "#a9bfff";
const HAIR = "#1b110b";
const SKINS = ["#8a5232", "#5a3420", "#a0653f", "#6b3e22"] as const;
const NEUTRAL = "var(--fg-subtle)";
const CARD = "var(--surface-muted)";
const LINE = "var(--border)";

type Pt = readonly [number, number];
const path = (pts: readonly Pt[]) => `M${pts.map((p) => `${p[0]} ${p[1]}`).join(" L")}`;
const stroke = { fill: "none", strokeLinecap: "round", strokeLinejoin: "round" } as const;

// Figure coordinates: the feet stand on y = 0, the hips are at y = -30, the head at y = -74.
const LEG_L: Pt[] = [[-3, -30], [-5, -15], [-6, 0]];
const LEG_R: Pt[] = [[3, -30], [5, -15], [6, 0]];
const ARM_L: Pt[] = [[-6, -52], [-9, -38], [-8, -28]];
const ARM_R: Pt[] = [[6, -52], [9, -38], [8, -28]];
const WAVE_R: Pt[] = [[6, -52], [16, -62], [20, -76]];
const POINT_L: Pt[] = [[-6, -52], [-18, -46], [-30, -50]];

type FigureProps = {
  x: number; y: number; scale?: number; skin?: string; hair?: "short" | "bun" | "long";
  shirt?: string; pants?: string; shoes?: string;
  armL?: Pt[]; armR?: Pt[]; legL?: Pt[]; legR?: Pt[]; children?: ReactNode;
};

function Figure({
  x, y, scale = 1, skin = SKINS[0], hair = "short", shirt = BLUE, pants = NEUTRAL, shoes = "var(--fg)",
  armL = ARM_L, armR = ARM_R, legL = LEG_L, legR = LEG_R, children,
}: FigureProps) {
  const foot = (leg: Pt[]) => leg[leg.length - 1];
  const hand = (arm: Pt[]) => arm[arm.length - 1];
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      {[legL, legR].map((leg, i) => <path key={i} d={path(leg)} {...stroke} stroke={pants} strokeWidth="7" />)}
      {[legL, legR].map((leg, i) => <ellipse key={i} cx={foot(leg)[0] + (i ? 2 : -2)} cy={foot(leg)[1]} rx="6" ry="3" fill={shoes} />)}
      <line x1="0" y1="-30" x2="0" y2="-54" stroke={shirt} strokeWidth="18" strokeLinecap="round" />
      {[armL, armR].map((arm, i) => <path key={i} d={path(arm)} {...stroke} stroke={skin} strokeWidth="5" />)}
      {[armL, armR].map((arm, i) => <circle key={i} cx={hand(arm)[0]} cy={hand(arm)[1]} r="3.5" fill={skin} />)}
      <rect x="-3" y="-66" width="6" height="8" fill={skin} />
      <circle cx="0" cy="-74" r="10" fill={skin} />
      {hair === "short" && <path d="M-10 -75 C-10 -87 10 -88 11 -77 C6 -81 -4 -82 -10 -75 Z" fill={HAIR} />}
      {hair === "bun" && <><path d="M-10 -74 C-11 -88 11 -89 11 -74 C8 -80 -6 -82 -10 -74 Z" fill={HAIR} /><circle cx="5" cy="-86" r="5" fill={HAIR} /></>}
      {hair === "long" && <path d="M-11 -74 C-12 -89 12 -89 11 -74 L12 -60 C9 -58 7 -62 7 -68 C5 -78 -5 -78 -7 -68 C-7 -62 -9 -58 -12 -60 Z" fill={HAIR} />}
      {children}
    </g>
  );
}

function Scene({ className, viewBox = "0 0 200 140", children }: { className?: string; viewBox?: string; children: ReactNode }) {
  return <svg viewBox={viewBox} className={className} aria-hidden focusable="false">{children}</svg>;
}
const Ground = ({ cx = 100, w = 80 }: { cx?: number; w?: number }) => <ellipse cx={cx} cy="131" rx={w} ry="4" fill={LINE} />;

type Props = { className?: string };
type InkProps = Props & { ink?: string };

/* ----------------------------------------------------------------------------- Home tiles */

/** Someone stepping up the stairs towards a flag: monthly goals. */
export function ClimberIllustration({ className, ink = "#000" }: InkProps) {
  return (
    <Scene className={className} viewBox="0 0 160 140">
      <rect x="56" y="104" width="104" height="36" rx="4" fill={ink} />
      <rect x="96" y="74" width="64" height="66" rx="4" fill={ink} />
      <rect x="132" y="44" width="28" height="96" rx="4" fill={ink} />
      <line x1="148" y1="10" x2="148" y2="44" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <path d="M147 10 L124 16 L147 23 Z" fill={BLUE} />
      <Figure x={86} y={104} shoes="#fff" pants="#1d2a55"
        legL={[[-2, -30], [-8, -14], [-16, 0]]} legR={[[2, -30], [12, -42], [17, -30]]}
        armL={[[-6, -52], [-12, -40], [-10, -30]]} armR={[[6, -52], [16, -62], [24, -74]]} />
    </Scene>
  );
}

/** Someone on a phone call with a speech bubble: follow-ups. */
export function CallerIllustration({ className }: Props) {
  const skin = SKINS[0];
  return (
    <Scene className={className} viewBox="0 0 140 120">
      <rect x="94" y="8" width="42" height="26" rx="13" fill="#fff" />
      <path d="M102 32 L98 42 L110 33 Z" fill="#fff" />
      {[106, 115, 124].map((cx) => <circle key={cx} cx={cx} cy="21" r="3" fill="#000" />)}
      <path d="M26 120 C26 94 46 82 66 82 C86 82 106 94 106 120 Z" fill={BLUE} />
      <rect x="60" y="66" width="12" height="18" rx="4" fill={skin} />
      <circle cx="66" cy="54" r="17" fill={skin} />
      <path d="M49 54 C46 32 84 30 84 50 C78 42 58 40 49 54 Z" fill={HAIR} />
      <path d="M96 100 L104 80 L86 62" {...stroke} stroke={BLUE} strokeWidth="12" />
      <rect x="78" y="44" width="10" height="22" rx="3" fill="#000" transform="rotate(-18 83 55)" />
      <circle cx="86" cy="62" r="6" fill={skin} />
    </Scene>
  );
}

/** Someone waving next to a map pin: checking in at the office. */
export function WaverIllustration({ className, ink = "#000" }: InkProps) {
  return (
    <Scene className={className} viewBox="0 0 140 130">
      <path d="M36 96 C24 78 12 64 12 46 a24 24 0 0 1 48 0 C60 64 48 78 36 96 Z" fill={ink} />
      <circle cx="36" cy="46" r="9" fill="#fff" />
      <ellipse cx="36" cy="100" rx="14" ry="3" fill={ink} opacity=".25" />
      <Figure x={94} y={124} shoes="#fff" pants="#1d2a55" skin={SKINS[1]} hair="bun" armR={WAVE_R} />
      <path d="M120 40 q4 4 0 8 M124 37 q6 7 0 14" {...stroke} stroke={ink} strokeWidth="2" />
    </Scene>
  );
}

/* ----------------------------------------------------------------------------- Empty states */

export type EmptyArt = "generic" | "prospects" | "tasks" | "team" | "messages" | "money";

/** A blank card with a plus, and someone pointing at it. */
function GenericScene({ className }: Props) {
  return (
    <Scene className={className}>
      <Ground />
      <rect x="30" y="14" width="88" height="112" rx="12" fill={CARD} stroke={LINE} strokeWidth="2" />
      <rect x="44" y="32" width="46" height="8" rx="4" fill={BLUE} />
      <rect x="44" y="50" width="60" height="6" rx="3" fill={LINE} />
      <rect x="44" y="64" width="50" height="6" rx="3" fill={LINE} />
      <circle cx="74" cy="100" r="13" fill={GREEN} />
      <path d="M74 94 V106 M68 100 H80" {...stroke} stroke="#000" strokeWidth="3" />
      <Figure x={156} y={128} shirt={GREEN} armL={POINT_L} />
    </Scene>
  );
}

/** A stack of contact cards, and someone checking their phone: prospects. */
function ProspectsScene({ className }: Props) {
  const cards = [{ y: 18, c: BLUE }, { y: 52, c: GREEN }, { y: 86, c: SKY }];
  return (
    <Scene className={className}>
      <Ground />
      {cards.map(({ y, c }) => (
        <g key={y}>
          <rect x="26" y={y} width="92" height="28" rx="10" fill={CARD} stroke={LINE} strokeWidth="2" />
          <circle cx="42" cy={y + 14} r="7" fill={c} />
          <rect x="56" y={y + 8} width="44" height="5" rx="2.5" fill="var(--fg-muted)" />
          <rect x="56" y={y + 17} width="30" height="4" rx="2" fill={LINE} />
        </g>
      ))}
      <Figure x={156} y={128} skin={SKINS[2]} hair="long" shirt={BLUE}
        armL={[[-6, -52], [-10, -40], [-16, -48]]} armR={[[6, -52], [2, -42], [-12, -50]]}>
        <rect x="-21" y="-60" width="11" height="17" rx="2.5" fill={GREEN} />
      </Figure>
    </Scene>
  );
}

/** A clipboard with two items ticked and one to go: tasks, goals, evaluations. */
function TasksScene({ className }: Props) {
  const rows = [{ y: 46, done: true }, { y: 72, done: true }, { y: 98, done: false }];
  return (
    <Scene className={className}>
      <Ground />
      <rect x="28" y="16" width="86" height="110" rx="12" fill={CARD} stroke={LINE} strokeWidth="2" />
      <rect x="54" y="10" width="34" height="14" rx="5" fill={NEUTRAL} />
      {rows.map(({ y, done }) => (
        <g key={y}>
          {done
            ? <><circle cx="46" cy={y} r="8" fill={GREEN} /><path d={`M42 ${y} l3 3 l5 -6`} {...stroke} stroke="#000" strokeWidth="2.2" /></>
            : <circle cx="46" cy={y} r="7" fill="none" stroke={NEUTRAL} strokeWidth="2" />}
          <rect x="60" y={y - 3} width={done ? 40 : 44} height="6" rx="3" fill={done ? LINE : "var(--fg-muted)"} />
        </g>
      ))}
      <Figure x={154} y={128} skin={SKINS[1]} shirt={GREEN} armL={[[-6, -52], [-18, -44], [-28, -38]]}>
        <path d="M-30 -36 L-40 -24" {...stroke} stroke={BLUE} strokeWidth="5" />
      </Figure>
    </Scene>
  );
}

/** Three people side by side, one waving: team, members, attendance. */
function TeamScene({ className }: Props) {
  return (
    <Scene className={className}>
      <Ground w={86} />
      <Figure x={58} y={128} scale={0.94} skin={SKINS[2]} shirt={GREEN} armR={WAVE_R} />
      <Figure x={142} y={128} scale={0.94} skin={SKINS[3]} hair="long" shirt={SKY} armR={[[6, -52], [14, -40], [6, -34]]} />
      <Figure x={100} y={130} skin={SKINS[1]} hair="bun" shirt={BLUE} />
    </Scene>
  );
}

/** Two chat bubbles and someone reading their phone: messages, inbox, notifications. */
function MessagesScene({ className }: Props) {
  return (
    <Scene className={className}>
      <Ground />
      <rect x="22" y="18" width="92" height="34" rx="17" fill={BLUE} />
      <path d="M34 50 L30 62 L46 51 Z" fill={BLUE} />
      <rect x="36" y="29" width="54" height="5" rx="2.5" fill="#fff" />
      <rect x="36" y="38" width="36" height="5" rx="2.5" fill="#fff" opacity=".7" />
      <rect x="46" y="70" width="80" height="30" rx="15" fill={GREEN} />
      <path d="M112 98 L118 108 L104 99 Z" fill={GREEN} />
      <rect x="58" y="80" width="46" height="5" rx="2.5" fill="#000" />
      <rect x="58" y="89" width="30" height="4" rx="2" fill="#000" opacity=".6" />
      <Figure x={164} y={128} skin={SKINS[0]} shirt={SKY}
        armL={[[-6, -52], [-10, -40], [-16, -48]]} armR={[[6, -52], [2, -42], [-12, -50]]}>
        <rect x="-21" y="-60" width="11" height="17" rx="2.5" fill={BLUE} />
      </Figure>
    </Scene>
  );
}

/** A savings jar and someone dropping a coin in: savings, contributions, orders. */
function MoneyScene({ className }: Props) {
  return (
    <Scene className={className}>
      <Ground />
      <rect x="40" y="30" width="44" height="10" rx="4" fill={NEUTRAL} />
      <path d="M36 44 Q36 40 40 40 H84 Q88 40 88 44 V118 Q88 126 80 126 H44 Q36 126 36 118 Z" fill={CARD} stroke={LINE} strokeWidth="2" />
      {[118, 110, 102, 94].map((y, i) => <ellipse key={y} cx={i % 2 ? 66 : 58} cy={y} rx="14" ry="5" fill={GREEN} stroke="#3f7d0c" strokeWidth="1.5" />)}
      <circle cx="62" cy="16" r="8" fill={GREEN} stroke="#3f7d0c" strokeWidth="1.5" />
      <path d="M62 12 V20" stroke="#3f7d0c" strokeWidth="2" strokeLinecap="round" />
      <path d="M50 8 l-4 -4 M74 8 l4 -4" {...stroke} stroke={NEUTRAL} strokeWidth="2" />
      <Figure x={140} y={128} skin={SKINS[3]} hair="bun" shirt={BLUE} armL={[[-6, -52], [-20, -62], [-34, -66]]} />
    </Scene>
  );
}

const EMPTY_SCENES: Record<EmptyArt, (p: Props) => ReactNode> = {
  generic: GenericScene, prospects: ProspectsScene, tasks: TasksScene, team: TeamScene, messages: MessagesScene, money: MoneyScene,
};

/** The picture above an empty list. */
export function EmptyIllustration({ art = "generic", className }: Props & { art?: EmptyArt }) {
  const S = EMPTY_SCENES[art];
  return <S className={className} />;
}

/* ----------------------------------------------------------------------------- Onboarding */

/** Three teammates waving hello: the welcome screen. */
export function WelcomeIllustration({ className }: Props) {
  return (
    <Scene className={className} viewBox="0 0 220 140">
      <ellipse cx="110" cy="131" rx="96" ry="4" fill="#ffffff" opacity=".12" />
      <Figure x={62} y={128} scale={0.94} skin={SKINS[2]} shirt={GREEN} pants={SKY} shoes="#fff" armR={WAVE_R} />
      <Figure x={158} y={128} scale={0.94} skin={SKINS[3]} hair="long" shirt={SKY} pants={GREEN} shoes="#fff"
        armL={[[-6, -52], [-16, -62], [-20, -76]]} />
      <Figure x={110} y={130} skin={SKINS[1]} hair="bun" shirt={BLUE} pants={SKY} shoes="#fff"
        armL={[[-6, -52], [-16, -62], [-20, -76]]} armR={WAVE_R} />
    </Scene>
  );
}

/* ----------------------------------------------------------------------------- Success */

/**
 * Someone jumping for joy beside a big tick. The tick draws itself and a few pieces of confetti
 * burst once; with reduced motion the finished picture shows straight away.
 */
export function SuccessIllustration({ className }: Props) {
  const confetti = [
    { x: 40, y: 30, dx: -16, dy: -14, c: GREEN, r: 0 }, { x: 98, y: 22, dx: 12, dy: -16, c: BLUE, r: 30 },
    { x: 112, y: 52, dx: 18, dy: -4, c: SKY, r: 60 }, { x: 30, y: 62, dx: -18, dy: 4, c: BLUE, r: 15 },
    { x: 70, y: 12, dx: 0, dy: -16, c: SKY, r: 45 }, { x: 104, y: 84, dx: 16, dy: 10, c: GREEN, r: 75 },
  ];
  return (
    <Scene className={className}>
      <style>{`
        @keyframes mx-draw { from { stroke-dashoffset: 40 } to { stroke-dashoffset: 0 } }
        @keyframes mx-pop { from { transform: scale(.6); opacity: 0 } to { transform: scale(1); opacity: 1 } }
        @keyframes mx-burst { 0% { opacity: 0; transform: translate(0,0) } 30% { opacity: 1 } 100% { opacity: 1; transform: translate(var(--dx), var(--dy)) } }
        .mx-tick-bg { transform-box: fill-box; transform-origin: center; animation: mx-pop .45s cubic-bezier(.2,.8,.2,1) both }
        .mx-tick { stroke-dasharray: 40; animation: mx-draw .5s .3s ease-out both }
        .mx-bit { animation: mx-burst .7s .35s cubic-bezier(.2,.8,.2,1) both }
      `}</style>
      <Ground />
      {confetti.map((b, i) => (
        <rect key={i} className="mx-bit" x={b.x} y={b.y} width="7" height="4" rx="1" fill={b.c}
          transform={`rotate(${b.r} ${b.x} ${b.y})`} style={{ "--dx": `${b.dx}px`, "--dy": `${b.dy}px` } as CSSProperties} />
      ))}
      <circle className="mx-tick-bg" cx="70" cy="56" r="30" fill={GREEN} />
      <path className="mx-tick" d="M56 56 l10 10 l18 -20" {...stroke} stroke="#000" strokeWidth="6" />
      <Figure x={148} y={120} skin={SKINS[0]} shirt={BLUE}
        legL={[[-3, -30], [-10, -18], [-6, -6]]} legR={[[3, -30], [10, -18], [8, -4]]}
        armL={[[-6, -52], [-14, -64], [-16, -78]]} armR={[[6, -52], [14, -64], [16, -78]]} />
    </Scene>
  );
}

/* ----------------------------------------------------------------------------- Errors */

/** Someone reading a map with a question mark: page not found. */
export function LostIllustration({ className }: Props) {
  return (
    <Scene className={className}>
      <Ground />
      <rect x="40" y="10" width="34" height="30" rx="15" fill={SKY} />
      <path d="M48 38 L46 48 L58 39 Z" fill={SKY} />
      <path d="M52 21 q0 -6 5 -6 q5 0 5 5 q0 4 -5 5 v3 M57 33 v.5" {...stroke} stroke="#000" strokeWidth="2.6" />
      <Figure x={100} y={128} skin={SKINS[1]} shirt={GREEN} armL={[[-6, -52], [-14, -44], [-22, -46]]} armR={[[6, -52], [14, -44], [22, -46]]}>
        <path d="M-30 -64 L-10 -58 L10 -64 L30 -58 L30 -30 L10 -36 L-10 -30 L-30 -36 Z" fill="#fff" stroke={LINE} strokeWidth="1.5" />
        <path d="M-10 -58 V-30 M10 -64 V-36" stroke={LINE} strokeWidth="1.5" />
        <path d="M-24 -44 q8 -10 16 -2 t16 -4" {...stroke} stroke={BLUE} strokeWidth="2.5" strokeDasharray="3 3" />
        <circle cx="20" cy="-48" r="3" fill={GREEN} />
      </Figure>
    </Scene>
  );
}

/** Someone holding up a phone with no signal: offline. */
export function OfflineIllustration({ className }: Props) {
  return (
    <Scene className={className}>
      <Ground />
      <g transform="translate(58 44)">
        {[24, 16, 8].map((r) => <path key={r} d={`M${-r} 0 A${r} ${r} 0 0 1 ${r} 0`} {...stroke} stroke={NEUTRAL} strokeWidth="4" transform={`translate(0 ${r * 0.6})`} />)}
        <circle cx="0" cy="18" r="3.5" fill={NEUTRAL} />
        <path d="M-22 -14 L22 26" {...stroke} stroke={BLUE} strokeWidth="4" />
      </g>
      <Figure x={130} y={128} skin={SKINS[2]} hair="bun" shirt={GREEN} armL={[[-6, -52], [-16, -64], [-22, -80]]}>
        <rect x="-28" y="-98" width="12" height="20" rx="2.5" fill={BLUE} />
      </Figure>
    </Scene>
  );
}

/** A locked door and someone standing outside it: no access, account not active. */
export function LockedIllustration({ className }: Props) {
  return (
    <Scene className={className}>
      <Ground />
      <rect x="32" y="14" width="70" height="114" rx="6" fill={CARD} stroke={LINE} strokeWidth="2" />
      <rect x="42" y="24" width="50" height="40" rx="3" fill="none" stroke={LINE} strokeWidth="2" />
      <rect x="42" y="72" width="50" height="46" rx="3" fill="none" stroke={LINE} strokeWidth="2" />
      <path d="M60 78 v-6 a7 7 0 0 1 14 0 v6" {...stroke} stroke={BLUE} strokeWidth="4" />
      <rect x="55" y="77" width="24" height="18" rx="4" fill={BLUE} />
      <circle cx="67" cy="85" r="2.5" fill="#fff" />
      <Figure x={146} y={128} skin={SKINS[3]} shirt={GREEN} armR={[[6, -52], [14, -42], [6, -36]]} armL={[[-6, -52], [-12, -44], [-6, -38]]} />
    </Scene>
  );
}

/** Someone tightening a bolt on a machine with a wrench: something went wrong. */
export function FixingIllustration({ className }: Props) {
  return (
    <Scene className={className}>
      <Ground />
      <rect x="26" y="52" width="80" height="74" rx="10" fill={CARD} stroke={LINE} strokeWidth="2" />
      <g transform="translate(66 89)">
        {Array.from({ length: 8 }, (_, i) => <rect key={i} x="-4" y="-22" width="8" height="10" rx="2" fill={BLUE} transform={`rotate(${i * 45})`} />)}
        <circle r="15" fill={BLUE} />
        <circle r="6" fill={CARD} />
      </g>
      <rect x="40" y="62" width="18" height="6" rx="3" fill={GREEN} />
      <Figure x={150} y={128} skin={SKINS[0]} shirt={SKY} armL={[[-6, -52], [-18, -50], [-30, -56]]}>
        <path d="M-30 -56 L-44 -64" {...stroke} stroke={NEUTRAL} strokeWidth="5" />
        <circle cx="-46" cy="-65" r="5" fill="none" stroke={NEUTRAL} strokeWidth="3.5" />
      </Figure>
    </Scene>
  );
}
