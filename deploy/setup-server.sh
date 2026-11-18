#!/usr/bin/env bash
# Acrescenta os sites do WordQuest ao servidor da DigitalOcean (Ubuntu, Caddy já instalado e
# servindo outros sites). Não mexe no que já existe:
# - cria o usuário "wqdeploy", que só escreve nas pastas do WordQuest (é ele que o GitHub Actions usa);
# - acrescenta ao /etc/caddy/Caddyfile cada bloco de deploy/caddy/*.caddy que ainda não estiver lá
#   (com cópia de segurança), confere a configuração e recarrega o Caddy; se a conferência falhar,
#   volta o arquivo anterior.
#
# Uso (como root; pode rodar de novo, só acrescenta o que falta):
#   scp deploy/caddy/*.caddy root@SERVIDOR:/tmp/
#   scp <chave pública do deploy>.pub root@SERVIDOR:/tmp/wordquest-deploy.pub   # só na 1ª vez
#   ssh root@SERVIDOR 'bash -s' < deploy/setup-server.sh
# (A chave vai por arquivo: passada como argumento, o ssh a quebraria nos espaços.)
set -euo pipefail
CADDYFILE=/etc/caddy/Caddyfile

# Usuário do deploy: sem senha, só com a chave do GitHub Actions, sem encaminhamentos nem terminal.
id wqdeploy >/dev/null 2>&1 || adduser --disabled-password --gecos "" wqdeploy
if [ -f /tmp/wordquest-deploy.pub ]; then
  install -d -m 700 -o wqdeploy -g wqdeploy /home/wqdeploy/.ssh
  printf 'restrict %s\n' "$(cat /tmp/wordquest-deploy.pub)" > /home/wqdeploy/.ssh/authorized_keys
  chown wqdeploy:wqdeploy /home/wqdeploy/.ssh/authorized_keys
  chmod 600 /home/wqdeploy/.ssh/authorized_keys
  rm -f /tmp/wordquest-deploy.pub
fi
for dir in /var/www/wordquest /var/www/wordquest-jogo; do
  install -d -m 755 -o wqdeploy -g wqdeploy "$dir"
done
command -v rsync >/dev/null || apt-get install -y -qq rsync

# Caddy: cada bloco entra uma vez só (reconhecido pelo primeiro domínio dele).
backup="$CADDYFILE.antes-wordquest-$(date +%Y%m%d-%H%M%S)"
cp "$CADDYFILE" "$backup"
changed=0
for block in /tmp/site.caddy /tmp/jogo.caddy; do
  [ -f "$block" ] || continue
  host=$(grep -m1 -oE '^[a-z0-9.-]+\.[a-z]+' "$block")
  if grep -qE "^${host//./\\.}[ ,{]" "$CADDYFILE"; then
    echo "O Caddyfile já tem $host."
  else
    { echo; cat "$block"; } >> "$CADDYFILE"
    echo "Acrescentado: $host."
    changed=1
  fi
  rm -f "$block"
done
if [ "$changed" = 1 ]; then
  if ! caddy validate --config "$CADDYFILE" --adapter caddyfile; then
    cp "$backup" "$CADDYFILE"
    echo "Configuração inválida: o Caddyfile anterior foi restaurado." >&2
    exit 1
  fi
  caddy fmt --overwrite "$CADDYFILE" || true
  systemctl reload caddy
  echo "Caddy recarregado (cópia do anterior em $backup)."
else
  rm -f "$backup"
fi
echo "Pronto."
