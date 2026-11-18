#!/usr/bin/env bash
# Acrescenta o site wordquest.com.br ao servidor da DigitalOcean (Ubuntu, Caddy já instalado e
# servindo outros sites). Não mexe no que já existe:
# - cria o usuário "wqdeploy", que só escreve em /var/www/wordquest (é ele que o GitHub Actions usa);
# - acrescenta o bloco de deploy/Caddyfile ao /etc/caddy/Caddyfile (com cópia de segurança), confere
#   a configuração e recarrega o Caddy; se a conferência falhar, volta o arquivo anterior.
#
# Uso (como root):
#   scp deploy/Caddyfile root@SERVIDOR:/tmp/wordquest.caddy
#   scp <chave pública do deploy>.pub root@SERVIDOR:/tmp/wordquest-deploy.pub
#   ssh root@SERVIDOR 'bash -s' < deploy/setup-server.sh
# (A chave vai por arquivo: passada como argumento, o ssh a quebraria nos espaços.)
set -euo pipefail
DEPLOY_KEY="$(cat /tmp/wordquest-deploy.pub)"
rm -f /tmp/wordquest-deploy.pub
SITE=/var/www/wordquest
CADDYFILE=/etc/caddy/Caddyfile
BLOCK=/tmp/wordquest.caddy

# Usuário do deploy: sem senha, só com a chave do GitHub Actions, sem encaminhamentos nem terminal.
id wqdeploy >/dev/null 2>&1 || adduser --disabled-password --gecos "" wqdeploy
install -d -m 700 -o wqdeploy -g wqdeploy /home/wqdeploy/.ssh
printf 'restrict %s\n' "$DEPLOY_KEY" > /home/wqdeploy/.ssh/authorized_keys
chown wqdeploy:wqdeploy /home/wqdeploy/.ssh/authorized_keys
chmod 600 /home/wqdeploy/.ssh/authorized_keys
install -d -m 755 -o wqdeploy -g wqdeploy "$SITE"
command -v rsync >/dev/null || apt-get install -y -qq rsync

# Caddy: acrescenta o bloco uma vez só.
if ! grep -q "wordquest.com.br" "$CADDYFILE"; then
  backup="$CADDYFILE.antes-wordquest-$(date +%Y%m%d-%H%M%S)"
  cp "$CADDYFILE" "$backup"
  { echo; cat "$BLOCK"; } >> "$CADDYFILE"
  if ! caddy validate --config "$CADDYFILE" --adapter caddyfile; then
    cp "$backup" "$CADDYFILE"
    echo "Configuração inválida: o Caddyfile anterior foi restaurado." >&2
    exit 1
  fi
  caddy fmt --overwrite "$CADDYFILE" || true
  systemctl reload caddy
  echo "Caddy recarregado (cópia do anterior em $backup)."
else
  echo "O Caddyfile já tem o wordquest.com.br: nada mudou nele."
fi
rm -f "$BLOCK"
echo "Pronto: site em $SITE, publicado pelo usuário wqdeploy."
