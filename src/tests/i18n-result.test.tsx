import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { setLang } from "../i18n";
import { dailyShareText, STORE_URL } from "../game/dailyShare";
import { TutorialTip } from "../features/puzzle/TutorialTip";
import { ChestReward } from "../components/ChestReward";

describe("resultado e tutorial em inglês", () => {
  beforeEach(() => setLang("en"));
  afterEach(() => setLang("pt"));

  it("texto do desafio do dia", () => {
    const text = dailyShareText({
      date: "2026-11-16",
      session: {
        owners: { a: "p", b: "p", c: "ai" },
        locked: ["a", "b", "c"],
        scores: { p: 20, ai: 8 },
        hinted: ["a"],
        misses: 2,
      },
      rival: "Fox",
      streak: 3,
    });
    expect(text.split("\n")).toEqual([
      "🏆 WordQuest · Daily challenge 11/16",
      "⚔️ Won against Fox!",
      "",
      "🟦🟦🟦🟦🟦🟦🟦🟥🟥🟥",
      "🟦 my letters: 2 · 🟥 Fox: 1",
      "",
      "🎯 Score: 20 × 8",
      "❌ 2 mistakes · 💡 1 hint",
      "🔥 3-day streak",
      "",
      "Can you beat me?",
      STORE_URL,
    ]);
  });

  it("passo do tutorial e baú", () => {
    render(
      <TutorialTip step={1} letter="A" botTurn={false} onDone={() => {}} />,
    );
    expect(screen.getByText("Tap the glowing A to play")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Skip" })).toBeInTheDocument();
    render(<ChestReward coins={1} animated={false} />);
    expect(screen.getByText("Chest opened!")).toBeInTheDocument();
    expect(screen.getByText("+1 coin")).toBeInTheDocument();
  });
});
