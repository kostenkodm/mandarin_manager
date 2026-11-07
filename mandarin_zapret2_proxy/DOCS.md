# Mandarin Zapret2 Proxy (experimental)

The add-on wraps the upstream ss-zapret2 image v1.0.7 into a local SOCKS5 proxy for selective traffic. No host networking or Docker socket is requested, but NET_ADMIN and NET_RAW are needed in the container.

## Install
1. In Home Assistant: Settings -> Apps -> Install app -> menu -> Repositories.
2. Add: https://github.com/kostenkodm/mandarin_manager#haos-addons
3. Select Mandarin Zapret2 Proxy and install.
4. On Configuration, replace the default allowed_client_ip (127.0.0.1) with your router's LAN IPv4 address. Do not use 0.0.0.0.
5. On Network, keep the port mapped to 11080 (TCP and UDP) unless it conflicts.
6. Start and read the app's Log. If HAOS lacks kernel NFQUEUE support, the engine might not start.

The first start creates /config/zapret2.conf in the add-on's app_config mount. This file persists across rebuilds and can be customized for the ISP.

## Testing with a router
On a router with curl, replace HA_IP with the actual Home Assistant LAN address:

    curl --socks5-hostname HA_IP:11080 --max-time 20 https://api.ipify.org

A successful response verifies SOCKS5 connectivity, not DPI evasion. Try a specifically DPI-blocked domain to verify the anti-DPI strategy.

## sing-box outbound example
Replace HA_IP with the Home Assistant host's LAN address:

    {
      "type": "socks",
      "tag": "zapret2-local-out",
      "server": "HA_IP",
      "server_port": 11080,
      "version": "5"
    }

Use a separate test route in Podkop. Ensure the Home Assistant host bypasses the same Podkop rules to avoid routing loops. Do not replace existing VPN fallbacks until this exit is tested.

## Limitations and safety
- Experimental: has not been runtime-validated on the target HAOS kernel or architecture.
- The proxy has no SOCKS login. The container restricts IPv4 clients to the configured IP, and rejects IPv6. Never forward TCP/UDP 11080 on a WAN router.
- Docker NAT can alter perceived source addresses; do not turn off the ACL to troubleshoot.
- This solves only some DPI disruptions; IP blocking and site-side restrictions remain.
- v1.0.7 upstream includes its own networking and init logic: https://github.com/vernette/ss-zapret2.
- This wrapper does not include upstream binaries; upstream image and components retain their respective licenses.
