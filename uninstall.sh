#!/bin/sh
set -eu
[ "$(id -u)" -eq 0 ] || exit 1
rm -f /usr/bin/mandarin-vpn /usr/bin/mandarin-vpn-guest-prepare \
  /usr/libexec/rpcd/mandarinvpn \
  /usr/share/luci/menu.d/luci-app-mandarin-vpn.json \
  /usr/share/rpcd/acl.d/luci-app-mandarin-vpn.json \
  /www/luci-static/resources/view/mandarin-vpn/index.js
rm -f /tmp/luci-indexcache* 2>/dev/null || true
/etc/init.d/rpcd restart
printf '%s\n' 'Console removed. VPN client profiles and UCI configuration deliberately preserved.'
