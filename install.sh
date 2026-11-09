#!/bin/sh
# Run inside unpacked project directory on OpenWrt.
set -eu
[ "$(id -u)" -eq 0 ] || { echo 'Run as root'; exit 1; }
command -v jq >/dev/null || { echo 'Missing jq: install via apk add jq'; exit 1; }
command -v uci >/dev/null || { echo 'Missing OpenWrt uci'; exit 1; }
[ -d /usr/share/luci/menu.d ] || { echo 'LuCI not installed'; exit 1; }
[ -d /usr/libexec/rpcd ] || mkdir -p /usr/libexec/rpcd
[ -d /usr/share/rpcd/acl.d ] || mkdir -p /usr/share/rpcd/acl.d
src="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)/root"
[ -f "$src/usr/libexec/rpcd/mandarinvpn" ] || { echo 'Package root missing'; exit 1; }
# OpenWrt BusyBox has cp/chmod but often no GNU install utility.
BACKUP="/root/mandarin-vpn-backups/console-upgrade-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP" || exit 1
copy_file() {
    mode=$1; relative=$2
    dest="/$relative"
    mkdir -p "${dest%/*}" || exit 1
    if [ -f "$dest" ]; then
        mkdir -p "$BACKUP/${relative%/*}"
        cp -p "$dest" "$BACKUP/$relative" || exit 1
    fi
    # Atomic replacement: the updater and rpcd plugin may be executing while
    # their own files are being upgraded. In-place cp truncates a live script
    # and can terminate it before a JSON response reaches LuCI.
    staged="$(mktemp "${dest}.new.XXXXXX")" || exit 1
    if ! cp "$src/$relative" "$staged" || ! chmod "$mode" "$staged" || ! mv -f "$staged" "$dest"; then
        rm -f "$staged"
        echo "Failed to install $relative" >&2
        exit 1
    fi
}
copy_file 0755 usr/bin/mandarin-vpn
copy_file 0755 usr/bin/mandarin-manager-update
copy_file 0755 usr/bin/mandarin-vpn-guest-diagnose
copy_file 0755 usr/bin/mandarin-vpn-guest-prepare
copy_file 0755 usr/libexec/rpcd/mandarinvpn
copy_file 0644 usr/share/luci/menu.d/luci-app-mandarin-vpn.json
copy_file 0644 usr/share/rpcd/acl.d/luci-app-mandarin-vpn.json
copy_file 0644 www/luci-static/resources/view/mandarin-vpn/index.js
printf 'Previous console files backed up to: %s\n' "$BACKUP"
mkdir -p /usr/share/mandarin-vpn
cat "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)/VERSION" > /usr/share/mandarin-vpn/VERSION
rm -f /tmp/luci-indexcache* 2>/dev/null || true
if [ "${MANDARIN_SKIP_RPC_RESTART:-0}" != 1 ]; then /etc/init.d/rpcd restart; fi
printf '\nInstalled Mandarin VPN Control Center.\n'
printf 'LuCI: Services -> Mandarin VPN\n'
printf 'RPC test: ubus call mandarinvpn status\n'
printf 'No VPN/firewall/network settings have been changed.\n'
