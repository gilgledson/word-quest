/**
 * Partículas com PixiJS (WebGL) por cima da tela inteira: brilhos que saem das casas da palavra
 * fechada, confete no selo e estrelas com rastro voando até o placar. O PixiJS só é baixado na
 * primeira palavra fechada (import dinâmico); a tela fica transparente, não recebe toques e o
 * ticker para quando não há partículas.
 *
 * Coordenadas sempre da janela (getBoundingClientRect).
 */
import type { Application, Container, Sprite, Texture } from "pixi.js";

type Point = { x: number; y: number };
interface Particle {
  sprite: Sprite;
  vx: number;
  vy: number;
  gravity: number;
  drag: number;
  spin: number;
  life: number;
  age: number;
  scale: number;
  /** Partícula que segue uma curva até um alvo (estrela indo para o placar). */
  path?: { from: Point; ctrl: Point; to: Point; onArrive?: () => void };
  /** Solta rastro de brilhos enquanto anda. */
  trail?: boolean;
  fade: "out" | "late";
}
export interface Particles {
  /** Brilhos dourados saindo de cada casa, em sequência (a palavra "acende"). */
  sparkle(cells: DOMRect[], tint: number): void;
  /**
   * Confete colorido: dois canhões nas laterais do selo (`at` é o centro, `spread` a meia-largura),
   * atirando para fora e para cima, para não cobrir o número.
   */
  confetti(at: Point, spread: number): void;
  /** Estrelas com rastro do ponto até o alvo; `onArrive` na primeira que chega. */
  fly(from: Point, to: Point, tint: number, onArrive?: () => void): void;
}

const CONFETTI = [0xff5fa2, 0xffd23c, 0x3fb7ff, 0x7ad94f, 0xff8a3d, 0xb46bff];
let ready: Promise<Particles | undefined> | undefined;

/** As partículas (carrega o PixiJS na primeira chamada); `undefined` sem WebGL ou em testes. */
export function getParticles() {
  ready ??= create().catch(() => undefined);
  return ready;
}

async function create(): Promise<Particles | undefined> {
  if (typeof window === "undefined" || /jsdom/i.test(navigator.userAgent))
    return undefined;
  const PIXI = await import("pixi.js");
  const app: Application = new PIXI.Application();
  await app.init({
    backgroundAlpha: 0,
    resizeTo: window,
    antialias: true,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    preference: "webgl",
  });
  const canvas = app.canvas;
  canvas.className = "fx-particles";
  canvas.setAttribute("aria-hidden", "true");
  document.body.append(canvas);

  // Texturas desenhadas uma vez: estrela, brilho redondo suave e papel de confete.
  const draw = (g: InstanceType<typeof PIXI.Graphics>) => {
    const t = app.renderer.generateTexture({ target: g, resolution: 2 });
    g.destroy();
    return t;
  };
  const star: Texture = draw(
    new PIXI.Graphics()
      .star(0, 0, 5, 12, 5.5)
      .fill(0xffffff)
      .stroke({ width: 1.5, color: 0xffffff, alpha: 0.6 }),
  );
  const glowG = new PIXI.Graphics();
  for (let r = 10; r > 0; r--)
    glowG.circle(0, 0, r).fill({ color: 0xffffff, alpha: 0.12 });
  const glow: Texture = draw(glowG);
  const paper: Texture = draw(
    new PIXI.Graphics().roundRect(-5, -3.5, 10, 7, 2).fill(0xffffff),
  );

  const layer: Container = new PIXI.Container();
  app.stage.addChild(layer);
  const live: Particle[] = [];
  app.ticker.stop();

  const spawn = (
    texture: Texture,
    at: Point,
    p: Omit<Particle, "sprite" | "age">,
    tint: number,
    blend = false,
  ) => {
    const sprite = new PIXI.Sprite(texture);
    sprite.anchor.set(0.5);
    sprite.position.set(at.x, at.y);
    sprite.tint = tint;
    sprite.scale.set(p.scale);
    sprite.rotation = Math.random() * Math.PI * 2;
    if (blend) sprite.blendMode = "add";
    layer.addChild(sprite);
    live.push({ ...p, sprite, age: 0 });
    if (!app.ticker.started) app.ticker.start();
  };

  app.ticker.add((ticker) => {
    const dt = ticker.deltaMS / 1000;
    for (let i = live.length - 1; i >= 0; i--) {
      const p = live[i];
      p.age += dt;
      const k = Math.min(1, p.age / p.life);
      const s = p.sprite;
      if (p.path) {
        // Curva de Bézier quadrática, acelerando no fim.
        const t = k * k;
        const { from, ctrl, to } = p.path;
        const x =
          (1 - t) * (1 - t) * from.x + 2 * (1 - t) * t * ctrl.x + t * t * to.x;
        const y =
          (1 - t) * (1 - t) * from.y + 2 * (1 - t) * t * ctrl.y + t * t * to.y;
        s.position.set(x, y);
        s.scale.set(p.scale * (1 - 0.45 * k));
        if (p.trail && Math.random() < 0.8)
          spawn(
            glow,
            { x, y },
            {
              vx: (Math.random() - 0.5) * 30,
              vy: (Math.random() - 0.5) * 30,
              gravity: 0,
              drag: 0.9,
              spin: 0,
              life: 0.35,
              scale: 0.5 + Math.random() * 0.4,
              fade: "out",
            },
            s.tint as number,
            true,
          );
        if (k >= 1 && p.path.onArrive) {
          p.path.onArrive();
          p.path.onArrive = undefined;
        }
      } else {
        p.vy += p.gravity * dt;
        p.vx *= Math.pow(p.drag, dt * 60);
        p.vy *= Math.pow(p.drag, dt * 60);
        s.x += p.vx * dt;
        s.y += p.vy * dt;
      }
      s.rotation += p.spin * dt;
      s.alpha = p.fade === "late" ? (k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3) : 1 - k;
      if (k >= 1) {
        layer.removeChild(s);
        s.destroy();
        live.splice(i, 1);
      }
    }
    if (!live.length) app.ticker.stop();
  });

  const later = (ms: number, fn: () => void) => window.setTimeout(fn, ms);
  return {
    sparkle(cells, tint) {
      cells.forEach((r, i) =>
        later(i * 70, () => {
          const c = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
          spawn(
            glow,
            c,
            {
              vx: 0,
              vy: 0,
              gravity: 0,
              drag: 1,
              spin: 0,
              life: 0.45,
              scale: r.width / 10,
              fade: "out",
            },
            tint,
            true,
          );
          for (let n = 0; n < 7; n++) {
            const a = Math.random() * Math.PI * 2;
            const v = 80 + Math.random() * 140;
            spawn(
              star,
              c,
              {
                vx: Math.cos(a) * v,
                vy: Math.sin(a) * v - 60,
                gravity: 260,
                drag: 0.94,
                spin: (Math.random() - 0.5) * 8,
                life: 0.7 + Math.random() * 0.3,
                scale: 0.35 + Math.random() * 0.35,
                fade: "late",
              },
              n % 3 ? tint : 0xffffff,
            );
          }
        }),
      );
    },
    confetti(at, spread) {
      for (let n = 0; n < 46; n++) {
        const side = n % 2 ? 1 : -1;
        // Ângulo para fora do selo: de "para cima" até "quase na horizontal" do lado do canhão.
        const a = -Math.PI / 2 + side * (0.25 + Math.random() * 0.9);
        const v = 260 + Math.random() * 320;
        spawn(
          paper,
          { x: at.x + side * spread, y: at.y - 10 },
          {
            vx: Math.cos(a) * v,
            vy: Math.sin(a) * v,
            gravity: 620,
            drag: 0.95,
            spin: (Math.random() - 0.5) * 14,
            life: 1.1 + Math.random() * 0.5,
            scale: 0.8 + Math.random() * 0.6,
            fade: "late",
          },
          CONFETTI[n % CONFETTI.length],
        );
      }
    },
    fly(from, to, tint, onArrive) {
      for (let n = 0; n < 5; n++)
        later(n * 70, () => {
          const ctrl = {
            x: (from.x + to.x) / 2 + (Math.random() - 0.5) * 160,
            y: Math.min(from.y, to.y) - 40 - Math.random() * 60,
          };
          spawn(
            star,
            from,
            {
              vx: 0,
              vy: 0,
              gravity: 0,
              drag: 1,
              spin: 6,
              life: 0.6,
              scale: 1.1,
              fade: "late",
              trail: true,
              path: {
                from,
                ctrl,
                to,
                onArrive: n === 0 ? onArrive : undefined,
              },
            },
            tint,
          );
        });
    },
  };
}
