import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PuzzleEngine,
  economy,
  positions,
  type Session,
} from "../game/crossword-engine";
import {
  onlinePuzzles,
  SURPRISE_THEME,
  pickOnlinePuzzle,
  themeOfPuzzle,
  cleanCode,
  inviteText,
  flip,
  newCode,
  onlinePuzzle,
  roomPuzzle,
  sessionKeyOf,
  startOnline,
  toShared,
  toView,
  type OnlineRoom,
} from "../game/online";
import { memoryBackend, setOnlineBackend } from "../services/online";
import { initialPlayer } from "../services/repository";
import { usePlayer } from "../stores/player";
import { OnlineLobby, OnlineMatch } from "../features/OnlinePage";

vi.mock("../services/repository", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../services/repository")>();
  return {
    ...mod,
    repository: { load: vi.fn(), save: vi.fn().mockResolvedValue(undefined) },
  };
});

const puzzle = onlinePuzzles()[0];
const engine = new PuzzleEngine(puzzle);

/** Coloca uma letra certa do banco numa casa e confirma: a vez de um jogador, como a tela faz. */
function playOne(received: Session) {
  // Como a tela faz ao receber a vez: garante que há ao menos uma letra útil na mão.
  const view = engine.rack.ensurePlayable(received);
  for (const word of puzzle.words)
    for (const cell of positions(word)) {
      if (view.letters[cell.key]) continue;
      const tile = view.rack.find(
        (id) => view.tiles[id].letter === cell.letter,
      );
      if (!tile) continue;
      const placed = engine.insert(view, word.id, tile, cell.key);
      const r = engine.confirm(placed, "p");
      const versus = r.session.versus;
      return {
        cell: cell.key,
        letter: cell.letter,
        word,
        gained: r.gained,
        next: {
          ...r.session,
          versus: {
            ...versus,
            turn: engine.complete(r.session) ? versus.turn : ("ai" as const),
            rngCount: versus.rngCount + 1,
          },
        },
      };
    }
  throw new Error("Sem jogada possível");
}

describe("regras do duelo ao vivo", () => {
  it("o código é curto, sem letras que se confundem, e aceita o que o jogador digita", () => {
    const code = newCode();
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(cleanCode(" ab-c 23 4x ")).toBe("ABC234");
    expect(sessionKeyOf("ABC234")).toBe("online:ABC234");
  });

  it("a partida começa sem curinga e com as duas mãos cheias", () => {
    const s = startOnline(puzzle.id, "semente");
    expect(Object.values(s.tiles).some((t) => t.joker)).toBe(false);
    expect(s.rack).toHaveLength(economy.rackStart);
    expect(s.botRack).toHaveLength(economy.rackStart);
    expect(engine.rack.audit(s)).toEqual([]);
    expect(onlinePuzzle(puzzle.id)).toBe(puzzle);
  });

  it("o convidado vê a partida espelhada, e espelhar duas vezes devolve a original", () => {
    const s = startOnline(puzzle.id, "semente");
    const guest = flip(s);
    expect(guest.rack).toEqual(s.botRack);
    expect(guest.botRack).toEqual(s.rack);
    expect(guest.versus.turn).toBe("ai");
    expect(flip(guest)).toEqual(toShared(s, "host"));
    expect(toView(s, "host")).toBe(s);
    expect(engine.rack.audit(guest)).toEqual([]);
  });

  it("uma jogada do host aparece para o convidado como jogada do rival, e vice-versa", () => {
    const start = startOnline(puzzle.id, "semente");
    const host = playOne(toView(start, "host"));
    const shared = toShared(host.next, "host");
    const guestView = toView(shared, "guest");
    expect(guestView.owners[host.cell]).toBe("ai");
    expect(guestView.scores.ai).toBe(host.next.scores.p);
    expect(guestView.versus.turn).toBe("p");
    expect(guestView.rack).toHaveLength(economy.rackStart);

    const guest = playOne(guestView);
    const back = toView(toShared(guest.next, "guest"), "host");
    expect(back.owners[guest.cell]).toBe("ai");
    expect(back.owners[host.cell]).toBe("p");
    expect(back.scores).toEqual({
      p: host.next.scores.p,
      ai: guest.next.scores.p,
    });
    expect(back.versus.turn).toBe("p");
    expect(back.versus.rngCount).toBe(2);
    expect(engine.rack.audit(back)).toEqual([]);
  });

  it("dois jogadores jogando por turnos fecham a grade inteira sem quebrar as regras", () => {
    let shared = toShared(startOnline(puzzle.id, "semente"), "host");
    let role: "host" | "guest" = "host";
    let turns = 0;
    while (!engine.complete(shared) && turns < 400) {
      const view = toView(shared, role);
      expect(view.versus.turn).toBe("p");
      shared = toShared(playOne(view).next, role);
      expect(engine.rack.audit(shared)).toEqual([]);
      role = role === "host" ? "guest" : "host";
      turns++;
    }
    expect(engine.complete(shared)).toBe(true);
    const total = shared.scores.p + shared.scores.ai;
    expect(total).toBeGreaterThanOrEqual(shared.locked.length);
  });
});

describe("servidor em memória", () => {
  const room = (): OnlineRoom => ({
    code: "ABC234",
    puzzleId: puzzle.id,
    host: { uid: "h", name: "Gil", avatar: "jogador" },
    status: "waiting",
    rev: 0,
    state: startOnline(puzzle.id, "semente"),
  });

  it("não cria duas salas com o mesmo código e só aceita dois jogadores", async () => {
    const mem = memoryBackend();
    expect(await mem.as("h").create(room())).toBe(true);
    expect(await mem.as("h").create(room())).toBe(false);
    const bia = { uid: "g", name: "Bia", avatar: "panda" };
    expect(await mem.as("g").join("ZZZZZZ", bia)).toEqual({
      ok: false,
      reason: "missing",
    });
    const joined = await mem.as("g").join("ABC234", bia);
    expect(joined.ok && joined.room.status).toBe("playing");
    // Quem já está na sala pode voltar; um terceiro não entra.
    expect((await mem.as("g").join("ABC234", bia)).ok).toBe(true);
    expect(
      await mem.as("x").join("ABC234", { uid: "x", name: "Zé", avatar: "" }),
    ).toEqual({ ok: false, reason: "full" });
  });

  it("recusa uma jogada fora de ordem", async () => {
    const mem = memoryBackend();
    await mem.as("h").create(room());
    await mem.as("g").join("ABC234", { uid: "g", name: "Bia", avatar: "" });
    const current = mem.rooms.get("ABC234")!;
    const move = playOne(current.state).next;
    expect(
      await mem
        .as("h")
        .play({ ...current, rev: 2, state: toShared(move, "host") }),
    ).toBe(false);
    expect(
      await mem
        .as("h")
        .play({ ...current, rev: 1, state: toShared(move, "host") }),
    ).toBe(true);
    expect(
      await mem
        .as("h")
        .play({ ...current, rev: 1, state: toShared(move, "host") }),
    ).toBe(false);
    expect(mem.rooms.get("ABC234")!.rev).toBe(1);
  });
});

describe("telas do duelo ao vivo", () => {
  let mem: ReturnType<typeof memoryBackend>;
  beforeEach(() => {
    mem = memoryBackend();
    setOnlineBackend(mem.as("host"));
    // Sorteio fixo: a sala criada pela tela usa sempre a primeira grade.
    vi.spyOn(Math, "random").mockReturnValue(0);
    usePlayer.setState({
      player: {
        ...structuredClone(initialPlayer),
        name: "Gil",
        tutorialDone: true,
        tourDone: true,
        animations: false,
        sound: false,
        vibration: false,
      },
      ready: true,
    });
  });
  afterEach(() => {
    cleanup();
    setOnlineBackend(undefined);
    vi.restoreAllMocks();
  });
  const open = (path = "/online") =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="online" element={<OnlineLobby />} />
          <Route path="online/:code" element={<OnlineMatch />} />
        </Routes>
      </MemoryRouter>,
    );
  const bia = { uid: "guest", name: "Bia", avatar: "panda" };
  /** Cria a partida pela tela e devolve o código mostrado na sala de espera. */
  async function createRoom() {
    open();
    fireEvent.click(screen.getByRole("button", { name: "Criar partida" }));
    await screen.findByRole("heading", { name: "Chame seu amigo" });
    return [...mem.rooms.keys()][0];
  }

  it("quem cria escolhe o tema: a grade sorteada é dele e a sala de espera diz qual é", async () => {
    open();
    // Surpresa vem marcada; os quatro temas do Casual completam as opções.
    expect(screen.getAllByRole("radio")).toHaveLength(5);
    expect(screen.getByRole("radio", { name: "Surpresa" })).toBeChecked();
    fireEvent.click(screen.getByRole("radio", { name: "Natureza" }));
    expect(screen.getByRole("radio", { name: "Natureza" })).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Criar partida" }));
    await screen.findByRole("heading", { name: "Chame seu amigo" });
    const room = [...mem.rooms.values()][0];
    expect(room.puzzleId).toMatch(/^casual-natureza-/);
    expect(screen.getByText("Natureza")).toBeInTheDocument();
  });
  it("a sala leva a grade: o convidado joga a mesma, mesmo sem ela no catálogo dele", async () => {
    const code = await createRoom();
    const room = mem.rooms.get(code)!;
    expect(room.grid).toEqual(onlinePuzzle(room.puzzleId));
    // Grade que só o anfitrião tem (conteúdo baixado mais novo): vale a da sala.
    const only = { ...structuredClone(puzzle), id: "casual-so-do-anfitriao-1" };
    expect(onlinePuzzle(only.id)).toBeUndefined();
    expect(roomPuzzle({ puzzleId: only.id, grid: only })).toBe(only);
    expect(startOnline(only.id, "s", only).puzzleId).toBe(only.id);
    // Sala antiga, sem a grade: procura pelo id no catálogo.
    expect(roomPuzzle({ puzzleId: puzzle.id })).toBe(puzzle);
  });
  it("o sorteio da grade respeita o tema; Surpresa vale para todas", () => {
    for (let i = 0; i < 20; i++)
      expect(themeOfPuzzle(pickOnlinePuzzle("comida").id)?.id).toBe("comida");
    expect(pickOnlinePuzzle(SURPRISE_THEME, () => 0)).toBe(onlinePuzzles()[0]);
    // Tema desconhecido (versão antiga do app): cai no sorteio geral.
    expect(pickOnlinePuzzle("nao-existe", () => 0)).toBe(onlinePuzzles()[0]);
    expect(themeOfPuzzle(onlinePuzzles()[0].id)).toBeUndefined();
  });
  it("criar uma partida mostra o código e espera o amigo", async () => {
    const code = await createRoom();
    expect(screen.getByLabelText(`Código ${code}`)).toHaveTextContent(code);
    expect(mem.rooms.get(code)!.status).toBe("waiting");
    expect(mem.rooms.get(code)!.host.name).toBe("Gil");
    expect(
      screen.getByRole("button", { name: /Compartilhar convite/ }),
    ).toBeInTheDocument();
    // Sem folha de compartilhar (navegador de teste), o convite e o código vão para a área de transferência.
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Compartilhar convite/ }),
    );
    expect(await screen.findByText("Convite copiado!")).toBeInTheDocument();
    expect(writeText).toHaveBeenLastCalledWith(inviteText(code));
    fireEvent.click(screen.getByRole("button", { name: /Copiar código/ }));
    expect(await screen.findByText("Código copiado!")).toBeInTheDocument();
    expect(writeText).toHaveBeenLastCalledWith(code);
  });

  it("quando o amigo entra a partida começa, e as jogadas vão e voltam", async () => {
    const code = await createRoom();
    await act(async () => {
      await mem.as("guest").join(code, bia);
    });
    await screen.findByRole("heading", { name: "Contra Bia" });
    expect(screen.getByText("DUELO AO VIVO")).toBeInTheDocument();

    // Vez do host: coloca uma letra certa e confirma pela tela.
    const start = mem.rooms.get(code)!.state;
    const mine = playOne(start);
    fireEvent.click(
      document.querySelector(`[aria-label^="Pista: ${mine.word.clue},"]`)!,
    );
    fireEvent.click(document.querySelector(`[data-cell="${mine.cell}"]`)!);
    fireEvent.click(
      screen.getAllByRole("button", {
        name: `Inserir letra ${mine.letter}`,
      })[0],
    );
    fireEvent.click(screen.getByRole("button", { name: /^Confirmar/ }));
    await waitFor(() => expect(mem.rooms.get(code)!.rev).toBe(1));
    const afterHost = mem.rooms.get(code)!;
    expect(afterHost.state.versus.turn).toBe("ai");
    expect(afterHost.state.owners[mine.cell]).toBe("p");
    expect(screen.getByText("VEZ DE BIA")).toBeInTheDocument();

    // Vez do convidado, direto no servidor: a tela do host mostra a jogada dele.
    const theirs = playOne(toView(afterHost.state, "guest"));
    await act(async () => {
      await mem.as("guest").play({
        ...afterHost,
        rev: 2,
        state: toShared(theirs.next, "guest"),
      });
    });
    await waitFor(() =>
      expect(screen.getByText(/Bia confirmou 1 letra/)).toBeInTheDocument(),
    );
    const local = usePlayer.getState().player.sessions[sessionKeyOf(code)];
    expect(local.versus.turn).toBe("p");
    expect(local.owners[theirs.cell]).toBe("ai");
    expect(local.scores.ai).toBe(theirs.next.scores.p);
  });

  it("entrar com um código errado avisa, e com o certo abre a partida", async () => {
    await mem.as("amigo").create({
      code: "ABC234",
      puzzleId: puzzle.id,
      host: { uid: "amigo", name: "Bia", avatar: "panda" },
      status: "waiting",
      rev: 0,
      state: startOnline(puzzle.id, "semente"),
    });
    open();
    fireEvent.click(screen.getByRole("tab", { name: "Entrar com código" }));
    const input = screen.getByLabelText("Código da partida");
    fireEvent.change(input, { target: { value: "zzz999" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não achei nenhuma partida com esse código.",
    );
    fireEvent.change(input, { target: { value: "abc 234" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    await screen.findByRole("heading", { name: "Contra Bia" });
    expect(mem.rooms.get("ABC234")!.guest?.name).toBe("Gil");
    // O convidado espera: a primeira vez é de quem criou.
    expect(screen.getByText("VEZ DE BIA")).toBeInTheDocument();
  });

  it("se o amigo abandona, quem ficou vence e recebe as moedas uma vez só", async () => {
    const code = await createRoom();
    await act(async () => {
      await mem.as("guest").join(code, bia);
    });
    await screen.findByRole("heading", { name: "Contra Bia" });
    const before = usePlayer.getState().player.coins;
    await act(async () => {
      await mem.as("guest").abandon(code, "guest");
    });
    await screen.findByRole("heading", { name: "Vitória!" });
    expect(usePlayer.getState().player.coins).toBe(before + economy.duel.win);
    expect(usePlayer.getState().player.duels[sessionKeyOf(code)]).toBe("win");
  });
});
