import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useScoreFloats } from "../features/puzzle/useScoreFloats";

afterEach(() => vi.useRealTimers());

const card = () => {
  const el = document.createElement("div");
  for (const k of ["0,0", "0,1", "0,2", "0,3", "0,4"]) {
    const c = document.createElement("span");
    c.dataset.cell = k;
    el.append(c);
  }
  return { current: el };
};

describe("Pontos flutuantes ao fechar uma palavra", () => {
  it("uma letra que fecha a palavra mostra o selo com o total da palavra, e a palavra toda brilha em ordem", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useScoreFloats(card(), true));
    // Última letra de uma palavra de 5: 1 da letra + 4 do resto da palavra.
    act(() =>
      result.current.popScore(["0,4"], 1, 4, "p", [
        "0,0",
        "0,1",
        "0,2",
        "0,3",
        "0,4",
      ]),
    );
    // Um selo só, com o total (letra + resto da palavra); nada de "+1" solto.
    expect(result.current.floats).toEqual([]);
    expect(result.current.bursts).toHaveLength(1);
    expect(result.current.bursts[0]).toMatchObject({ points: 5, owner: "p" });
    // A palavra acende na ordem das casas.
    expect(result.current.flash).toEqual(["0,0", "0,1", "0,2", "0,3", "0,4"]);
    act(() => void vi.advanceTimersByTime(2000));
    expect(result.current.bursts).toEqual([]);
    expect(result.current.flash).toEqual([]);
  });
  it("letras soltas, sem fechar palavra, mostram só '+N' das letras", () => {
    const { result } = renderHook(() => useScoreFloats(card(), true));
    act(() => result.current.popScore(["0,1", "0,2"], 2, 0, "ai"));
    expect(result.current.floats).toHaveLength(1);
    expect(result.current.floats[0]).toMatchObject({ text: "+2", kind: "ai" });
    expect(result.current.bursts).toEqual([]);
    expect(result.current.flash).toEqual(["0,1", "0,2"]);
  });
});
