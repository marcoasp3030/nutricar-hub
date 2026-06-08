# Documentação da API TV - NutriCar Hub

Esta API permite a comunicação entre o aplicativo APK instalado nas TVs e o servidor NutriCar Hub.

## Configuração de Autenticação

Todas as requisições devem incluir os seguintes headers:

- `x-api-key`: Chave secreta gerada no painel administrativo.
- `x-unit-id`: UUID único da unidade de TV (disponível no cadastro da loja).
- `Content-Type`: `application/json`

**Base URL:** `https://[SEU_PROJETO_ID].supabase.co/functions/v1/tv-api`

---

## Endpoints

### 1. Obter Playlist
Retorna a playlist atual e todos os itens de mídia atribuídos a esta TV.

- **URL:** `/playlist`
- **Método:** `GET`
- **Resposta de Sucesso (200):**
```json
{
  "unit": {
    "id": "uuid-da-tv",
    "label": "TV 01 - Loja Centro",
    "format": "horizontal",
    "store_id": "uuid-da-loja"
  },
  "playlist": {
    "id": "uuid-da-playlist",
    "name": "Promoções Junho",
    "orientation": "horizontal",
    "items": [
      {
        "id": "uuid-item",
        "media_type": "image",
        "media_url": "https://url-da-imagem.jpg",
        "duration_seconds": 15,
        "transition": "fade",
        "sort_order": 0,
        "rotation": 0
      },
      {
        "id": "uuid-item-2",
        "media_type": "video",
        "media_url": "https://url-do-video.mp4",
        "duration_seconds": 30,
        "transition": "slide",
        "sort_order": 1,
        "rotation": 0
      }
    ]
  }
}
```

### 2. Heartbeat (Pulso)
Informa ao servidor que a TV está online e envia métricas de hardware. Deve ser chamado a cada **30 segundos**.

- **URL:** `/heartbeat`
- **Método:** `POST`
- **Payload:**
```json
{
  "metrics": {
    "cpu": 15,
    "memory_usage": 450,
    "storage_free": 1200,
    "app_version": "1.2.0"
  }
}
```
- **Resposta de Sucesso (200):**
```json
{
  "ok": true,
  "server_time": "2026-06-08T01:00:00.000Z"
}
```

### 3. Buscar Comandos
Verifica se existem comandos remotos (como recarregar ou reiniciar) pendentes para esta TV.

- **URL:** `/commands`
- **Método:** `GET`
- **Resposta de Sucesso (200):**
```json
{
  "commands": [
    {
      "id": "uuid-comando",
      "command": "reload",
      "payload": {},
      "created_at": "2026-06-08T01:00:00Z"
    }
  ]
}
```
*Comandos comuns: `reload`, `restart`, `change_playlist`, `update`, `screenshot`, `set_volume`.*

### 4. Confirmar Comando (Ack)
Informa ao servidor que um comando foi recebido e executado, removendo-o da fila de pendentes.

- **URL:** `/commands/ack`
- **Método:** `POST`
- **Payload:**
```json
{
  "command_id": "uuid-do-comando-recebido"
}
```
- **Resposta de Sucesso (200):**
```json
{ "ok": true }
```

### 5. Enviar Logs
Envia logs de erro ou eventos de reprodução para monitoramento.

- **URL:** `/logs`
- **Método:** `POST`
- **Payload:**
```json
{
  "logs": [
    {
      "level": "info",
      "event": "playback_start",
      "details": { "media_id": "uuid-da-midia" }
    },
    {
      "level": "error",
      "event": "video_buffer_timeout",
      "details": { "media_url": "..." }
    }
  ]
}
```
- **Resposta de Sucesso (200):**
```json
{ "ok": true, "count": 2 }
```

### 6. Verificar Atualização (OTA)
Verifica se existe uma versão mais recente do APK para download automático.

- **URL:** `/ota/check`
- **Método:** `GET`
- **Query Params:** `current_version_code=10&channel=stable`
- **Resposta de Sucesso (200 - Com atualização):**
```json
{
  "update_available": true,
  "current_version_code": 10,
  "update": {
    "version": "1.1.0",
    "version_code": 11,
    "file_url": "https://...",
    "file_size_bytes": 15728640,
    "checksum_sha256": "hash-para-validacao",
    "is_mandatory": true,
    "release_notes": "Correção de bugs na reprodução de vídeos."
  }
}
```

---

## Códigos de Erro

- **401 Unauthorized**: Falha na autenticação (header `x-api-key` ausente ou inválido).
- **404 Not Found**: Unidade de TV (`x-unit-id`) não encontrada no sistema.
- **429 Too Many Requests**: Rate limit atingido (limite de 120 requisições por minuto).
- **500 Internal Server Error**: Erro inesperado no servidor.
