import { afterEach, describe, expect, it } from "vitest";
import { setLang } from "../i18n";
import { ACHIEVEMENTS, achievementStatus } from "../game/achievements";
import { SHOP_ITEMS } from "../game/shop";
import { PLAYER_AVATARS } from "../game/avatars";
import { OPPONENT_LEVELS, OPPONENT_STYLES } from "../game/opponent";
import { LOGIN_REWARDS } from "../game/loginReward";
import { reminderPlan } from "../services/reminders";
import { initialPlayer } from "../services/repository";

afterEach(() => setLang("pt"));

const base = { reminders: true, daily: [] as string[], streak: 0 };

describe("textos do jogo em inglês", () => {
  it("conquistas trocam de idioma sem recarregar", () => {
    const first = ACHIEVEMENTS.find((a) => a.id === "primeiro-passo")!;
    expect(first.title).toBe("O primeiro passo");
    setLang("en");
    expect(first.title).toBe("The first step");
    expect(first.text).toBe("Win your first level.");
    const all = achievementStatus(initialPlayer).find(
      (a) => a.id === "chefes-todos",
    )!;
    expect(all.title).toBe("Legend of the five worlds");
    expect(all.text).toMatch(/^Beat all \d+ bosses\.$/);
  });

  it("itens da loja, avatares e rivais", () => {
    setLang("en");
    const wild = SHOP_ITEMS.find((i) => i.id === "curinga")!;
    expect(wild.nome).toBe("Wild tile");
    expect(SHOP_ITEMS[1].resumo).toBe("Pick a vowel the grid still needs.");
    expect(PLAYER_AVATARS[0].name).toBe("Explorer");
    expect(OPPONENT_LEVELS.dificil.label).toBe("Hard");
    expect(OPPONENT_STYLES.agressivo.label).toBe("Bold");
  });

  it("o lembrete diário sai em inglês", () => {
    setLang("en");
    const plan = reminderPlan(base, "2026-11-18", new Date(2026, 10, 18, 9, 0));
    expect(plan[0].title).toBe("Your daily challenge is here!");
    expect(plan[0].body).toBe(
      `A new crossword is waiting. Today's reward: +${LOGIN_REWARDS[0]} coins.`,
    );
    expect(plan[6].body).toBe(
      `It's Day 7: a chest with ${LOGIN_REWARDS[6]} coins is waiting for you!`,
    );
    const streak = reminderPlan(
      { ...base, streak: 3 },
      "2026-11-18",
      new Date(2026, 10, 18, 9, 0),
    );
    expect(streak[0].body).toContain("Don't lose your 3-day streak.");
  });
});
