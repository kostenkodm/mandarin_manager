# Mandarin Zapret2 Proxy for Home Assistant OS

Experimental Home Assistant OS add-on: a LAN SOCKS5 endpoint backed by the upstream ss-zapret2 anti-DPI container.

## Install from Home Assistant

Open Settings -> Apps -> Install app -> menu (three dots) -> Repositories.
Add this repository URL (including the branch suffix):

    https://github.com/kostenkodm/mandarin_manager#haos-addons

Find "Mandarin Zapret2 Proxy" in the app store, install it, and configure the allowed client's IP address before starting.

This is an experimental integration: its operation depends on NFQUEUE/kernel features on the HAOS host. It has not been runtime-tested on all HAOS platforms. Do not expose SOCKS5 to the internet.

The default allowed client is loopback-only, so connecting from the LAN requires explicitly setting the router's LAN IP in the add-on configuration.

Upstream: https://github.com/vernette/ss-zapret2
See mandarin_zapret2_proxy/DOCS.md for details.
