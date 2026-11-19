import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
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
  boardPuzzles,
  DEFAULT_BOARD,
  pickOnlinePuzzle,
  themeSizes,
  BOARD_SIZES,
  themeOfPuzzle,
  cleanCode,
  inviteText,
  inviteReward,
  flip,
  newCode,
  onlinePuzzle,
  roomPuzzle,
  sessionKeyOf,
  startOnline,
  toShared,
  toView,
  isExpired,
  wonByForfeitOf,
  ROOM_EXPIRE_MS,
  ROOM_EXPIRED,
  type OnlineRoom,
} from "../game/online";
import { memoryBackend, setOnlineBackend } from "../services/online";
import { initialPlayer } from "../services/repository";
import { usePlayer } from "../stores/player";
import {
  OnlineLobby,
  OnlineMatch,
  OnlineSetup,
  RIVAL_OFFLINE_MS,
} from "../features/OnlinePage";

vi.mock("../services/repository", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../services/repository")>();
  return {
    ...mod,
    repository: { load: vi.fn(), save: vi.fn().mockResolvedValue(undefined) },
  };
});

// A grade que a sala sorteia com Math.random = 0 no tamanho padrão da configuração (7×7).
const puzzle = boardPuzzles(DEFAULT_BOARD)[0];
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

  it("sala parada expira sem vencedor; partida que já acabou não muda", async () => {
    const mem = memoryBackend();
    await mem.as("h").create(room());
    const created = mem.rooms.get("ABC234")!;
    expect(created.createdAt).toBeTypeOf("number");
    expect(isExpired(created)).toBe(false);
    expect(isExpired(created, created.updatedAt! + ROOM_EXPIRE_MS + 1)).toBe(
      true,
    );
    await mem.as("h").expire("ABC234");
    const expired = mem.rooms.get("ABC234")!;
    expect(expired.status).toBe("abandoned");
    expect(expired.endedBy).toBe(ROOM_EXPIRED);
    expect(expired.left).toBeUndefined();
    expect(wonByForfeitOf(expired, "h")).toBe(false);
    expect(wonByForfeitOf(expired, "g")).toBe(false);
    // Encerrada não expira de novo nem volta a ficar aberta.
    expect(isExpired(expired, Date.now() + 2 * ROOM_EXPIRE_MS)).toBe(false);
    mem.rooms.set("FIM234", { ...room(), code: "FIM234", status: "finished" });
    await mem.as("h").expire("FIM234");
    expect(mem.rooms.get("FIM234")!.status).toBe("finished");
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
          <Route path="online/nova" element={<OnlineSetup />} />
          <Route path="online/:code" element={<OnlineMatch />} />
        </Routes>
      </MemoryRouter>,
    );
  const bia = { uid: "guest", name: "Bia", avatar: "panda" };
  /** Cria a partida pela tela e devolve o código mostrado na sala de espera. */
  /** No lobby, "Configurar partida"; na configuração, as escolhas e "Criar partida". */
  async function configureAndCreate(choose?: () => void) {
    fireEvent.click(screen.getByRole("button", { name: /Configurar partida/ }));
    await screen.findByRole("heading", { name: "Configurar partida" });
    choose?.();
    fireEvent.click(screen.getByRole("button", { name: /Criar partida/ }));
    await screen.findByRole("heading", { name: "Chame seu amigo" });
  }
  async function createRoom(choose?: () => void) {
    open();
    await configureAndCreate(choose);
    return [...mem.rooms.keys()][0];
  }

  it("quem cria escolhe o tema no lobby; sem grade do tema no tamanho, a sala sai Surpresa", async () => {
    open();
    // Surpresa vem marcada; os quatro temas do Casual completam as opções.
    expect(screen.getAllByRole("radio")).toHaveLength(5);
    expect(screen.getByRole("radio", { name: "Surpresa" })).toBeChecked();
    fireEvent.click(screen.getByRole("radio", { name: "Natureza" }));
    expect(screen.getByRole("radio", { name: "Natureza" })).toBeChecked();
    await configureAndCreate();
    // Os temas só têm grades 8×10, que não é oferecido: vale uma grade da Aventura do tamanho.
    const room = [...mem.rooms.values()][0];
    expect(room.puzzleId).not.toMatch(/^casual-/);
    expect([room.grid!.cols, room.grid!.rows]).toEqual([7, 7]);
    expect(screen.getByLabelText("Regras da partida")).toHaveTextContent(
      "Tema: Surpresa",
    );
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
  it("tamanho do tabuleiro: cada um tem grades só dele; o sorteio respeita o escolhido", () => {
    for (const s of BOARD_SIZES) {
      const pool = boardPuzzles(s.id);
      expect(pool.length, s.id).toBeGreaterThan(0);
      for (const p of pool) expect([p.cols, p.rows]).toEqual([s.cols, s.rows]);
      for (let i = 0; i < 10; i++) {
        const p = pickOnlinePuzzle(SURPRISE_THEME, Math.random, s.id);
        expect([p.cols, p.rows]).toEqual([s.cols, s.rows]);
      }
    }
    // Os temas do Casual só têm o clássico; pedir outro tamanho num tema cai na grade do tema.
    expect(themeSizes("comida")).toEqual([]);
    expect(themeSizes(SURPRISE_THEME)).toEqual(BOARD_SIZES.map((s) => s.id));
    expect(
      themeOfPuzzle(pickOnlinePuzzle("comida", Math.random, "6x6").id)?.id,
    ).toBe("comida");
  });
  it("na configuração, quem cria escolhe o tamanho (médio marcado) e a sala sai com ele", async () => {
    open();
    fireEvent.click(screen.getByRole("button", { name: /Configurar partida/ }));
    await screen.findByRole("heading", { name: "Configurar partida" });
    const group = screen.getByRole("radiogroup", {
      name: "Tamanho do tabuleiro",
    });
    expect(within(group).getAllByRole("radio")).toHaveLength(4);
    expect(
      within(group).getByRole("radio", { name: /^7×7, Médio/ }),
    ).toBeChecked();
    fireEvent.click(within(group).getByRole("radio", { name: /^6×6, Rápido/ }));
    expect(
      within(group).getByRole("radio", { name: /^6×6, Rápido/ }),
    ).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: /Criar partida/ }));
    await screen.findByRole("heading", { name: "Chame seu amigo" });
    const room = [...mem.rooms.values()][0];
    expect([room.grid!.cols, room.grid!.rows]).toEqual([6, 6]);
    // A sala de espera mostra o tabuleiro escolhido nas regras.
    expect(screen.getByLabelText("Regras da partida")).toHaveTextContent(
      "Tabuleiro: 6×6 · Rápido",
    );
  });
  it("com um tema do Casual (só 8×10), a partida é Surpresa no tamanho escolhido", async () => {
    open();
    fireEvent.click(screen.getByRole("radio", { name: "Natureza" }));
    fireEvent.click(screen.getByRole("button", { name: /Configurar partida/ }));
    await screen.findByRole("heading", { name: "Configurar partida" });
    const group = screen.getByRole("radiogroup", {
      name: "Tamanho do tabuleiro",
    });
    // Quatro tamanhos, do rápido ao longo; o médio vem marcado.
    expect(within(group).getAllByRole("radio")).toHaveLength(4);
    expect(
      within(group).getByRole("radio", { name: /^7×7, Médio/ }),
    ).toBeChecked();
    expect(within(group).queryByRole("radio", { name: /^8×10/ })).toBeNull();
    expect(screen.getByText(/Tema:/)).toHaveTextContent("Tema: Surpresa");
    fireEvent.click(within(group).getByRole("radio", { name: /^6×7, Leve/ }));
    fireEvent.click(screen.getByRole("button", { name: /Criar partida/ }));
    await screen.findByRole("heading", { name: "Chame seu amigo" });
    const room = [...mem.rooms.values()][0];
    expect([room.grid!.cols, room.grid!.rows]).toEqual([6, 7]);
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

  it("sala parada há mais de um dia é encerrada ao abrir, sem vitória para ninguém", async () => {
    const code = await createRoom();
    await act(async () => {
      await mem.as("guest").join(code, bia);
    });
    await screen.findByRole("heading", { name: "Contra Bia" });
    cleanup();
    const old = Date.now() - ROOM_EXPIRE_MS - 1000;
    mem.rooms.set(code, {
      ...mem.rooms.get(code)!,
      createdAt: old,
      updatedAt: old,
    });
    const before = usePlayer.getState().player.coins;
    open(`/online/${code}`);
    await screen.findByRole("heading", { name: "Partida encerrada" });
    expect(
      screen.getByText(/ficou parada por mais de um dia/),
    ).toBeInTheDocument();
    expect(mem.rooms.get(code)!.endedBy).toBe(ROOM_EXPIRED);
    expect(usePlayer.getState().player.coins).toBe(before);
    expect(usePlayer.getState().player.activeOnline).toBeUndefined();
  });
  it("partida terminada com um amigo novo rende moedas de convite a quem criou a sala, uma vez por amigo", async () => {
    const code = await createRoom();
    // A sala de espera avisa do bônus; o convite leva o link da sala (que leva à loja sem o jogo).
    expect(screen.getByText(/Ganhe 30 moedas quando um/)).toBeInTheDocument();
    expect(inviteText(code)).toContain(`https://wordquest.com.br/c/${code}`);
    expect(inviteText(code)).toContain(`digite o código ${code}`);
    await act(async () => {
      await mem.as("guest").join(code, bia);
    });
    await screen.findByRole("heading", { name: "Contra Bia" });
    const before = usePlayer.getState().player.coins;
    const room = mem.rooms.get(code)!;
    await act(async () => {
      await mem
        .as("guest")
        .play({ ...room, rev: room.rev + 1, status: "finished" });
    });
    expect(
      await screen.findByText(/Convite recompensado: \+30/),
    ).toBeInTheDocument();
    const after = usePlayer.getState().player;
    expect(after.coins).toBe(before + economy.invite);
    expect(after.invitedFriends).toEqual(["guest"]);
  });
  it("sair sem querer: a seta pergunta antes, e a partida segue marcada para voltar", async () => {
    const code = await createRoom();
    await act(async () => {
      await mem.as("guest").join(code, bia);
    });
    await screen.findByRole("heading", { name: "Contra Bia" });
    expect(usePlayer.getState().player.activeOnline).toBe(code);
    // Cancelar a pergunta mantém na partida.
    const ask = vi.spyOn(window, "confirm").mockReturnValue(false);
    fireEvent.click(screen.getByRole("link", { name: "Voltar" }));
    expect(ask).toHaveBeenCalledOnce();
    expect(ask.mock.calls[0][0]).toContain(code);
    expect(
      screen.getByRole("heading", { name: "Contra Bia" }),
    ).toBeInTheDocument();
    // Confirmar sai para o lobby; a partida continua marcada, e o aviso no topo das telas
    // ("Partida em andamento · Voltar", ver "Aviso da partida em andamento") leva de volta.
    ask.mockReturnValue(true);
    fireEvent.click(screen.getByRole("link", { name: "Voltar" }));
    expect(
      await screen.findByRole("heading", { name: "Jogar com um amigo" }),
    ).toBeInTheDocument();
    expect(usePlayer.getState().player.activeOnline).toBe(code);
  });
  it("o amigo só pode encerrar depois de 2 minutos; quem ficou fora vê quem encerrou", async () => {
    expect(RIVAL_OFFLINE_MS).toBe(120_000);
    const code = await createRoom();
    await act(async () => {
      await mem.as("guest").join(code, bia);
    });
    await screen.findByRole("heading", { name: "Contra Bia" });
    // O amigo encerra porque o anfitrião ficou fora.
    await act(async () => {
      await mem.as("guest").abandon(code, "host", "guest");
    });
    expect(
      await screen.findByText(
        "Bia encerrou a partida porque você ficou fora por mais de 2 minutos.",
      ),
    ).toBeInTheDocument();
    // A partida acabou: o lobby não oferece mais voltar.
    expect(usePlayer.getState().player.activeOnline).toBeUndefined();
  });
  it("configuração: quem cria escolhe tempo por jogada e aposta, e a sala de espera mostra as regras", async () => {
    usePlayer.setState((st) => ({ player: { ...st.player, coins: 40 } }));
    const code = await createRoom(() => {
      // Apostas acima do saldo (40) ficam desligadas.
      expect(screen.getByRole("radio", { name: "50" })).toBeDisabled();
      fireEvent.click(screen.getByRole("radio", { name: "1 min" }));
      fireEvent.click(screen.getByRole("radio", { name: "25" }));
      expect(screen.getByRole("status")).toHaveTextContent(
        "Cada um aposta 25: quem vencer leva 50 moedas.",
      );
    });
    expect(mem.rooms.get(code)!.rules).toEqual({ turnSeconds: 60, bet: 25 });
    const rules = screen.getByRole("list", { name: "Regras da partida" });
    expect(rules).toHaveTextContent("Jogada: 1 min");
    expect(rules).toHaveTextContent("Aposta: 25 moedas");
  });
  it("aposta: cada um reserva ao começar e quem vence leva as duas", async () => {
    const code = await createRoom(() =>
      fireEvent.click(screen.getByRole("radio", { name: "25" })),
    );
    const before = usePlayer.getState().player.coins;
    await act(async () => {
      await mem.as("guest").join(code, bia);
    });
    await screen.findByRole("heading", { name: "Contra Bia" });
    // Partida começou: a aposta sai do saldo e fica reservada.
    expect(usePlayer.getState().player.coins).toBe(before - 25);
    expect(usePlayer.getState().player.wagers).toEqual({ [code]: 25 });
    // Termina com o anfitrião na frente (o estado da sala é do ponto de vista dele).
    const room = mem.rooms.get(code)!;
    await act(async () => {
      await mem.as("guest").play({
        ...room,
        rev: room.rev + 1,
        status: "finished",
        state: { ...room.state, scores: { p: 12, ai: 5 } },
      });
    });
    expect(
      await screen.findByText(/Aposta ganha: \+25 moedas/),
    ).toBeInTheDocument();
    const after = usePlayer.getState().player;
    // Devolve as duas apostas (a dele e a do amigo); fora isso, o convite de amigo novo.
    expect(after.coins - (before - 25)).toBe(50 + economy.invite);
    expect(after.wagers).toEqual({});
  });
  it("aposta: quem fica quando o amigo abandona leva as duas; quem sai perde a sua", async () => {
    const code = await createRoom(() =>
      fireEvent.click(screen.getByRole("radio", { name: "10" })),
    );
    const before = usePlayer.getState().player.coins;
    await act(async () => {
      await mem.as("guest").join(code, bia);
    });
    await screen.findByRole("heading", { name: "Contra Bia" });
    await act(async () => {
      await mem.as("guest").abandon(code, "guest");
    });
    await screen.findByRole("heading", { name: "Vitória!" });
    expect(usePlayer.getState().player.coins).toBe(
      before - 10 + 20 + economy.duel.win,
    );
  });
  it("convidado vê as regras antes de entrar e só entra com moedas para a aposta", async () => {
    // Sala de outro jogador com aposta de 50 e 30 s por jogada.
    await mem.as("ana").create({
      code: "QWE234",
      puzzleId: puzzle.id,
      grid: puzzle,
      host: { uid: "ana", name: "Ana", avatar: "panda" },
      status: "waiting",
      rev: 0,
      rules: { turnSeconds: 30, bet: 50 },
      state: startOnline(puzzle.id, "s", puzzle),
    });
    usePlayer.setState((st) => ({ player: { ...st.player, coins: 30 } }));
    open();
    fireEvent.click(screen.getByRole("tab", { name: "Entrar com código" }));
    fireEvent.change(screen.getByLabelText("Código da partida"), {
      target: { value: "QWE234" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Entrar/ }));
    expect(
      await screen.findByRole("heading", { name: "Partida de Ana" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("list", { name: "Regras da partida" }),
    ).toHaveTextContent("Jogada: 30 s");
    expect(screen.getByText(/não dá para apostar 50/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Entrar e apostar 50/ }),
    ).toBeDisabled();
    // Com saldo, entra (e a sala ainda não tinha convidado).
    act(() =>
      usePlayer.setState((st) => ({ player: { ...st.player, coins: 80 } })),
    );
    expect(mem.rooms.get("QWE234")!.guest).toBeUndefined();
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /Entrar e apostar 50/ }),
      );
    });
    expect(
      await screen.findByRole("heading", { name: "Contra Ana" }),
    ).toBeInTheDocument();
    expect(mem.rooms.get("QWE234")!.guest?.uid).toBe("host");
    // Na partida vale o relógio da sala (30 s), quando é a vez de quem entrou.
    expect(usePlayer.getState().player.coins).toBe(30);
  });
  it("relógio: com tempo por jogada, a vez de quem joga corre no relógio da sala; sem limite, não há relógio", async () => {
    const code = await createRoom(() =>
      fireEvent.click(screen.getByRole("radio", { name: "30 s" })),
    );
    await act(async () => {
      await mem.as("guest").join(code, bia);
    });
    await screen.findByRole("heading", { name: "Contra Bia" });
    expect(screen.getByRole("timer")).toHaveAccessibleName(
      "Relógio do turno: 30 segundos",
    );
    cleanup();
    mem = memoryBackend();
    setOnlineBackend(mem.as("host"));
    const plain = await createRoom();
    await act(async () => {
      await mem.as("guest").join(plain, bia);
    });
    await screen.findByRole("heading", { name: "Contra Bia" });
    expect(screen.queryByRole("timer")).toBeNull();
  });
  it("convite: só amigo novo e até 5 amigos", () => {
    expect(inviteReward(undefined, "a")).toBe(economy.invite);
    expect(inviteReward(["a"], "a")).toBe(0);
    expect(inviteReward(["a", "b", "c", "d", "e"], "f")).toBe(0);
    expect(inviteReward([], undefined)).toBe(0);
  });
});

describe("Aviso da partida em andamento", () => {
  let mem: ReturnType<typeof memoryBackend>;
  const waiting = (over: Partial<OnlineRoom> = {}): OnlineRoom => ({
    code: "ABC234",
    puzzleId: puzzle.id,
    host: { uid: "eu", name: "Gil", avatar: "jogador" },
    status: "waiting",
    rev: 0,
    state: startOnline(puzzle.id, "semente"),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...over,
  });
  beforeEach(() => {
    mem = memoryBackend();
    mem.rooms.set("ABC234", waiting());
    setOnlineBackend(mem.as("eu"));
  });
  afterEach(() => {
    cleanup();
    setOnlineBackend(undefined);
    vi.restoreAllMocks();
  });
  const at = async (path: string) => {
    const { Layout } = await import("../components/Layout");
    const { Toasts } = await import("../components/ResumeMatchToast");
    render(
      <MemoryRouter initialEntries={[path]}>
        <Toasts />
        <Routes>
          <Route element={<Layout />}>
            <Route path="*" element={<p>tela</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
  };
  it("aparece fora da partida, em todas as telas, e leva de volta à sala", async () => {
    usePlayer.setState({
      player: { ...structuredClone(initialPlayer), activeOnline: "ABC234" },
      ready: true,
    });
    for (const path of ["/", "/casual", "/daily", "/profile"]) {
      await at(path);
      expect(
        await screen.findByRole("link", {
          name: "Voltar para a partida ABC234",
        }),
      ).toHaveAttribute("href", "/online/ABC234");
      expect(screen.getByText(/Partida em andamento/)).toBeInTheDocument();
      cleanup();
    }
  });
  it("não aparece dentro da partida, no mapa nem sem partida em andamento", async () => {
    usePlayer.setState({
      player: { ...structuredClone(initialPlayer), activeOnline: "ABC234" },
      ready: true,
    });
    for (const path of ["/online/ABC234", "/map/floresta"]) {
      await at(path);
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });
      expect(
        screen.queryByRole("link", { name: /Voltar para a partida/ }),
      ).toBeNull();
      cleanup();
    }
    usePlayer.setState({
      player: structuredClone(initialPlayer),
      ready: true,
    });
    await at("/");
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(
      screen.queryByRole("link", { name: /Voltar para a partida/ }),
    ).toBeNull();
  });

  const marked = (extra: Partial<typeof initialPlayer> = {}) =>
    usePlayer.setState({
      player: {
        ...structuredClone(initialPlayer),
        activeOnline: "ABC234",
        ...extra,
      },
      ready: true,
    });
  it("sai sozinho quando a sala não existe mais ou já acabou", async () => {
    for (const set of [
      () => mem.rooms.delete("ABC234"),
      () => mem.rooms.set("ABC234", waiting({ status: "finished" })),
    ]) {
      set();
      marked();
      await at("/");
      await waitFor(() =>
        expect(usePlayer.getState().player.activeOnline).toBeUndefined(),
      );
      cleanup();
    }
  });
  it("sala parada há mais de um dia expira, o aviso sai e a aposta volta", async () => {
    const old = Date.now() - ROOM_EXPIRE_MS - 1000;
    mem.rooms.set("ABC234", waiting({ createdAt: old, updatedAt: old }));
    marked({ coins: 50, wagers: { ABC234: 10 } });
    await at("/");
    await waitFor(() =>
      expect(usePlayer.getState().player.activeOnline).toBeUndefined(),
    );
    expect(mem.rooms.get("ABC234")!.endedBy).toBe(ROOM_EXPIRED);
    expect(usePlayer.getState().player.coins).toBe(60);
    expect(usePlayer.getState().player.wagers?.ABC234).toBeUndefined();
  });
  it("sala aberta e recente continua com o aviso", async () => {
    marked();
    await at("/");
    await screen.findByRole("link", { name: "Voltar para a partida ABC234" });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(usePlayer.getState().player.activeOnline).toBe("ABC234");
  });
  it("Encerrar no aviso pergunta antes, fecha a sala e tira o aviso", async () => {
    marked();
    await at("/");
    const end = await screen.findByRole("button", {
      name: "Encerrar a partida ABC234",
    });
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false);
    fireEvent.click(end);
    expect(confirm).toHaveBeenCalled();
    expect(mem.rooms.get("ABC234")!.status).toBe("waiting");
    confirm.mockReturnValueOnce(true);
    fireEvent.click(end);
    await waitFor(() =>
      expect(usePlayer.getState().player.activeOnline).toBeUndefined(),
    );
    expect(mem.rooms.get("ABC234")!.status).toBe("abandoned");
    expect(mem.rooms.get("ABC234")!.left).toBe("eu");
  });
});
