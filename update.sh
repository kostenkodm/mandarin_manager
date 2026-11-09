#!/bin/sh
# Mandarin Manager update. Always downloads a fixed, user-owned GitHub repository.
set -eu
REPO='https://raw.githubusercontent.com/kostenkodm/mandarin_manager/main/dist'
IS_RPC="${MANDARIN_UPDATE_RPC:-0}"
WORK="$(mktemp -d /tmp/mandarin-update.XXXXXX)" || exit 1
trap 'rm -rf "$WORK"' EXIT HUP INT TERM
fetch() {
    if command -v uclient-fetch >/dev/null 2>&1; then
        uclient-fetch -O "$2" "$1"
    else
        wget -O "$2" "$1"
    fi
}
run_update() {
    fetch "$REPO/mandarin-manager.tar.gz" "$WORK/mandarin-manager.tar.gz"
    fetch "$REPO/mandarin-manager.sha256" "$WORK/mandarin-manager.sha256"
    expected="$(awk 'NF {print $1; exit}' "$WORK/mandarin-manager.sha256")"
    actual="$(sha256sum "$WORK/mandarin-manager.tar.gz" | awk '{print $1}')"
    [ -n "$expected" ] && [ "$expected" = "$actual" ] || { echo 'Checksum mismatch' >&2; return 1; }
    tar -tzf "$WORK/mandarin-manager.tar.gz" | grep -q '^mandarin-manager/install.sh$' || { echo 'Invalid archive' >&2; return 1; }
    mkdir "$WORK/unpack"
    tar -xzf "$WORK/mandarin-manager.tar.gz" -C "$WORK/unpack"
    [ -f "$WORK/unpack/mandarin-manager/install.sh" ] || return 1
    # Refuse downgrades when a stale distribution is still published.
    old="$(cat /usr/share/mandarin-vpn/VERSION 2>/dev/null || printf '0.0.0')"
    new="$(cat "$WORK/unpack/mandarin-manager/VERSION")"
    if ! awk -v old="$old" -v new="$new" 'BEGIN {
        split(old,a,"."); split(new,b,".");
        for(i=1;i<=3;i++) {x=a[i]+0; y=b[i]+0; if(y>x)exit 0; if(y<x)exit 1;}
        exit 0
    }'; then
        echo "Refusing downgrade from $old to $new; publish the new dist first" >&2
        return 1
    fi
    MANDARIN_SKIP_RPC_RESTART="$IS_RPC" sh "$WORK/unpack/mandarin-manager/install.sh"
    cat "$WORK/unpack/mandarin-manager/VERSION" > "$WORK/version"
}
if run_update > "$WORK/log" 2>&1; then
    ver="$(cat "$WORK/version" 2>/dev/null || echo unknown)"
    if [ "$IS_RPC" = 1 ]; then
        # Allow the HTTP RPC request to complete before replacing rpcd.
        (sleep 5; /etc/init.d/rpcd restart) </dev/null >/dev/null 2>&1 &
        jq -n --arg version "$ver" '{ok:true, version:$version, message:"Обновление установлено. Обновите страницу через несколько секунд."}'
    else
        cat "$WORK/log"
        printf '\nInstalled version: %s\n' "$ver"
    fi
else
    tail -n 15 "$WORK/log" >&2 || true
    if [ "$IS_RPC" = 1 ]; then
        error="$(tail -n 3 "$WORK/log" | tr '\n' ' ' | cut -c 1-300)"
        jq -n --arg error "$error" '{ok:false, error:$error}'
        exit 0
    fi
    exit 1
fi
