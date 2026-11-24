/**
 * Idioma do jogo (pt-BR ou inglês). O idioma vale para a sessão inteira: muda nas Configurações e o
 * app recarrega, porque o conteúdo (fases, temas, rivais) de cada idioma é montado antes da primeira
 * tela. Na primeira abertura vem do aparelho: português para `pt*`, inglês para qualquer outro.
 *
 * Os textos ficam perto de quem usa, em `src/i18n/<área>.ts`, com `texts({ pt, en })`: o TypeScript
 * exige que o inglês tenha as mesmas chaves (e os mesmos parâmetros) do português.
 */
export const LANGS = ["pt", "en"] as const;
export type Lang = (typeof LANGS)[number];
/** Chave no localStorage (síncrono: o idioma precisa estar certo já na primeira tela). */
export const LANG_KEY = "wordquest.lang";

const isLang = (v: unknown): v is Lang => LANGS.includes(v as Lang);

/** Idioma do aparelho: português só para `pt*`; o resto do mundo joga em inglês. */
export function deviceLang(): Lang {
  const list =
    typeof navigator === "undefined"
      ? []
      : [...(navigator.languages ?? []), navigator.language];
  const first = list.find(Boolean) ?? "pt-BR";
  return first.toLowerCase().startsWith("pt") ? "pt" : "en";
}

function stored(): Lang | undefined {
  try {
    const v = localStorage.getItem(LANG_KEY);
    return isLang(v) ? v : undefined;
  } catch {
    return undefined;
  }
}

let current: Lang | undefined;
/** De onde veio o idioma desta abertura: gravado antes (escolha ou abertura anterior) ou do aparelho. */
let origin: "saved" | "device" | undefined;
/** Idioma em uso. */
export function lang(): Lang {
  if (current) return current;
  const saved = stored();
  origin = saved ? "saved" : "device";
  return (current = saved ?? deviceLang());
}
/** `device` só na primeira abertura com idioma (o app ainda não tinha gravado nenhum). */
export const langOrigin = () => (lang(), origin);
/** Idioma principal do aparelho ("en", "es", "pt"…), sem região: diz quem cai no inglês. */
export function deviceLanguage() {
  const tag =
    typeof navigator === "undefined"
      ? ""
      : (navigator.languages?.[0] ?? navigator.language ?? "");
  return tag.split("-")[0].toLowerCase() || "unknown";
}
/** Troca feita nas Configurações: o idioma anterior fica guardado até a próxima abertura medir. */
const CHANGED_KEY = "wordquest.langFrom";
/** Locale para `Intl` (datas, números, ordenação). */
export const locale = () => (lang() === "en" ? "en-US" : "pt-BR");

/**
 * Grava o idioma escolhido. Quem troca pelo app recarrega a página em seguida (`changeLang`); os
 * testes usam isto direto.
 */
export function setLang(l: Lang) {
  current = l;
  try {
    localStorage.setItem(LANG_KEY, l);
  } catch {
    /* Sem armazenamento: vale só nesta sessão. */
  }
  if (typeof document !== "undefined") {
    document.documentElement.lang = htmlLang(l);
    document.title = TITLES[l];
  }
}
export const htmlLang = (l: Lang) => (l === "en" ? "en" : "pt-BR");
/** Logo com o subtítulo do idioma ("A Jornada das Palavras" / "The Word Journey"). */
export const logoSrc = () =>
  lang() === "en"
    ? "/art/wordquest-logo-en-v1.webp"
    : "/art/wordquest-logo-v1.webp";
/** Título da aba (o do index.html é o do português). */
const TITLES: Record<Lang, string> = {
  pt: "WordQuest — A Jornada das Palavras",
  en: "WordQuest — The Word Journey",
};

/** Troca o idioma pelo app: grava e reabre na tela inicial, já com o conteúdo do idioma novo. */
export function changeLang(l: Lang) {
  if (l === lang()) return;
  try {
    localStorage.setItem(CHANGED_KEY, lang());
  } catch {
    /* Sem armazenamento: a troca não é medida. */
  }
  setLang(l);
  location.assign("/");
}

/**
 * Idioma de antes da troca feita nas Configurações (o app recarrega ao trocar, então a medição é
 * feita na abertura seguinte). Devolve uma vez só.
 */
export function consumeLangChange(): Lang | undefined {
  try {
    const from = localStorage.getItem(CHANGED_KEY);
    localStorage.removeItem(CHANGED_KEY);
    return isLang(from) && from !== lang() ? from : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Textos de uma área nos dois idiomas. Devolve um objeto que lê o idioma em uso a cada acesso
 * (os testes trocam de idioma sem recarregar os módulos). Valores podem ser texto ou funções
 * (`(n: number) => string`) para plurais e parâmetros.
 */
export function texts<T extends object>(d: { pt: T; en: NoInfer<T> }): T {
  return new Proxy(d.pt, {
    get: (_, key) => d[lang()][key as keyof T],
  });
}

/** Escolhe entre dois textos soltos (para casos de uma linha só). */
export const tr = <T>(pt: T, en: T): T => (lang() === "en" ? en : pt);

/** Plural simples: `plural(n, "moeda", "moedas")`. */
export const plural = (n: number, one: string, many: string) =>
  n === 1 ? one : many;

/** Número formatado no idioma em uso (1.234 / 1,234). */
export const num = (n: number) => n.toLocaleString(locale());
