#!/bin/sh
# Wrapper for a Home Assistant OS app; network namespace remains isolated.
set -eu
log() { printf '[zapret2-proxy] %s\n' "$*"; }
fail() { log "ERROR: $*" >&2; exit 1; }

OPTIONS=/data/options.json
[ -r "$OPTIONS" ] || fail "Missing HAOS options.json"
ALLOWED_CLIENT_IP="$(jq -er '.allowed_client_ip // empty' "$OPTIONS")" || fail "Set allowed_client_ip"
VERBOSE="$(jq -r '.verbose // false' "$OPTIONS")"

# Validate IPv4; fail closed if empty/malformed.
printf '%s\n' "$ALLOWED_CLIENT_IP" | grep -Eq '^([0-9]{1,3}\.){3}[0-9]{1,3}$' || fail "allowed_client_ip must be IPv4"
OLD_IFS="$IFS"
IFS=.
set -- $ALLOWED_CLIENT_IP
IFS="$OLD_IFS"
[ "$#" -eq 4 ] || fail "Invalid IPv4"
for octet in "$@"; do
  case "$octet" in ''|*[!0-9]*) fail "Invalid IPv4";; esac
  [ "$octet" -le 255 ] || fail "Invalid IPv4"
done
[ "$ALLOWED_CLIENT_IP" != "0.0.0.0" ] || fail "Do not allow all clients"

mkdir -p /config /data
chmod 0700 /data
if [ ! -f /config/zapret2.conf ]; then
  cp /opt/ha-zapret2/config.default /config/zapret2.conf
  chmod 0600 /config/zapret2.conf
  log "Created editable configuration in /config/zapret2.conf"
fi
# Upstream expects its config file under /opt/zapret2/config.
if [ ! -L /opt/zapret2/config ]; then
  [ ! -e /opt/zapret2/config ] || rm -f /opt/zapret2/config
  ln -s /config/zapret2.conf /opt/zapret2/config
fi
# Persist locally customized anti-DPI files without host network access.
for rel in lua files/fake init.d/sysv/custom.d init.d/custom.d.examples.linux; do
  mkdir -p "/config/$rel"
  dest="/opt/zapret2/$rel"
  if [ ! -e "$dest" ] && [ ! -L "$dest" ]; then
    mkdir -p "$(dirname "$dest")"
    ln -s "/config/$rel" "$dest"
  fi
done

if [ ! -s /data/ss_password ]; then
  od -An -N32 -tx1 /dev/urandom | tr -d ' \n' > /data/ss_password
  chmod 0600 /data/ss_password
fi
export SS_PASSWORD="$(cat /data/ss_password)"
export SS_PORT=8388
export SOCKS_PORT=1080
export SS_ENCRYPT_METHOD=chacha20-ietf-poly1305
export SS_TIMEOUT=300
if [ "$VERBOSE" = "true" ]; then export SS_VERBOSE=1; else export SS_VERBOSE=0; fi

# Only the selected source IP may use the unauthenticated SOCKS service.
iptables -I INPUT 1 -i eth0 -p tcp --dport 1080 ! -s "$ALLOWED_CLIENT_IP/32" -j REJECT || fail "Cannot install TCP ACL"
iptables -I INPUT 1 -i eth0 -p udp --dport 1080 ! -s "$ALLOWED_CLIENT_IP/32" -j REJECT || fail "Cannot install UDP ACL"
# Deny access over IPv6, including from non-LAN interfaces.
command -v ip6tables >/dev/null 2>&1 || fail "Missing ip6tables for IPv6 protection"
ip6tables -I INPUT 1 -p tcp --dport 1080 -j REJECT || fail "Cannot install IPv6 TCP ACL"
ip6tables -I INPUT 1 -p udp --dport 1080 -j REJECT || fail "Cannot install IPv6 UDP ACL"

log "LAN SOCKS5 internal port 1080, allowed IPv4 client: $ALLOWED_CLIENT_IP"
log "Set published TCP/UDP port in the HAOS app Network tab (default 11080)."
log "Starting upstream ss-zapret2 in its isolated network namespace."
exec /opt/entrypoint.sh
