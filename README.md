# Mandarin Manager 0.6.0 — Tachyon Edition

Локальная LuCI-панель OpenWrt для управления AmneziaWG Home/Guest и мониторинга Tachyon.

## Изменения 0.6.0

- Живой статус Tachyon Core и DNS, ошибка секции main и выбранный сервер URLTest.
- Все пять исходящих VPN (Prague, Zurich, wgkir_AWG и два VLESS) определяются динамически через Clash API, без жёстко заданного числа.
- Проверка Zapret2, процесса nfqws2 и очереди NFQUEUE 4300; только чтение, без вмешательства в nftables.
- AWG Guest добавляется в source_network_interfaces действующего Tachyon, а не в устаревший Podkop.
- Диагностика Guest проверяет текущий движок; управление домашними и гостевыми клиентами остаётся прежним.
- Установка обновления не меняет существующие VPN, firewall или маршруты; прежние файлы панели сохраняются в /root/mandarin-vpn-backups.

## Штатное обновление

В LuCI: **Службы → Mandarin VPN → Обновить приложение из GitHub**.

Менеджер скачивает `dist/mandarin-manager.tar.gz` вместе с `dist/mandarin-manager.sha256`, сверяет SHA-256 и обновляет только собственные файлы панели.

## Первая установка

```sh
wget -O /tmp/mandarin-update.sh https://raw.githubusercontent.com/kostenkodm/mandarin_manager/main/update.sh
sh /tmp/mandarin-update.sh
```

## Безопасность

Не публикуйте VPN-профили, приватные ключи, UCI-конфигурации устройства, журналы подключений. Статус Tachyon не возвращает приватные ключи и адреса серверов. LuCI/rpcd не должны быть доступны из WAN.
