/**
 * Efeitos sonoros sintetizados com WebAudio: sem arquivos de áudio, funcionam offline e no APK.
 * Cada efeito é uma lista curta de notas; o contexto é criado (e retomado) no primeiro toque.
 */
interface Note {
  /** Frequência em Hz. */
  f: number;
  /** Início, em segundos a partir de agora. */
  t: number;
  /** Duração em segundos. */
  d: number;
  type?: OscillatorType;
  /** Volume de pico (0–1). */
  v?: number;
  /** Frequência final, para deslizar o tom. */
  to?: number;
}

const C5 = 523.25;
const E5 = 659.25;
const G5 = 783.99;
const C6 = 1046.5;

export const EFFECTS = {
  /** Peça colocada no tabuleiro. */
  place: (): Note[] => [{ f: 660, t: 0, d: 0.07, type: "triangle", v: 0.1 }],
  /** Letra pendente substituída por outra. */
  replace: (): Note[] => [
    { f: 520, t: 0, d: 0.06, type: "triangle", v: 0.09 },
    { f: 700, t: 0.06, d: 0.07, type: "triangle", v: 0.09 },
  ],
  /** Peça devolvida ao banco. */
  remove: (): Note[] => [
    { f: 480, t: 0, d: 0.09, type: "triangle", v: 0.08, to: 320 },
  ],
  /** ✓ com letras certas: sobe um degrau por letra confirmada. */
  correct: (n = 1): Note[] =>
    Array.from({ length: Math.min(n, 5) }, (_, i) => ({
      f: 523.25 * 2 ** ((i * 2) / 12),
      t: i * 0.08,
      d: 0.12,
      type: "sine" as const,
      v: 0.13,
    })),
  /** Palavra completada (bônus). */
  word: (): Note[] =>
    [C5, E5, G5, C6].map((f, i) => ({
      f,
      t: i * 0.07,
      d: 0.16,
      type: "triangle" as const,
      v: 0.12,
    })),
  /** ✓ sem nenhuma letra certa. */
  wrong: (): Note[] => [
    { f: 220, t: 0, d: 0.18, type: "sawtooth", v: 0.08, to: 150 },
  ],
  /** Passar a vez. */
  pass: (): Note[] => [{ f: 400, t: 0, d: 0.1, type: "sine", v: 0.08 }],
  /** Dica ou Palavra. */
  hint: (): Note[] =>
    [880, 1175, 1568].map((f, i) => ({
      f,
      t: i * 0.06,
      d: 0.1,
      type: "sine" as const,
      v: 0.09,
    })),
  /** Trocar peças. */
  swap: (): Note[] =>
    [440, 554, 440, 622].map((f, i) => ({
      f,
      t: i * 0.05,
      d: 0.06,
      type: "square" as const,
      v: 0.05,
    })),
  /** Compra de uma peça (+). */
  buy: (): Note[] => [
    { f: 988, t: 0, d: 0.08, type: "square", v: 0.06 },
    { f: 1319, t: 0.08, d: 0.14, type: "square", v: 0.06 },
  ],
  /** Ação recusada (sem moedas, casa inválida). */
  error: (): Note[] => [
    { f: 200, t: 0, d: 0.09, type: "square", v: 0.06 },
    { f: 200, t: 0.12, d: 0.09, type: "square", v: 0.06 },
  ],
  /** O oponente pontuou. */
  botMove: (n = 1): Note[] =>
    Array.from({ length: Math.min(n, 4) }, (_, i) => ({
      f: 330 * 2 ** ((i * 3) / 12),
      t: i * 0.09,
      d: 0.12,
      type: "triangle" as const,
      v: 0.1,
    })),
  /** O oponente passou a vez. */
  botPass: (): Note[] => [
    { f: 300, t: 0, d: 0.12, type: "sine", v: 0.07, to: 240 },
  ],
  win: (): Note[] =>
    [C5, E5, G5, C6, G5, C6].map((f, i) => ({
      f,
      t: i * 0.11,
      d: i > 3 ? 0.3 : 0.14,
      type: "triangle" as const,
      v: 0.14,
    })),
  draw: (): Note[] => [
    { f: G5, t: 0, d: 0.16, type: "triangle", v: 0.11 },
    { f: G5, t: 0.2, d: 0.2, type: "triangle", v: 0.11 },
  ],
  lose: (): Note[] =>
    [392, 349, 330, 262].map((f, i) => ({
      f,
      t: i * 0.14,
      d: 0.2,
      type: "sawtooth" as const,
      v: 0.07,
    })),
} satisfies Record<string, (n?: number) => Note[]>;

export type EffectName = keyof typeof EFFECTS;

/** Os volumes das notas são relativos; no celular precisam de ganho extra para serem audíveis. */
const GAIN_SCALE = 3.5;
const MAX_GAIN = 0.85;

type AudioGraph = { c: AudioContext; out: AudioNode };
let graph: AudioGraph | undefined;
const audio = () => {
  try {
    const Ctx: typeof AudioContext | undefined =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return undefined;
    if (!graph) {
      const c = new Ctx();
      // O compressor evita estalos quando várias notas somam volume alto.
      const out: AudioNode = c.createDynamicsCompressor?.() ?? c.destination;
      if (out !== c.destination) out.connect(c.destination);
      graph = { c, out };
    }
    return graph;
  } catch {
    return undefined; // O áudio é opcional.
  }
};

/**
 * Cria e "destrava" o áudio. Navegadores e WebViews só liberam som depois de um toque do
 * jogador, então isso roda no primeiro toque em qualquer lugar do app.
 */
export function unlockAudio() {
  const g = audio();
  if (!g) return;
  try {
    if (g.c.state === "suspended") void g.c.resume();
    const silent = g.c.createBuffer(1, 1, 22050);
    const source = g.c.createBufferSource();
    source.buffer = silent;
    source.connect(g.c.destination);
    source.start(0);
  } catch {
    /* O áudio é opcional. */
  }
}

function schedule({ c, out }: AudioGraph, name: EffectName, count?: number) {
  const start = c.currentTime;
  for (const n of EFFECTS[name](count)) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = n.type ?? "sine";
    const at = start + n.t;
    osc.frequency.setValueAtTime(n.f, at);
    if (n.to) osc.frequency.exponentialRampToValueAtTime(n.to, at + n.d);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(
      Math.min(MAX_GAIN, (n.v ?? 0.1) * GAIN_SCALE),
      at + 0.012,
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, at + n.d);
    osc.connect(gain);
    gain.connect(out);
    osc.start(at);
    osc.stop(at + n.d + 0.03);
  }
}

/** Toca o efeito se os sons estiverem ligados; nunca lança erro. */
export function playSfx(enabled: boolean, name: EffectName, count?: number) {
  if (!enabled) return;
  const g = audio();
  if (!g) return;
  try {
    if (g.c.state === "suspended") {
      // Só agenda as notas quando o contexto realmente voltar a rodar.
      void g.c
        .resume()
        .then(() => schedule(g, name, count))
        .catch(() => undefined);
      return;
    }
    schedule(g, name, count);
  } catch {
    /* O áudio é opcional. */
  }
}
