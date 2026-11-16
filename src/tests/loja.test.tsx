import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { levels } from "../data/catalog";
import { Shop } from "../features/Shop";
import { PuzzlePage } from "../features/PuzzlePage";
import {
  economy,
  PuzzleEngine,
  positions,
  type Session,
} from "../game/crossword-engine";
import { buyItem, itemCount, spendItem, VOWELS } from "../game/shop";
import { initialPlayer, type Player } from "../services/repository";
import { usePlayer } from "../stores/player";

afterEach(cleanup);

const puzzle = levels[3];
const engine = new PuzzleEngine(puzzle);
const solution = Object.fromEntries(
  puzzle.words.flatMap((w) => positions(w).map((c) => [c.key, c.letter])),
);
const fresh = () => engine.start("loja", "medio");

describe("Itens no motor", () => {
  it("curinga extra: entra no banco sem quebrar a conta das letras e acerta a casa", () => {
    let s = fresh();
    const before = s.rack.length;
    s = engine.addJoker(s)!;
    const added = s.rack.find((id) => s.tiles[id].joker)!;
    expect(added).toMatch(/^joker-\d+$/);
    expect(s.rack.length).toBe(Math.min(before + 1, economy.rackMax));
    expect(engine.rack.audit(s)).toEqual([]);
    // Coloca o curinga numa casa vazia e confirma: vira a letra certa e trava.
    const cell = Object.keys(solution).find((k) => !s.letters[k])!;
    const word = puzzle.words.find((w) =>
      positions(w).some((c) => c.key === cell),
    )!;
    s = engine.insert(s, word.id, added, cell);
    const done = engine.confirm(s, "p").session;
    expect(done.locked).toContain(cell);
    expect(done.letters[cell]).toBe(solution[cell]);
    expect(engine.rack.audit(done)).toEqual([]);
  });
  it("com o banco cheio, uma letra comum volta à reserva para dar lugar", () => {
    const s = fresh();
    expect(s.rack).toHaveLength(economy.rackMax);
    const next = engine.addJoker(s)!;
    expect(next.rack).toHaveLength(economy.rackMax);
    expect(engine.rack.audit(next)).toEqual([]);
  });
  it("vogal: só as que a grade ainda precisa e estão na reserva; a peça vem da reserva", () => {
    const s = fresh();
    const can = engine.takeable(s, VOWELS);
    expect(can.length).toBeGreaterThan(0);
    const letter = can[0];
    const next = engine.takeLetter(s, letter)!;
    expect(next.rack.some((id) => next.tiles[id].letter === letter)).toBe(true);
    expect(engine.rack.audit(next)).toEqual([]);
    // Uma letra que a grade não usa nunca vem.
    const absent = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
      .split("")
      .find((l) => !Object.values(solution).includes(l));
    if (absent) expect(engine.takeLetter(s, absent)).toBeUndefined();
  });
});

describe("Itens no duelo ao vivo", () => {
  it("o curinga comprado pelo convidado vai e volta pelo servidor e continua dele", async () => {
    const { flip } = await import("../game/online");
    // O convidado vê a partida espelhada; usa o curinga na mão dele.
    const guestView = flip(fresh());
    const withJoker = engine.addJoker(guestView)!;
    const shared = flip(withJoker);
    // No servidor (visão do anfitrião) o curinga está na mão do convidado (botRack)...
    expect(shared.botRack.some((id) => shared.tiles[id].joker)).toBe(true);
    expect(engine.rack.audit(shared)).toEqual([]);
    // ...e o anfitrião sem letra útil não fica com ele.
    const hostStuck = { ...shared, rack: [], history: [] };
    const after = engine.rack.ensurePlayable(hostStuck);
    expect(after.rack.some((id) => after.tiles[id].joker)).toBe(false);
  });
});

describe("Compra", () => {
  const p = (coins: number): Player => ({
    ...structuredClone(initialPlayer),
    coins,
  });
  it("paga e soma os usos; sem moedas, nada muda; usar gasta um", () => {
    const after = buyItem(p(100), "vogal");
    expect(after.coins).toBe(60);
    expect(itemCount(after, "vogal")).toBe(5);
    expect(buyItem(p(50), "curinga")).toEqual(p(50));
    expect(itemCount(spendItem(after, "vogal"), "vogal")).toBe(4);
    expect(spendItem(p(10), "curinga")).toEqual(p(10));
  });
  it("tela da loja: compra pelo botão e mostra os usos", async () => {
    usePlayer.setState({ player: p(70), ready: true });
    render(
      <MemoryRouter>
        <Shop />
      </MemoryRouter>,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Comprar Curinga por 60 moedas" }),
    );
    expect(usePlayer.getState().player.coins).toBe(10);
    expect(itemCount(usePlayer.getState().player, "curinga")).toBe(1);
    expect(screen.getByRole("status")).toHaveTextContent("Curinga comprado!");
    // Sem saldo para o kit (40), o botão fica desligado.
    expect(
      screen.getByRole("button", {
        name: "Comprar Kit de vogais por 40 moedas",
      }),
    ).toBeDisabled();
  });
});

describe("Itens na partida", () => {
  function openMatch(items: Player["items"]) {
    const key = `vs:${puzzle.id}:medio`;
    const session: Session = fresh();
    usePlayer.setState({
      player: {
        ...structuredClone(initialPlayer),
        tutorialDone: true,
        tourDone: true,
        animations: false,
        sound: false,
        vibration: false,
        stars: Object.fromEntries(levels.slice(0, 3).map((l) => [l.id, 1])),
        items,
        sessions: { [key]: session },
      },
      ready: true,
    });
    render(
      <MemoryRouter initialEntries={[`/play/${puzzle.id}?vs=medio`]}>
        <Routes>
          <Route path="/play/:id" element={<PuzzlePage />} />
        </Routes>
      </MemoryRouter>,
    );
    return key;
  }
  it("sem itens, a barra não mostra o botão", () => {
    openMatch(undefined);
    expect(screen.queryByRole("button", { name: /^Itens/ })).toBeNull();
  });
  it("curinga: vai para o banco e gasta um uso", async () => {
    const key = openMatch({ curinga: 2 });
    fireEvent.click(screen.getByRole("button", { name: "Itens (2)" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Usar curinga/ }));
    });
    const { player } = usePlayer.getState();
    expect(itemCount(player, "curinga")).toBe(1);
    const s = player.sessions[key];
    expect(s.rack.some((id) => s.tiles[id].joker)).toBe(true);
    // Primeira vez com curinga: o jogo apresenta a peça (mesma mensagem do curinga do jogo).
    expect(screen.getByText(/curinga ★/i)).toBeInTheDocument();
  });
  it("vogal: só as que servem ficam ligadas; a escolhida vai para o banco", async () => {
    const key = openMatch({ vogal: 3 });
    fireEvent.click(screen.getByRole("button", { name: "Itens (3)" }));
    const s0 = usePlayer.getState().player.sessions[key];
    const can = engine.takeable(s0, VOWELS);
    for (const v of VOWELS) {
      const button = screen.getByRole("button", { name: `Pegar a vogal ${v}` });
      if (can.includes(v)) expect(button).toBeEnabled();
      else expect(button).toBeDisabled();
    }
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: `Pegar a vogal ${can[0]}` }),
      );
    });
    const { player } = usePlayer.getState();
    expect(itemCount(player, "vogal")).toBe(2);
    const s = player.sessions[key];
    expect(engine.rack.audit(s)).toEqual([]);
    expect(
      screen.getByText(`A vogal ${can[0]} chegou ao seu banco.`),
    ).toBeInTheDocument();
  });
});
