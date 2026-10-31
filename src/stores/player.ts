import { create } from "zustand";
import { initialPlayer, repository, type Player } from "../services/repository";
import { defaultOpponent, opponentById } from "../game/opponents";
import { levels } from "../data/catalog";
interface Store {
  player: Player;
  ready: boolean;
  error: string;
  hydrate: () => Promise<void>;
  update: (fn: (p: Player) => Player) => void;
}
let queue = Promise.resolve();
export const usePlayer = create<Store>((set) => ({
  player: initialPlayer,
  ready: false,
  error: "",
  hydrate: async () => {
    try {
      const saved = await repository.load();
      set({
        player: {
          ...initialPlayer,
          ...saved,
          // Quem nunca escolheu mantém o padrão novo (sons ligados).
          sound: saved?.soundChosen ? saved.sound : true,
          // Quem já tinha progresso salvo antes do tutorial não precisa vê-lo.
          tutorialDone: saved ? (saved.tutorialDone ?? true) : false,
          // O tour de apresentação também só vale para quem ainda não fez o tutorial.
          tourDone: saved ? (saved.tourDone ?? true) : false,
          // Quem já tinha fases vencidas ganha, como descobertas, as palavras dessas fases.
          wordsFound:
            saved?.wordsFound ??
            Object.fromEntries(
              levels
                .filter((l) => saved?.stars?.[l.id])
                .map((l) => [l.id, l.words.map((w) => w.id)]),
            ),
          // Quem só tinha o nível passa a enfrentar o oponente cuidadoso daquele nível.
          opponent:
            opponentById(saved?.opponent)?.id ??
            defaultOpponent(saved?.botLevel ?? initialPlayer.botLevel).id,
        },
        ready: true,
      });
    } catch {
      set({
        ready: true,
        error:
          "Leitura do progresso indisponível. Verifique o armazenamento do navegador.",
      });
    }
  },
  update: (fn) =>
    set((state) => {
      const player = fn(state.player);
      queue = queue
        .then(() => repository.save(player))
        .catch(() => {
          set({
            error:
              "Não foi possível salvar. Mantenha esta página aberta e verifique o armazenamento.",
          });
        });
      return { player };
    }),
}));
