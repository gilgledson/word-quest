import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Deck } from "../components/Deck";
import { creditsT as t } from "../i18n/screens";

const software = (): [string, string][] => [
  ["React, React Router, Vite, Motion, Zustand", "MIT"],
  [t.capacitor, "MIT"],
  ["Dexie", "Apache 2.0"],
  ["Lucide, canvas-confetti", "ISC"],
];
/** Créditos e licenças do que o jogo usa (vocabulário, música, arte, fonte e software livre). */
const cards = (): { title: string; body: ReactNode }[] => [
  {
    title: t.studio,
    body: (
      <>
        <img src="/art/studio-lunara.webp" alt="Lunara Games" width="220" />
        <p>{t.studioText}</p>
      </>
    ),
  },
  {
    title: t.vocabulary,
    body: (
      <p>
        {t.vocabBefore}
        <b>{t.vocabName}</b>
        {t.vocabAfter}
      </p>
    ),
  },
  { title: t.music, body: <p>{t.musicText}</p> },
  { title: t.art, body: <p>{t.artText}</p> },
  { title: t.font, body: <p>{t.fontText}</p> },
  {
    title: t.software,
    body: (
      <ul>
        {software().map(([nome, licenca]) => (
          <li key={nome}>
            {nome} <small>· {licenca}</small>
          </li>
        ))}
      </ul>
    ),
  },
];
/** Créditos e licenças do que o jogo usa (vocabulário, música, arte, fonte e software livre), um card por assunto. */
export function Credits() {
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">{t.eyebrow}</span>
        <h1>{t.title}</h1>
      </div>
      <Deck
        className="credits"
        label={t.deck}
        items={cards()}
        keyOf={(c) => c.title}
        render={(c) => (
          <article>
            <h2>{c.title}</h2>
            {c.body}
          </article>
        )}
      />
      <Link className="text-link credits-back" to="/profile">
        <ArrowLeft size={18} /> {t.back}
      </Link>
    </>
  );
}
