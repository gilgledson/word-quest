import fs from "node:fs";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { PLAYER_AVATARS, avatarOf } from "../game/avatars";
import { MOODS, opponentFace } from "../game/opponents";
import { Profile } from "../features/pages";
import { initialPlayer } from "../services/repository";
import { usePlayer } from "../stores/player";

afterEach(cleanup);

describe("Avatares do jogador", () => {
  it("são cinco, com os seis humores cada um", () => {
    expect(PLAYER_AVATARS).toHaveLength(5);
    expect(new Set(PLAYER_AVATARS.map((a) => a.id)).size).toBe(5);
    for (const a of PLAYER_AVATARS)
      for (const mood of MOODS)
        expect(fs.existsSync(`public${opponentFace(a.id, mood)}`)).toBe(true);
  });
  it("id desconhecido volta ao explorador", () => {
    expect(avatarOf("nada").id).toBe("jogador");
    expect(avatarOf(undefined).id).toBe("jogador");
    expect(avatarOf("panda").name).toBe("Panda");
  });
  it("o Perfil troca o avatar e a escolha fica no jogador", () => {
    usePlayer.setState({ player: structuredClone(initialPlayer), ready: true });
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: "Explorador" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: "Panda" }));
    expect(usePlayer.getState().player.avatar).toBe("panda");
    expect(screen.getByRole("button", { name: "Panda" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
