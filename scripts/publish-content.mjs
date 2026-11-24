// Publica o conteúdo do jogo (fases, variantes, temas, mundos e rivais) sem atualizar o app.
//
// Uso:
//   node scripts/publish-content.mjs            # monta e confere, sem publicar
//   node scripts/publish-content.mjs --deploy   # confere e publica (precisa de `npx firebase-tools login`)
//   [--version N]                               # força o número da versão (padrão: a publicada + 1)
//   [--lang en]                                 # conteúdo em inglês: src/data/en → /content-en
//
// O conteúdo sai dos mesmos arquivos que vão dentro do app (src/data/*.json). Imagens novas ficam em
// content/hosting/art/... e são citadas pelo endereço https://wordquest-online.web.app/art/...
// Nada é publicado se a conferência falhar: validação do app, cada grade jogada até o fim e cada
// imagem do servidor presente em content/hosting.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { keepLiveApp } from "./lib/live-app.mjs";
import { LANG, appData } from "./lib/lang.mjs";

const root = path.resolve(
  path.dirname(
    new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"),
  ),
  "..",
);
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const PROJECT = "wordquest-online";
const DATABASE = "https://wordquest-online-default-rtdb.firebaseio.com";
const HOST = "https://wordquest-online.web.app/";
const read = (file) =>
  JSON.parse(fs.readFileSync(path.join(appData, file), "utf8"));
/** Nó do banco de cada idioma: o português no `content` de sempre, os outros em `content-<idioma>`. */
const NODE = LANG === "pt" ? "content" : `content-${LANG}`;
const fail = (message) => {
  console.error(`\n✗ ${message}`);
  process.exit(1);
};

// 1. Versão: a publicada + 1 (ou a pedida).
let published = 0;
try {
  const res = await fetch(`${DATABASE}/${NODE}/version.json`);
  if (res.ok) published = Number((await res.json()) ?? 0);
} catch {
  if (flag("deploy")) fail("Sem acesso ao banco para ler a versão publicada.");
}
const version = Number(option("version") ?? published + 1);
if (!Number.isInteger(version) || version <= published)
  fail(`Versão ${version} precisa ser maior que a publicada (${published}).`);

// 2. Conteúdo, dos arquivos do app.
const content = {
  schema: 1,
  version,
  catalog: {
    worlds: read("worlds.json"),
    levels: read("levels.json"),
    variants: read("level-variants.json"),
    casual: read("casual.json").themes,
  },
  cast: read("opponents.json"),
};
const build = path.join(root, "content", "build");
fs.mkdirSync(build, { recursive: true });
const contentFile = path.join(build, `${NODE}.json`);
fs.writeFileSync(contentFile, JSON.stringify(content));

// 3. Imagens do servidor citadas: cada uma precisa existir em content/hosting.
const moods = ["neutral", "thinking", "happy", "angry", "sad", "surprised"];
const images = [
  ...content.catalog.worlds.map((w) => w.art),
  ...content.catalog.casual.flatMap((t) => (t.art ? [t.art] : [])),
  ...content.cast.opponents.flatMap((o) =>
    o.art ? moods.map((m) => `${o.art}-${m}.webp`) : [],
  ),
].filter((u) => u.startsWith("https://"));
const missing = images.filter(
  (u) =>
    !u.startsWith(HOST) ||
    !fs.existsSync(path.join(root, "content", "hosting", u.slice(HOST.length))),
);
if (missing.length)
  fail(`Imagens fora de content/hosting:\n  ${missing.join("\n  ")}`);

// 4. Conferência completa (a mesma validação do aparelho + cada grade jogada até o fim).
console.log(
  `Conferindo o conteúdo ${version} [${LANG}] (${images.length} imagens do servidor)…`,
);
try {
  execFileSync(
    "npx",
    ["vitest", "run", "src/tests/publicacao.test.ts", "--reporter=dot"],
    {
      cwd: root,
      stdio: "inherit",
      env: { ...process.env, CONTENT_FILE: contentFile },
    },
  );
} catch {
  fail("A conferência falhou: nada foi publicado.");
}
const kb = Math.round(fs.statSync(contentFile).size / 1024);
console.log(`✓ Conteúdo ${version} conferido (${kb} KB).`);

// 5. Publicação: primeiro imagens e regras, depois o conteúdo (que cita as imagens).
const database = path.join(build, `database-${NODE}.json`);
fs.writeFileSync(
  database,
  JSON.stringify({ version, data: JSON.stringify(content) }),
);
if (!flag("deploy")) {
  console.log("Sem --deploy: nada foi publicado.");
  process.exit(0);
}
// O deploy do Hosting troca o site inteiro: leva junto a versão do app que está no ar (arquivos e
// `latest.json`), senão a atualização ao vivo volta para a cópia antiga de content/hosting/app.
try {
  await keepLiveApp({
    host: HOST.replace(/\/$/, ""),
    appDir: path.join(root, "content", "hosting", "app"),
    writeLatest: true,
  });
} catch (e) {
  fail(`Sem a versão do app em vigor; nada foi publicado (${e.message}).`);
}
const firebase = (...cmd) =>
  execFileSync("npx", ["firebase-tools", ...cmd, "--project", PROJECT], {
    cwd: root,
    stdio: "inherit",
  });
try {
  firebase("deploy", "--only", "hosting,database");
  firebase("database:set", `/${NODE}`, database, "--force");
} catch {
  fail("A publicação falhou (login feito com `npx firebase-tools login`?).");
}
console.log(
  `✓ Conteúdo ${version} publicado. Os jogadores recebem na próxima abertura do app.`,
);
