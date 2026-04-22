# Contrato técnico — Webhook receptor del 304

**Destinatario**: Brian / Santiago (equipo IT SSB).
**Emisor del documento**: Jona Zenteno.
**Versión**: 1 — 2026-04-22.

Este documento describe cómo enviar al dashboard de exportación el JSON del mensaje SAP "304" (oferta de orden). Es el mismo payload que hoy SAP/Dow envía a `POST /api/orders/store` del Importer Laravel.

---

## 1. Endpoint

```
POST https://cctuowthpnstvdgjuomq.supabase.co/functions/v1/ingest-304
```

- HTTPS obligatorio. El servidor es administrado por Supabase, no hay IP fija que whitelistear.

---

## 2. Headers requeridos

| Header | Valor |
|---|---|
| `Content-Type` | `application/json` |
| `X-Webhook-Secret` | `<WEBHOOK_SECRET>` — ver sección 7 |

No se requiere `Authorization` ni ningún otro header.

---

## 3. Body

JSON crudo del 304, tal cual SAP lo genera. Sin wrapping, sin transformaciones, sin escaping adicional.

El endpoint **no valida el schema** del 304 — acepta cualquier JSON sintácticamente válido. Si el formato del mensaje cambia en el futuro, no es necesario coordinar con nosotros antes.

Tamaño esperado: 5–15 KB por payload. Sin límite duro impuesto por nosotros; Supabase Edge Functions soportan hasta ~10 MB.

---

## 4. Respuestas

Todas las respuestas son `application/json` con la estructura indicada.

### 200 — `inserted` (payload nuevo)

```json
{
  "event_id": "6368d0cf-5a11-43b9-9d4b-1c5880e29e72",
  "duplicate": false
}
```

- `event_id` es el UUID que el dashboard asignó al evento. Puede usarse en soporte para referenciar un envío específico.

### 200 — `duplicate` (idempotencia)

```json
{
  "event_id": "6368d0cf-5a11-43b9-9d4b-1c5880e29e72",
  "duplicate": true
}
```

- Significa que **el mismo payload exacto** ya había sido recibido antes. No hay efectos colaterales.
- `event_id` coincide con el asignado la primera vez que se recibió.
- La deduplicación se hace por hash SHA-256 del body crudo. Dos envíos serializados con distinto whitespace son tratados como distintos.

### 400 — `invalid_json`

```json
{ "error": "invalid_json" }
```

- El body no es JSON válido. Revisar el serializador.

### 400 — `body_read_failed`

```json
{ "error": "body_read_failed" }
```

- El body no pudo leerse (conexión interrumpida, body vacío, etc.).

### 401 — `unauthorized`

```json
{ "error": "unauthorized" }
```

- Header `X-Webhook-Secret` ausente o su valor no coincide con el esperado.
- Ningún payload se persiste. El intento queda registrado internamente para auditoría.

### 405 — `method_not_allowed`

```json
{ "error": "method_not_allowed" }
```

- El método HTTP no es `POST`.

### 500 — `internal`

```json
{ "error": "internal" }
```

- Error inesperado del lado del dashboard (base de datos, función, etc.).
- El detalle queda logueado de nuestro lado. No exponemos stack trace en la respuesta.

---

## 5. Ejemplo de invocación con `curl`

```bash
curl -X POST "https://cctuowthpnstvdgjuomq.supabase.co/functions/v1/ingest-304" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: <WEBHOOK_SECRET>" \
  --data-binary @payload_304.json
```

Donde `payload_304.json` es el archivo con el JSON crudo del 304.

En PHP/Laravel (Guzzle):

```php
use GuzzleHttp\Client;

$client = new Client();

$response = $client->post(
    'https://cctuowthpnstvdgjuomq.supabase.co/functions/v1/ingest-304',
    [
        'headers' => [
            'Content-Type' => 'application/json',
            'X-Webhook-Secret' => env('SSB_DASHBOARD_WEBHOOK_SECRET'),
        ],
        'body' => $rawJsonBody, // string crudo, NO json_encode($array)
        'http_errors' => false, // para manejar 4xx/5xx manualmente
    ]
);

$status = $response->getStatusCode();
$data = json_decode((string) $response->getBody(), true);
```

Observaciones:
- Mandar el body como string crudo (el mismo que SAP produce). Si se re-encodea, el hash cambia y la deduplicación puede fallar para el mismo evento lógico.
- Guardar el `event_id` que devuelve la respuesta para trazabilidad.

---

## 6. Política de retries

### Si recibís 5xx (error del servidor)

Reintentar con **backoff exponencial**: 2 s, 4 s, 8 s, hasta un máximo de 3 reintentos. Después de eso, dejar el payload en una cola local y alertar.

El endpoint es **idempotente por diseño**: reenviar el mismo payload nunca causa efectos duplicados.

### Si recibís 4xx (error del cliente)

**No reintentar automáticamente.** Un 4xx implica:
- `401`: el secret está mal configurado — problema de configuración, no se soluciona reintentando.
- `400`: el body no es JSON válido — problema del serializador.
- `405`: método incorrecto — problema del cliente.

En estos casos, loguear el error, alertar a IT, y no mandar más eventos hasta resolver.

### Si recibís `200 duplicate`

**No es un error**. Significa que ese payload ya había sido procesado antes. Tratarlo como éxito. Se puede usar para debounce de reenvíos.

### Timeout recomendado

10 segundos. Si no hay respuesta en ese tiempo, tratar como error de red y reintentar con backoff.

---

## 7. Valor del `WEBHOOK_SECRET`

**El valor no va en este documento** por seguridad. Se entrega por canal privado aparte (mensaje directo, password manager compartido, etc.).

Características:
- String de 48 caracteres hexadecimales.
- No tiene caracteres especiales (`=`, `+`, `/`).
- Puede rotarse sin aviso previo si se detecta compromiso. En ese caso avisamos por canal privado con el valor nuevo.

**Por favor**:
- **No** commitear el secret a git.
- **No** loguearlo en claro.
- Guardarlo en el mismo vault de secrets que usan para otros tokens de integración.

---

## 8. Preguntas frecuentes

**¿Qué pasa si mandan el 304 antes de que SSB lo procese?**
Se persiste igual. El dashboard lo muestra como "nuevo" y la coordinación humana sigue como hasta hoy. No hay bloqueo.

**¿Hay un ambiente de staging?**
Por ahora no. Este endpoint es el único. Si se necesita testing separado, lo armamos.

**¿Cómo pueden verificar del lado del emisor que el evento llegó?**
Guardar el `event_id` que devuelve la respuesta. Con eso podemos confirmar manualmente la recepción. A futuro, si se requiere, podemos agregar un endpoint de consulta.

**¿Qué pasa si el dashboard está caído?**
Van a recibir 5xx o timeout. Deben retener el payload y reintentar con backoff (ver sección 6). La idempotencia garantiza que los reintentos son seguros.

---

## 9. Contacto

Cualquier duda o reporte de error: Jona Zenteno (`jzenteno@ssbint.com`). Alternativa: casilla operativa del equipo de exportación (`expo.rpbb@scbint.com`).
