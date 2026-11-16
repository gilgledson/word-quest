import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Deck } from "../components/Deck";

const SOFTWARE: [string, string][] = [
  ["React, React Router, Vite, Motion, Zustand", "MIT"],
  ["Capacitor (núcleo, Android e vibração), vite-plugin-pwa", "MIT"],
  ["Dexie", "Apache 2.0"],
  ["Lucide, canvas-confetti", "ISC"],
];
/** Créditos e licenças do que o jogo usa (vocabulário, música, arte, fonte e software livre). */
const CARDS: { title: string; body: ReactNode }[] = [
  {
    title: "Estúdio",
    body: (
      <>
        <img src="/art/studio-lunara.webp" alt="Lunara Games" width="220" />
        <p>WordQuest é um jogo da Lunara Games.</p>
      </>
    ),
  },
  {
    title: "Vocabulário",
    body: (
      <p>
        As palavras vêm de uma lista derivada do <b>VERO</b> (Verificador
        Ortográfico Livre, pt_BR, versão 3.2, 2013), de Raimundo Santos Moura e
        da comunidade do LibreOffice (github.com/LibreOffice/dictionaries).
        Licenças: LGPLv3 e Mozilla Public License. Copyright © 2006–2013
        Raimundo Santos Moura. As pistas foram escritas para o jogo.
      </p>
    ),
  },
  {
    title: "Música",
    body: (
      <p>
        “Where the River Bends”: faixa gerada com inteligência artificial (o
        arquivo traz credenciais de conteúdo C2PA da Google).
      </p>
    ),
  },
  {
    title: "Arte",
    body: (
      <p>
        Cenários, mapas, personagens, ícones e logo foram criados com
        ferramentas de inteligência artificial (Leonardo.ai, ChatGPT e um
        gerador de imagens integrado) e ajustados para o jogo.
      </p>
    ),
  },
  {
    title: "Fonte",
    body: (
      <p>
        Nunito, de Vernon Adams e colaboradores, sob a SIL Open Font License 1.1
        (distribuída pelo Fontsource).
      </p>
    ),
  },
  {
    title: "Software livre",
    body: (
      <ul>
        {SOFTWARE.map(([nome, licenca]) => (
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
        <span className="eyebrow">QUEM AJUDOU A FAZER ESTE JOGO</span>
        <h1>Créditos e licenças</h1>
      </div>
      <Deck
        className="credits"
        label="Créditos"
        items={CARDS}
        keyOf={(c) => c.title}
        render={(c) => (
          <article>
            <h2>{c.title}</h2>
            {c.body}
          </article>
        )}
      />
      <Link className="text-link credits-back" to="/profile">
        <ArrowLeft size={18} /> Voltar ao perfil
      </Link>
    </>
  );
}
