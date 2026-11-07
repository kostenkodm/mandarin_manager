FROM vernette/ss-zapret2:v1.0.7
ARG BUILD_VERSION=0.1.1
ARG BUILD_ARCH
LABEL io.hass.version="${BUILD_VERSION}" io.hass.type="app" io.hass.arch="${BUILD_ARCH}"
RUN apk add --no-cache jq
COPY config.default /opt/ha-zapret2/config.default
COPY start.sh /opt/ha-zapret2/start.sh
RUN chmod 0755 /opt/ha-zapret2/start.sh
ENTRYPOINT ["/opt/ha-zapret2/start.sh"]
