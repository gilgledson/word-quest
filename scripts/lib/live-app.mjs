// Versão do app ao vivo (src/services/liveUpdate.ts) no Firebase Hosting.
//
// O Hosting troca o site inteiro a cada deploy. Quem publica o site (o app novo em publish-app.mjs
// ou o conteúdo em publish-content.mjs) precisa levar junto a versão do app que está no ar: senão os
// arquivos dela somem, e o `latest.json` volta para a cópia antiga que estiver em content/hosting.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const sha256 = (data) => crypto.createHash("sha256").update(data).digest("hex");

/**
 * Baixa para `appDir` a versão em vigor (arquivos conferidos pelo sha256 e o .zip). Com
 * `writeLatest`, grava também o `latest.json` do ar, para o deploy republicá-lo igual.
 * Devolve o `latest.json` em vigor (ou undefined, sem versão no ar). Erros viram exceções.
 */
export async function keepLiveApp({ host, appDir, writeLatest = false }) {
  const response = await fetch(`${host}/app/latest.json`, {
    cache: "no-store",
  });
  if (response.status === 404) {
    console.log("Nenhuma versão do app no ar ainda.");
    return undefined;
  }
  if (!response.ok)
    throw new Error(`latest.json respondeu ${response.status}.`);
  const text = await response.text();
  const live = JSON.parse(text);
  const dir = path.join(appDir, live.version);
  let fetched = 0;
  for (const { file_name, file_hash, download_url } of live.manifest) {
    const dest = path.join(dir, ...file_name.split("/"));
    if (fs.existsSync(dest) && sha256(fs.readFileSync(dest)) === file_hash)
      continue;
    const r = await fetch(download_url);
    if (!r.ok)
      throw new Error(`Falha ao baixar ${download_url} (${r.status}).`);
    const data = Buffer.from(await r.arrayBuffer());
    if (sha256(data) !== file_hash)
      throw new Error(`sha256 diferente em ${file_name}.`);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, data);
    fetched++;
  }
  const zip = path.join(appDir, `${live.version}.zip`);
  if (!fs.existsSync(zip)) {
    const r = await fetch(live.url);
    if (!r.ok) throw new Error(`Falha ao baixar ${live.url} (${r.status}).`);
    fs.writeFileSync(zip, Buffer.from(await r.arrayBuffer()));
    fetched++;
  }
  if (writeLatest) {
    fs.mkdirSync(appDir, { recursive: true });
    fs.writeFileSync(path.join(appDir, "latest.json"), text);
  }
  console.log(
    `Versão em vigor ${live.version} mantida (${fetched ? `${fetched} arquivos baixados` : "já estava aqui"}).`,
  );
  return live;
}
