import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { Deck } from "../components/Deck";

afterEach(cleanup);
const open = () =>
  render(
    <Deck
      label="Frutas"
      items={["Uva", "Caju", "Manga"]}
      keyOf={(f) => f}
      render={(f) => <strong>{f}</strong>}
    />,
  );
const front = () =>
  screen.getByRole("list", { name: "Frutas" }).querySelector("li:not([inert])");

it("mostra um card por vez e as setas dão a volta no baralho", () => {
  open();
  expect(front()).toHaveTextContent("Uva");
  fireEvent.click(screen.getByRole("button", { name: "Próximo em Frutas" }));
  expect(front()).toHaveTextContent("Caju");
  expect(screen.getByText("2 de 3")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Anterior em Frutas" }));
  fireEvent.click(screen.getByRole("button", { name: "Anterior em Frutas" }));
  expect(front()).toHaveTextContent("Manga");
});
it("arrastar para a esquerda passa ao próximo; um arrasto curto não troca", () => {
  open();
  const list = screen.getByRole("list", { name: "Frutas" });
  const drag = (to: number) => {
    fireEvent.pointerDown(list, { clientX: 200 });
    fireEvent.pointerMove(list, { clientX: to });
    fireEvent.pointerUp(list);
  };
  drag(180);
  expect(front()).toHaveTextContent("Uva");
  drag(100);
  expect(front()).toHaveTextContent("Caju");
  drag(320);
  expect(front()).toHaveTextContent("Uva");
});
it("as teclas de seta também trocam o card", () => {
  open();
  fireEvent.keyDown(screen.getByRole("list", { name: "Frutas" }), {
    key: "ArrowRight",
  });
  expect(front()).toHaveTextContent("Caju");
});
