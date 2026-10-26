import { beforeEach, describe, expect, it, vi } from "vitest";
import { initialPlayer } from "../services/repository";

class FakeAudio {
  static made: FakeAudio[] = [];
  loop = false;
  volume = 1;
  preload = "";
  paused = true;
  play = vi.fn(() => {
    this.paused = false;
    return Promise.resolve();
  });
  pause = vi.fn(() => {
    this.paused = true;
  });
  constructor(public src: string) {
    FakeAudio.made.push(this);
  }
}

describe("Música de fundo", () => {
  beforeEach(() => {
    FakeAudio.made = [];
    vi.resetModules();
    vi.stubGlobal("Audio", FakeAudio);
  });
  it("vem ligada por padrão", () => {
    expect(initialPlayer.music).toBe(true);
  });
  it("toca em loop a faixa do jogo, com volume baixo, e pausa ao desligar", async () => {
    const { setMusic, MUSIC_SRC } = await import("../services/music");
    setMusic(true);
    const [track] = FakeAudio.made;
    expect(track.src).toBe(MUSIC_SRC);
    expect(MUSIC_SRC).toContain("where-the-river-bends");
    expect(track.loop).toBe(true);
    expect(track.volume).toBeLessThan(0.6);
    expect(track.play).toHaveBeenCalled();
    setMusic(false);
    expect(track.pause).toHaveBeenCalled();
  });
  it("retoma no toque se o navegador bloqueou, mas não quando está desligada", async () => {
    const { setMusic, resumeMusic } = await import("../services/music");
    setMusic(true);
    const [track] = FakeAudio.made;
    track.paused = true;
    track.play.mockClear();
    resumeMusic();
    expect(track.play).toHaveBeenCalledTimes(1);
    setMusic(false);
    track.play.mockClear();
    resumeMusic();
    expect(track.play).not.toHaveBeenCalled();
  });
});
