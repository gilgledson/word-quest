// Lista de palavras do inglês (scripts/data/en/dictionary.txt) a partir da ENABLE (Enhanced North
// American Benchmark Lexicon, domínio público): uma palavra por linha, em minúsculas.
// Uso: node scripts/build-dictionary-en.mjs <enable1.txt> [saida]
// Fonte: https://raw.githubusercontent.com/dolph/dictionary/master/enable1.txt
// A lista derivada NÃO entra no repositório (ver scripts/README.md), como a do português.
import fs from "node:fs";

const [, , input, output = "scripts/data/en/dictionary.txt"] = process.argv;
if (!input) {
  console.error(
    "Uso: node scripts/build-dictionary-en.mjs <enable1.txt> [saida]",
  );
  process.exit(1);
}
const BLOCKED = new Set(
  "fuck fucks fucked fucker shit shits shitty cunt cunts cock cocks dick dicks piss pissed slut sluts whore whores bitch bastard fag fags faggot nigger nigga rape raped rapes rapist nazi nazis porn porno tit tits twat wank wanker dildo jizz spic kike chink gook dyke homo coon retard".split(
    " ",
  ),
);
const words = new Set(
  fs
    .readFileSync(input, "utf8")
    .split(/\r?\n/)
    .map((w) => w.trim())
    .filter((w) => /^[a-z]{2,9}$/.test(w) && !BLOCKED.has(w))
    .map((w) => w.toUpperCase()),
);
fs.writeFileSync(output, [...words].join("\n") + "\n");
console.log(`${words.size} palavras gravadas em ${output}`);
