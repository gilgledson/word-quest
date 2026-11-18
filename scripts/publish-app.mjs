// Publica uma versão nova do app (código, telas e arte) sem passar pela Play Store.
//
// Uso:
//   node scripts/publish-app.mjs            # gera e confere o pacote, sem publicar
//   node scripts/publish-app.mjs --deploy   # gera e publica no Firebase Hosting
//   [--native 5.3,5.4]                      # versões da loja que recebem (padrão: a do build.gradle
//                                           # mais as que já recebiam a versão em vigor)
//
// O pacote só pode mudar o que roda no WebView. Plugin nativo novo, permissão, ícone ou versão do
// Android exigem uma versão nova na loja (e aí este script passa a mirar a versão nova).
//
// Saída em content/hosting/app/:
//   <versão>/...      os arquivos do pacote (servidos um a um: o app baixa só os que mudaram)
//   <versão>.zip      o pacote inteiro (reserva)
//   latest.json       a versão em vigor, as versões nativas que a recebem e a lista de arquivos
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

const root = path.resolve(
  path.dirname(
    new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"),
  ),
  "..",
);
const args = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const HOST = "https://wordquest-online.web.app";
const KEEP = 3; // versões guardadas no Hosting (as mais novas)
const fail = (message) => {
  console.error(`\n✗ ${message}`);
  process.exit(1);
};
const run = (cmd, cmdArgs, env = {}) =>
  execFileSync(cmd, cmdArgs, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...env },
  });

// 1. Versão nativa (da loja) e versão do pacote.
const gradle = fs.readFileSync(
  path.join(root, "android/app/build.gradle"),
  "utf8",
);
const nativeVersion = gradle.match(/versionName "([^"]+)"/)?.[1];
if (!nativeVersion)
  fail("versionName não encontrado em android/app/build.gradle.");
let natives = (option("native") ?? nativeVersion)
  .split(",")
  .map((v) => v.trim());
const stamp = new Date()
  .toISOString()
  .replace(/[-:]/g, "")
  .replace("T", "-")
  .slice(0, 13);
const version = `${nativeVersion}.${stamp}`;

// 2. Build igual ao do APK (modo capacitor), carimbado com a versão do pacote.
console.log(`Gerando o pacote ${version} para a loja ${natives.join(", ")}…`);
run("npx", ["tsc", "-b"]);
run("npx", ["vite", "build", "--mode", "capacitor"], {
  BUNDLE_VERSION: version,
  BUILD_STAMP: stamp,
});
const dist = path.join(root, "dist");
if (!fs.existsSync(path.join(dist, "index.html")))
  fail("dist/index.html não foi gerado.");

const appDir = path.join(root, "content", "hosting", "app");
const sha256 = (data) => crypto.createHash("sha256").update(data).digest("hex");

// 2b. A versão em vigor no servidor também vai no deploy: o Hosting troca o site inteiro, e quem
// está no meio do download dela não pode ficar sem os arquivos. Num runner novo (GitHub Actions)
// content/hosting/app começa vazio, então ela é baixada de lá e conferida pelo sha256.
async function keepLive() {
  let response;
  try {
    response = await fetch(`${HOST}/app/latest.json`, { cache: "no-store" });
  } catch (e) {
    fail(`Sem acesso ao Hosting para ler a versão em vigor (${e.message}).`);
  }
  if (response.status === 404)
    return console.log("Nenhuma versão no ar ainda.");
  if (!response.ok) fail(`latest.json respondeu ${response.status}.`);
  const live = await response.json();
  const dir = path.join(appDir, live.version);
  let fetched = 0;
  for (const { file_name, file_hash, download_url } of live.manifest) {
    const dest = path.join(dir, ...file_name.split("/"));
    if (fs.existsSync(dest) && sha256(fs.readFileSync(dest)) === file_hash)
      continue;
    const r = await fetch(download_url);
    if (!r.ok) fail(`Falha ao baixar ${download_url} (${r.status}).`);
    const data = Buffer.from(await r.arrayBuffer());
    if (sha256(data) !== file_hash) fail(`sha256 diferente em ${file_name}.`);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, data);
    fetched++;
  }
  const zip = path.join(appDir, `${live.version}.zip`);
  if (!fs.existsSync(zip)) {
    const r = await fetch(live.url);
    if (!r.ok) fail(`Falha ao baixar ${live.url} (${r.status}).`);
    fs.writeFileSync(zip, Buffer.from(await r.arrayBuffer()));
    fetched++;
  }
  console.log(
    `Versão em vigor ${live.version} mantida (${fetched ? `${fetched} arquivos baixados` : "já estava aqui"}).`,
  );
  return live;
}
const live = await keepLive();
// Versão nova da loja em revisão: quem ainda está na anterior continua recebendo as atualizações
// (o código novo precisa funcionar nas duas; um plugin nativo novo é usado só se existir).
if (!option("native") && live?.natives)
  natives = [...new Set([...live.natives, nativeVersion])];

// 3. Copia para o Hosting e monta a lista de arquivos com sha256.
const target = path.join(appDir, version);
fs.mkdirSync(target, { recursive: true });
const files = [];
const walk = (dir) => {
  for (const name of fs.readdirSync(dir)) {
    // Arquivos ocultos (.DS_Store…) não vão: o Hosting não os serve.
    if (name.startsWith(".")) continue;
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full);
    else files.push(path.relative(dist, full));
  }
};
walk(dist);
const manifest = files.sort().map((rel) => {
  const data = fs.readFileSync(path.join(dist, rel));
  const dest = path.join(target, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, data);
  const web = rel.split(path.sep).join("/");
  return {
    file_name: web,
    file_hash: sha256(data),
    download_url: `${HOST}/app/${version}/${web.split("/").map(encodeURIComponent).join("/")}`,
  };
});
const zipFile = path.join(appDir, `${version}.zip`);
execFileSync("zip", ["-qr", zipFile, ".", "-x", ".*", "*/.*"], { cwd: dist });
const release = {
  version,
  natives,
  url: `${HOST}/app/${version}.zip`,
  manifest,
};
fs.writeFileSync(path.join(appDir, "latest.json"), JSON.stringify(release));
const mb = (n) => (n / 1024 / 1024).toFixed(1);
const total = files.reduce(
  (n, f) => n + fs.statSync(path.join(dist, f)).size,
  0,
);
console.log(
  `✓ Pacote ${version}: ${files.length} arquivos, ${mb(total)} MB (zip ${mb(fs.statSync(zipFile).size)} MB).`,
);

// 4. Mantém só as versões mais novas no Hosting.
const old = fs
  .readdirSync(appDir)
  .filter((n) => n !== "latest.json" && !n.endsWith(".zip"))
  .sort()
  .slice(0, -KEEP);
for (const v of old) {
  fs.rmSync(path.join(appDir, v), { recursive: true, force: true });
  fs.rmSync(path.join(appDir, `${v}.zip`), { force: true });
}

// 5. O APK continua com a versão "builtin": refaz o dist sem o carimbo do pacote.
run("npx", ["vite", "build", "--mode", "capacitor"]);

if (!args.includes("--deploy")) {
  console.log(
    "Sem --deploy: nada foi publicado (arquivos em content/hosting/app).",
  );
  process.exit(0);
}
try {
  // Versão fixa do CLI: a mesma aqui e no GitHub Actions. Lá a credencial vem da conta de
  // serviço (GOOGLE_APPLICATION_CREDENTIALS); aqui, do `npx firebase-tools login`.
  run("npx", [
    "--yes",
    "firebase-tools@15.36.0",
    "deploy",
    "--only",
    "hosting",
    "--project",
    "wordquest-online",
  ]);
} catch {
  fail(
    "A publicação falhou (login feito com `npx firebase-tools login`, ou GOOGLE_APPLICATION_CREDENTIALS no CI?).",
  );
}
console.log(
  `✓ Versão ${version} publicada. Quem tem a ${natives.join(" ou ")} da loja recebe na próxima abertura do app.`,
);
