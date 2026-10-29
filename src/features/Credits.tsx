import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const SOFTWARE: [string, string][] = [
  ["React, React Router, Vite, Motion, Zustand", "MIT"],
  ["Capacitor (núcleo, Android e vibração), vite-plugin-pwa", "MIT"],
  ["Dexie", "Apache 2.0"],
  ["Lucide, canvas-confetti", "ISC"],
];
/** Créditos e licenças do que o jogo usa (vocabulário, música, arte, fonte e software livre). */
export function Credits() {
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">QUEM AJUDOU A FAZER ESTE JOGO</span>
        <h1>Créditos e licenças</h1>
      </div>
      <section className="credits" aria-label="Créditos">
        <article className="credits-studio">
          <h2>Estúdio</h2>
          <img src="/art/studio-lunara.webp" alt="Lunara Games" width="260" />
          <p>WordQuest é um jogo da Lunara Games.</p>
        </article>
        <article>
          <h2>Vocabulário</h2>
          <p>
            As palavras vêm de uma lista derivada do <b>VERO</b> (Verificador
            Ortográfico Livre, pt_BR, versão 3.2, 2013), de Raimundo Santos
            Moura e da comunidade do LibreOffice
            (github.com/LibreOffice/dictionaries). Licenças: LGPLv3 e Mozilla
            Public License. Copyright © 2006–2013 Raimundo Santos Moura. As
            pistas foram escritas para o jogo.
          </p>
        </article>
        <article>
          <h2>Música</h2>
          <p>
            “Where the River Bends”: faixa gerada com inteligência artificial (o
            arquivo traz credenciais de conteúdo C2PA da Google).
          </p>
        </article>
        <article>
          <h2>Arte</h2>
          <p>
            Cenários, mapas, personagens, ícones e logo foram criados com
            ferramentas de inteligência artificial (Leonardo.ai, ChatGPT e um
            gerador de imagens integrado) e ajustados para o jogo.
          </p>
        </article>
        <article>
          <h2>Fonte</h2>
          <p>
            Nunito, de Vernon Adams e colaboradores, sob a SIL Open Font License
            1.1 (distribuída pelo Fontsource).
          </p>
        </article>
        <article>
          <h2>Software livre</h2>
          <ul>
            {SOFTWARE.map(([nome, licenca]) => (
              <li key={nome}>
                {nome} <small>· {licenca}</small>
              </li>
            ))}
          </ul>
        </article>
      </section>
      <Link className="text-link credits-back" to="/profile">
        <ArrowLeft size={18} /> Voltar ao perfil
      </Link>
    </>
  );
}
