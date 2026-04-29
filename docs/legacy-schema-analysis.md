# Análisis de schema legacy — Importer + Metric-API

**Generado**: 2026-04-29 · **Scope**: solo exportación marítima Dow / PBB Polisur. Repos read-only.

**Repos analizados:**
- `~/projects/importer` — Laravel 8 + PHP, dominio: order management de SSB (consume `304` de Dow vía Importer, persiste todo)
- `~/projects/metric-api` — Flask + Python, dominio: dashboards operativos + integraciones (genera `301`/`315` para SAP, integra con Interlog)

**Confianza global:** ALTA en Importer (Eloquent + migrations explícitas). MEDIA en Metric (SQL crudo en scripts, varios entry points heredados).

---

## 1. Importer — schema de exportación

### 1.1 Tablas core

#### `orders` (`database/migrations/2021_11_25_212516_create_orders_table.php`)
PO master — una fila por PO de Dow. Columnas relevantes para 304 / export:

| Columna | Tipo | Notas |
|---|---|---|
| `id` | bigint | PK |
| `number` | bigint unique | Numeración interna SSB (no es la PO) |
| `purchase_order` | string | **PO del 304** — match con `ReferenceIdentificationGeneral[qual=PO]` |
| `order_type` | string | `'E'` exportación, otros para impo |
| `status_id` | FK → `statuses` | Estado del ciclo de vida |
| `incoterm_id` | FK → `incoterms` | |
| `transportation_mode_id` | FK → `transportation_modes` | |
| `destination_country_id` | FK → `countries` | |
| `destination_port_id` | FK → `ports` | |
| `currency_id` | FK → `currencies` | |
| `business_group_id`, `business_id`, `company_id` | FKs | Cliente (Dow / PBB Polisur) |
| `dispatch_number` | string | **Número de despacho/permiso** — JOIN con `simis.nro_despacho` en Metric |
| `dispatch_date` | date | |
| `dispatch_id` | FK → `dispatches` | |
| `bill_of_landing` | string | **BL number** (sí, con el typo "landing") |
| `compliment_date` | date | |
| `numerointerno` | string | Aparece también en 304 (1.8% de docs) |
| `delivery_location`, `terms_of_sale`, `terms_of_sale_description` | strings | Replicados desde el 304 |
| `total_amount` | double | |
| `invoice_number` | string | |
| `notes`, `delay_reasons` | longtext | |
| `is_active` | bool | |
| timestamps + soft delete | | |

#### `shipments` (`2021_11_25_221652_create_shipments_table.php`)
1:N de `orders` (un PO puede tener varios shipments). Tabla muy ancha — replica casi todo el 304 en columnas planas. Columnas relevantes:

| Columna | Notas |
|---|---|
| `id` | PK |
| `shipment_number` | **`ShipmnetIdentificationNumber` del 304** |
| `booking_number`, `ocean_booking_number` | Booking del carrier |
| `routing_number` | `RoutingNumber` del 304 (siempre `33708426259` para Dow) |
| `channel` | enum semáforo aduana (green/orange/red) |
| `shipper_name`, `shipper_id` (FK) | |
| `carrier_id` (FK), `vessel_id` (FK) | |
| `flight_voyage_number` | Voyage |
| `estimated_departure_date`, `actual_departure_date` | **ETD** |
| `estimated_arrival_date`, `actual_arrival_date` | **ETA** |
| `delivery_date`, `good_issue_actual_date`, `pdf_ar_date` | |
| `billOf_landing_number` | **BL number** (duplica `orders.bill_of_landing`) |
| `port_terminal_place_receipt`, `port_terminal_port_loading`, `port_terminal_port_discharge`, `port_terminal_destination` | (3 columnas cada uno: code, name, country_code) — POL / POD / TS |
| `transportation_terms_code`, `delivery_location`, `terms_of_sale`, `terms_of_sale_description`, `tariff_service_code`, `transaction_set_purpose_code`, `application_type` | Replicados literal del 304 |
| `containers_quantity` | (`add_containers_quantity_in_shipments`, 2022-03) |
| `weight`, `gw_kg_shipment` | |
| `lading_quantity`, `packaging_form_code` | |
| `motor_carrier_name`, `motor_carrier_code`, `steamship_company_name`, `vendor_code_steamship_company` | |
| `cutoff_date_at_departure`, `documentation_cutOff_time`, `document_cutoff_date` | |
| `entry_terminal` (`2022_04_29`) | |
| `remarks_free_form_message` | Notas del 304 |
| `shipment_condition_id`, `operation_type_id`, `transportation_mode_id` | FKs |

> **Nota:** denormalización fuerte. Columnas `terms_of_sale`, `delivery_location`, etc. aparecen tanto en `orders` como en `shipments`. El `OrderController::store` los duplica al ingerir el 304.

#### `entities` (`2021_12_09_133404_create_entities_table.php`)
Una fila por participante en el shipment. Columns:

| Columna | Notas |
|---|---|
| `id` | PK |
| `entityidentifier` | Códigos del 304: `EX` (exporter), `ST` (ship-to), `N1` (notify), `BT` (bill-to), `NP` (notify party), `CN` (consignee), `16` (issuer), `DIR`, `PK`, `PK2`-`PK4`, `AO` |
| `name`, `code`, `tax_id`, `address`, `postal_code` | |
| `country_code`, `location_identifier` | (location = state/province) |
| `contact_name`, `contact_email` | |
| `order_id` (FK), `shipment_id` (FK), `city_id` (FK) | |

#### `pivot_entities` (`2021_12_09_141241_create_pivot_entities_table.php`)
Tabla pivote N:N además de las FKs directas en `entities`. Columnas: `entity_id`, `order_id`, `shipment_id`, `is_active`.

> **Sorpresa:** la cardinalidad real es ambigua — `entities` ya tiene FKs `order_id` / `shipment_id`, y *además* hay una pivote. Posiblemente legacy (el modelo viejo era N:N, después se simplificó a 1:N con FK directa, sin migrar la pivote). **Pregunta abierta para Brian.** [?]

#### `containers` (`2021_12_09_201612_create_containers_table.php`)
| Columna | Notas |
|---|---|
| `id`, `name` (= container number), `code` | |
| `container_type_id` FK → `container_types` (40CZ, VAEM, SGRA, T117, VAGR del 304) |
| `container_owner_id` FK → `container_owners` | SOC / COC |
| `tara` (peso tara) | (2022-04) |
| `integroalkippin_date` | (2022-06) |

> El campo `shipment_id` fue **removido** en `2022_03_21_171935_delete_shipment_id_in_containers.php`. Hoy la relación contenedor↔shipment es vía `materials.container_id` (`add_container_id_in_materials.php`, 2022-03-21). Items y containers están relacionados por items, no directamente.

#### `route_information` (`2021_12_09_164848_create_route_information_table.php`)
| Columna | Notas |
|---|---|
| `id`, `standard_carrier_alpha_code` (SCAC, siempre `SSB`) | |
| `transportation_method_type_code` | MOT (`O` ocean, `M` motor) |
| `free_form_description`, `route_description` | Códigos internos SSB |
| `order_id`, `shipment_id` FKs | |

#### `log_jsons` (`2022_10_05_160727_create_log_jsons_table.php`)
| Columna | Notas |
|---|---|
| `id`, `order_id` FK, `status` (bool) | |
| `po_number`, `shipment_number` | Indexados, búsqueda |
| `json` (text) | Payload completo del request |
| `type_json` | **Solo 2 valores en el código**: `'304'` (orders ingest) y `'factura'` (invoice ingest) |
| timestamps + soft delete | |

Source: `OrderController::cargar_log()` línea 859-868 + `FacturaOrderController::cargar_log()` línea 119-122.

### 1.2 Modelos Eloquent — relaciones clave

| Modelo | `$table` | Relaciones principales |
|---|---|---|
| `Order` | `orders` | `hasMany Shipment`, `hasMany Material`, `hasMany PivotEntity`, `belongsTo Status`, `belongsTo Vendor`. Scopes: `scopePurchaseOrder`, `scopeShipmentNumber`, `scopeStatusId`, `scopeOceanBookingNumber`, `scopeShipmentConditionId` |
| `Shipment` | `shipments` | `belongsTo Order`, `belongsTo Carrier`, `belongsTo Vessel`, `belongsTo Shipper`, `hasMany PivotEntity`, `hasMany Material` |
| `Entity` | `entities` | helper `entity_name(code)` traduce `'EX'→'Exporter'`, `'CN'→'Consignee'`, etc. |
| `LogJson` | `log_jsons` | scopes `scopePoNumber`, `scopeShipmentNumber`, `scopeCreatedAt` |
| `Status` | `statuses` | `hasMany Order` |

### 1.3 Flujo de ingesta del 304

`Api/OrderController::store()` (`app/Http/Controllers/Api/OrderController.php:254`):

1. Recibe POST con body completo del 304 (`request->all()` incluye `purchase_order` y `ShipmnetIdentificationNumber`).
2. **Find-or-create `Order`** por `purchase_order` (línea 266-270).
3. **Find-or-create `Shipment`** por `(shipment_number, order_id)` (línea 451).
4. Persiste `log_jsons` row con `type_json='304'`, `json=request->all()`, FKs a order/shipment (línea 435-441 + `cargar_log` línea 859).
5. Itera `ReferenceIdentificationGeneral` → `reference_identifications_general` table.
6. Itera `Entities` → `entities` table (FKs a order y shipment).
7. Itera `Items` → `materials` + sub-arrays a sus tablas hijas.
8. Itera `RouteInformation` → `route_information`.
9. Itera `DateTimeReference` → tabla `date_time_references` (probable, no verificada).

> **Sin transacciones explícitas vistas.** Si falla a mitad, el row de `log_jsons` ya se persiste arriba. Es un design pattern de **persist-first, process-after** primitivo (mismo principio que tu Walking Skeleton). [CONFIANZA: ALTA]

### 1.4 Estados / status del ciclo de vida

`statuses` table es plana (`name`, `code`, `is_active`). El **único valor seedeado** (`StatusSeeder.php:17-22`) es:

- `code='N'`, `name='Nueva'`

Los demás estados se crearon manualmente en producción y **no están en código**. Los IDs concretos están referenciados en código de Metric (no Importer):

- `status_id = 9` → arrival (Metric setea cuando hay `VA actual_date`)
- `status_id = 12` → departure (Metric setea cuando hay `VD actual_date`)

> **Pregunta abierta para Brian:** dump completo de `statuses` table en producción. [?]

### 1.5 Endpoints de exportación activos

#### `routes/api.php` (públicos, sin JWT)
- `POST /api/orders/store` → `OrderController@store` — **entry point del 304**
- `POST /api/orders/factura` → `FacturaOrderController@store` — recibe facturas
- `POST /api/orders/ConsultaOrder` → `ConsultaOrderController@ConsultaOrder` (JWT)
- `POST /api/shipments/store` → `ShipmentController@storeShipment` (JWT)
- `POST /api/materials/store` → `MaterialController@storeMaterial` (JWT)

#### `routes/web.php` (UI, autenticada)
- `prefix('admin')` con middleware `auth` + `admin`:
  - `prefix('orders')`: index/create/store/edit/update/show, `listJson`, `clone`, `close`, `block`, `import`, `cargar_files`, `downloadZip`, `mail`
  - `prefix('jsonLogs')`: index, `listarLogsJson` (DataTable), `descargaJson` ← lo que usaste para extraer

---

## 2. Metric-API — flujos 301, 315, Interlog

### 2.1 Stack y conexión

- Flask con blueprints (`prefolder_bp`, `interlog_bp`, `cargo_bp`, etc.).
- DB: **MySQL** (no Postgres) vía `mysql.connector` (Python). Config: `config/db_connection.py:12`.
- Host: `35.193.12.137:3306`, user `developer`.
- DB names: `ssb_internacional` (Dow, vía header `X-Database`) o `ssb_internacional_bostik` (default).
- **Probablemente la misma DB que Importer**, accedida desde dos stacks distintos. [CONFIANZA: MEDIA — confirmar si las tablas `orders`, `shipments`, `entities` que ve Metric son las mismas que Importer escribe.] [?]

### 2.2 Generación del 301 (aceptación de orden)

**Archivo:** `send301.py` (`/home/jzenteno/projects/metric-api/send301.py`).

**Tabla destino:** `report_301` (creada manualmente, no hay migration en el repo).

**Funciones:**
- `add_301(shipment_sent)` (línea 51) — INSERT inicial: solo `shipment_id` + `created_at`.
- `patch_301(...)` (línea 114) — UPDATE post-aceptación, agrega:
  - `first_leg_mode_id`, `first_office_number`, `first_motor_carrier`
  - `second_leg_mode_id`, `second_office_number`, `second_motor_carrier`
  - `port_terminal_id`, `remarks`, `creator`
- `get_get_301(...)` (línea 216) — SELECT enriquecido, JOIN con `transport_groups` (×2 legs), `carrier_leg` (×2), `portal_terminal_transpotation`.

**Endpoints (en `myproject.py`):**
- `POST /expo-general/create-301` → llama `add_301`
- `PATCH /expo-general/patch_301/<shipment_id>` → llama `patch_301`

**Trigger:** **Manual desde UI** (probablemente el dashboard Dow del frontend), no automatizado por evento.

**Cómo llega a SAP:** **No hay HTTP/SFTP visible**. El `report_301` se persiste en MySQL y SAP probablemente la **consume via batch o trigger nocturno** del lado de Importer/SAP. **No está implementado HTTP push a SAP en este repo.** [?]

### 2.3 Generación del 315 (status / tracking)

**Archivos:** `send315.py` + `315/consultas_315.py`.

**Tabla destino:** `report_315`.

**Función `add_315`** (línea 35): INSERT con campos `shipment_status_code`, `estimated_date`, `actual_date`, `user_name`, `shipment_id`.

**Función `update_order_event_315_v2`** (línea 424 en `consultas_315.py`): procesa eventos:

| Código | Significado | Side effects |
|---|---|---|
| `VD` | Vessel Depart | `shipments.actual_departure_date = actual_date`, `orders.status_id = 12` |
| `VA` | Vessel Arrival | `shipments.estimated_arrival_date`, `actual_arrival_date`, `orders.status_id = 9` |
| `CT` | Container Track | (no completamente trazado) |
| `AE` | (en `send315.py:add_315`): si presente con `actual_date`, actualiza `shipments.actual_departure_date` |

**Endpoint:** `POST /expo-general/create-315` (`myproject.py:2821`). Soporta modo **batch** (flag `'masivo'`).

**Trigger:** Manual desde UI + posible batch. No vi cron explícito.

**Filtro de órdenes 315** (`filter_orders_315`, línea 89): JOIN amplio
```
orders (order_type='E')
  ↓ LEFT JOIN pivot_entities ON pe.order_id = o.id
  ↓ LEFT JOIN entities ON pe.entity_id = e.id
  ↓ LEFT JOIN cities, countries
  ↓ LEFT JOIN shipments ON pe.shipment_id = s.id
  ↓ LEFT JOIN materials ON o.id = m.order_id
  ↓ LEFT JOIN expo_vessels ON s.expo_vessels_id
  ↓ LEFT JOIN dow_port ON s.destination_port_id
  ↓ LEFT JOIN carrier_leg ON s.carriers_leg_id
```
Output: `po, vessel_name, booking_number, etd, eta, destination_port, voyage_number, ship_to (CONCAT entity ST), routing_number, shipment_number, scac_code`.

> **Nota importante:** Metric usa **`pivot_entities`** para joinear orders↔shipments (no la FK directa de `entities`). Confirma que la pivote sigue viva en producción. La tabla `entities.order_id`/`entities.shipment_id` que vi en Importer puede estar deprecated o coexistir.

> **Otra sorpresa:** Metric usa tablas que **no están en las migrations del Importer**:
> - `expo_vessels` (en lugar de `vessels`)
> - `dow_port` (en lugar de `ports`)
> - `carrier_leg` (en lugar de `carriers`)
>
> Esto sugiere que **Metric tiene su propio schema lateral** específico para Dow, en paralelo al schema canónico del Importer. [CONFIANZA: MEDIA — confirmar con Santiago] [?]

### 2.4 Interlog API — instrucción de exportación

**Archivos clave:**
- `routers/prefolder_routes.py` — **el flujo EXPO vive acá** (no en `interlog_routes.py`, que es solo IMPO/admisión temporaria)
- `routers/interlog_routes.py` — IMPO (despachos, comparación de envases) — fuera de scope
- `interlog_API/token_manager.py` — JWT auth
- `interlog_API/interlog_token.json` — token cacheado
- 5 archivos `.md` de documentación interna en `interlog_API/`

**Auth:**
- JWT Bearer obtenido vía `POST https://jwt-admin.interlog.com.ar/token`
- Cacheado en `interlog_token.json`, renovado por `token_manager.py`

**Endpoints externos Interlog:**
- TEST: `https://api.interlog.com.ar/test/prefolders/public/process`
- PROD: `https://api.interlog.com.ar/prefolders/public/process`

#### Endpoint `POST /prefolder/send` (`prefolder_routes.py:700`) **[PRÓXIMO A PRODUCCIÓN]**

Acepta:
```json
{
  "po": "0118531879",
  "type": "EXPO",
  "pdf_base64": "<base64 del PDF de instrucción de exportación>",
  "pdf_filename": "Instruccion_Exportacion_PO123.pdf",
  "user_email": "user@ssbint.com",
  "force": false
}
```

PDF se genera **client-side** (frontend lo manda en base64). Backend lo decodifica y arma el payload Interlog vía `_build_interlog_payload()` (línea 371-526):

```json
{
  "idCustomer": "670",
  "idBussinessUnit": "1",
  "recipient": "137",
  "code": "M",
  "reference": "SSB_EX|0118531879",
  "type": "E",
  "incoterm": "FOB",
  "customsCode": "001",
  "subregime": "<value desde simis.atributos.DESTINACION o env INTERLOG_SUBREGIME_EXPO>",
  "invoices": [{
    "type": "FC",
    "date": "20260504",
    "number": "<invoice_number>",
    "currency": "USD",
    "buyerVAT": "30500010536",
    "valueOfGoods": "<total>",
    "items": [
      {"goodID": "<material_code>", "name": "<material_name>",
       "ncm": "<ncm>", "qty": "<qty_uom>",
       "amount": "<unit*qty>", "originCountry": "<cc>"}
    ]
  }],
  "files": [{"name": "<pdf_filename>", "content": "<base64>"}]
}
```

**Sub-régimen de exportación:** se obtiene de tabla `simis` con un JOIN a `orders.dispatch_number`:
```sql
SELECT JSON_UNQUOTE(JSON_EXTRACT(s.atributos, '$.DESTINACION')) AS destinacion
FROM simis s
JOIN orders o ON o.dispatch_number = s.nro_despacho
WHERE o.purchase_order = %s
  AND s.tipo_operacion = 'permiso_embarque'
  AND s.siglas = 'EC'
LIMIT 1
```
Fallback a env var `INTERLOG_SUBREGIME_EXPO`. (`prefolder_routes.py:485-510`)

**Persistencia local:**
- `prefolder_operation_log` — append-only de cada envío. Columnas: `purchase_order`, `operation_type` ('IMPO'|'EXPO'), `status` ('pending'|'success'|'error'), `prefolder_remote_id`, `api_http_status`, `api_response`, `validation_summary`, `files_attached_count`, `attempt_count`, timestamps.
- `prefolder_settings` — config: `enabled`, `require_invoice_pdf`, `send_email_on_success`, `expo_recipients_json`, `expo_cc_json`, `expo_bcc_json`, `confirmation_delay_seconds`, `api_environment`.

**Mailing post-success:**
- Vía **Mailgun** (`_send_mailgun_with_attachments`, línea 317). NO Resend, NO SMTP.
- HTML armado por `_build_mail_html()` (línea 285): incluye PO, ETA, status, invoice, transporte, destino, attachments count.
- Recipients/CC/BCC vienen de `prefolder_settings` (configurables runtime).
- Solo dispara si `status='success'` Y `settings.send_email_on_success=1`.

**Modo simulación:** si `api_environment` no está seteado o `_resolve_api_url()` devuelve `None`, el endpoint **no llama a Interlog**, persiste con `api_response.source='local_simulation'`. Por eso digo [PRÓXIMO A PRODUCCIÓN] — el código está listo, pero el flag de prod no está activado por config en este checkout.

#### Otros endpoints `prefolder_*`:
- `GET /prefolder/status` — último estado de un PO/operation_type
- `GET /prefolder/audit` — histórico de envíos con filtros
- `POST /prefolder/settings` — actualizar config

---

## 3. Permisos de exportación

### 3.1 Persistencia
- En **Importer**: campo `orders.dispatch_number` (string, nullable). **Es el lugar canónico del número de despacho/permiso** en el dashboard del Importer. Indexado.
- En **Metric**: tabla `simis` (no en migrations del Importer — schema separado). Columnas relevantes: `nro_despacho`, `tipo_operacion`, `siglas`, `atributos` (JSON con `DESTINACION`, etc.). El JOIN se hace por `simis.nro_despacho = orders.dispatch_number`.

### 3.2 Formato del número
- Ejemplos del prompt: `25003EC03002997S`, `26003EC01001808H`.
- Patrón aparente: `{YY}{NNN}{SIGLAS}{NN}{NNNNNNN}{L}` — `YY=año, NNN=aduana, SIGLAS=EC (export), NN=tipo operacion, NNNNNNN=correlativo, L=letra verificadora`.
- **Filtro Metric:** el query usa `siglas='EC'` y `tipo_operacion='permiso_embarque'` para filtrar de la tabla `simis`. Eso confirma el formato.

### 3.3 Parseo desde mails
**No hay parseo de mails de Interlog en ninguno de los dos repos.** Buscado en:
- `grep -rln "ssbintn8n\|n8n@ssbint"` → 0 matches
- `grep -rln "permiso\|interlog\|despachante"` → solo referencias a la tabla `simis` y al API de Interlog (outbound, no inbound)

**Conclusión:** la persistencia de `simis.nro_despacho` se hace por otro flujo no presente en estos repos. Posiblemente:
- (a) Carga manual desde la UI del Importer/Metric (formularios) [CONFIANZA: BAJA]
- (b) Workflow n8n separado que parsea los mails de `ssbintn8n@ssbint.com` y popula `simis` (no encontrado en repos, pero está en n8n cloud)
- (c) Otro sistema externo no mapeado.

> **Es exactamente el slot que el dashboard nuevo puede ocupar:** parsear los mails de Interlog automáticamente y persistir el número de permiso → eliminar la carga manual en `simis`. **Pregunta abierta para Brian/Santiago.** [?]

---

## 4. Tabla comparativa — entidades clave

| Entidad | En JSON 304 | En Importer (Laravel) | En Metric (MySQL crudo) |
|---|---|---|---|
| **PO Number** | `ReferenceIdentificationGeneral[qual="PO"].ReferenceIdentification` | `orders.purchase_order` (índice) | `orders.purchase_order` (referenciada en queries `301`/`315`/Interlog) |
| **Shipment Num.** | `ShipmnetIdentificationNumber` (sic) | `shipments.shipment_number` (índice) | `shipments.shipment_number` (compartida) |
| **Routing Number** | `RoutingNumber` (siempre `33708426259` para Dow) | `shipments.routing_number` | idem |
| **Container** | `Items[].ContainerDetails[].EquipmentNumber` (placeholder `XNOTFOUNDX` / `40CMISSING` pre-asignación) | `containers.name` + `containers.code` (FK desde `materials.container_id`) | tabla `containers` compartida (presumido) |
| **Container Type** | `Items[].ContainerDetails[].EquipmentType` (`40CZ`, `VAEM`, etc.) | `containers.container_type_id` → `container_types.code` | idem |
| **Consignee** | `Entities[EntityIdentifier="CN"]` o `ST` | `entities` con `entityidentifier='CN'` o `'ST'` | misma tabla, JOIN vía `pivot_entities` |
| **Shipper / Exporter** | `Entities[EntityIdentifier="EX"]` (siempre PBB Polisur, code `A136`) | `entities` con `entityidentifier='EX'` o tabla `shippers` (FK `shipments.shipper_id`) | idem |
| **Notify Party** | `Entities[EntityIdentifier="N1" o "ZN"]` | `entities` con `entityidentifier='N1'` | idem |
| **Naviera / SCAC** | `RouteInformation[].StandardCarrierAlphaCode` (siempre `SSB` — el código interno SSB, no el carrier real) | `route_information.standard_carrier_alpha_code`; carrier real en `shipments.carrier_id` → `carriers` | tabla `carrier_leg` (Metric tiene su propia) |
| **Buque / Vessel** | **No está en el 304** (llega después, asignado por Metric/n8n) | `shipments.vessel_id` → `vessels.name` | tabla `expo_vessels` (sic, distinta de `vessels`) — JOIN via `s.expo_vessels_id` [?] |
| **ETD** | `DateTimeReference[qual="002"].Date` (Pickup/cargo ready, no ETD real) | `shipments.estimated_departure_date` / `actual_departure_date` (poblados por 315 VD) | misma columna, escrita por `update_order_event_315_v2` |
| **ETA** | **No está en el 304** | `shipments.estimated_arrival_date` / `actual_arrival_date` (poblados por 315 VA) | misma columna |
| **BL Number** | **No está en el 304** | `orders.bill_of_landing` + `shipments.billOf_landing_number` (duplicado) | misma |
| **Puerto destino** | `DeliveryLocation` (texto libre: "Buenos Aires Port", "Santos Port") + `PlaceOfDelivery` (UN/LOCODE: `BRMAO`, `BRACA`) en 24% | `orders.destination_port_id` → `ports.name`; `shipments.port_terminal_destination*` (3 cols) | tabla `dow_port` (Metric-específica) |
| **Puerto carga / POL** | `Entities[ID="ST"]` no aplica acá; `PlaceOfReceiptCode` (Trade 100%, STO 53%) | `shipments.port_terminal_port_loading*` | idem |
| **Permiso exportación** | **No está en el 304** | `orders.dispatch_number` | tabla `simis.nro_despacho` (JOIN por `dispatch_number`) — JSON `atributos.DESTINACION` para sub-régimen |
| **Instrucción Interlog** | N/A | N/A | `prefolder_operation_log.purchase_order` + payload en `api_response`; PDF generado client-side, mandado en `pdf_base64` al endpoint `/prefolder/send` |
| **Estado / Status** | N/A (304 es trigger, no estado) | `orders.status_id` → `statuses` (solo `'N'=Nueva` seedeado; resto en DB sin documentar) | mismo `orders.status_id`, escrito por 315 events (`9=arrival`, `12=departure`) |
| **Channel aduana** | N/A | `shipments.channel` (enum: green/orange/red — semáforo aduana AR) | idem |

### 4.1 Inconsistencias y conflictos detectados

| # | Inconsistencia | Impacto en schema nuevo |
|---|---|---|
| 1 | **Doble path entidad ↔ orden/shipment** en Importer: `entities.order_id`/`shipment_id` (FK directa) **+** `pivot_entities` (N:N). Metric joinea por la pivote. | Decidir uno solo. Mi recomendación: pivote (`entity_shipments`/`order_entities`) y deprecar las FKs directas. Pregunta para Brian. |
| 2 | **Tablas paralelas en Metric** (`expo_vessels`, `dow_port`, `carrier_leg`) que duplican concepto de las del Importer (`vessels`, `ports`, `carriers`). | Confirmar con Santiago si Metric ve la misma DB que Importer o tiene su propio schema. Si es separado, el dashboard nuevo elige una de las dos como source of truth. |
| 3 | **Status table prácticamente vacía en código** — solo `'N'=Nueva` seedeado. El resto (IDs `9`, `12`, etc.) viven en DB. | Pedir dump de `statuses` a Brian antes de modelar el ciclo de vida. Sin eso, modelamos a ciegas. |
| 4 | **`shipments` ultra-ancha** (~80 columnas, muchas duplicadas con `orders`). | El schema nuevo no debería replicar esa denormalización. Diseñar tablas finas: `orders` (PO master), `shipments` (transporte), `bookings` (carrier/vessel/dates), `documents` (BL/invoice/permit). |
| 5 | **`bill_of_landing` (sic)** duplicado en `orders.bill_of_landing` y `shipments.billOf_landing_number`. | Una sola fuente: el BL pertenece al shipment, no al order. |
| 6 | **`pivot_entities` con `is_active`** sugiere que entidades pueden "deactivarse" sin borrarse. | El schema nuevo necesita versionar o usar `valid_from/valid_to` si el caso es real (cambios de notify, etc.). |
| 7 | **Sin transacciones explícitas** en `OrderController::store`. Si falla a mitad, `log_jsons` queda sin entidades/items asociados. | El nuevo schema arranca con `BEGIN/COMMIT` por ingest event. |
| 8 | **`type_json` solo `'304'` y `'factura'`** — los `301`/`315` que emite Metric **no caen en `log_jsons`**. Viven en `report_301` / `report_315` con schema completamente distinto. | El nuevo schema podría unificar: `inbound_events` (lo que recibe el dashboard) + `outbound_events` (lo que emite, incluye 301/315). Hoy esa simetría no existe. |
| 9 | **Permiso de exportación** llega sin trazabilidad: el campo `orders.dispatch_number` se popula por flujo manual o n8n no presente en estos repos. | Slot natural para automatizar — parsing de mail de Interlog → upsert a `simis` o equivalente nuevo. |
| 10 | **Routing Number** es siempre el mismo (`33708426259`). No es un identificador útil para el partition key del schema nuevo. | Ignorar. Usar `(po, shipment)` como composite key. |

---

## 5. Preguntas abiertas (para Brian / Santiago)

1. **[Brian]** Dump de `statuses` table en producción del Importer — necesitamos los `id`/`code`/`name` reales.
2. **[Brian]** ¿`pivot_entities` está activa o deprecated? El código del Importer popula `entities.order_id`/`shipment_id` directamente; Metric joinea por la pivote.
3. **[Santiago]** ¿Metric-API y Importer comparten DB MySQL? ¿O son schemas separados con tablas con el mismo nombre?
4. **[Santiago]** Las tablas `expo_vessels`, `dow_port`, `carrier_leg`, `transport_groups`, `report_301`, `report_315`, `simis`, `prefolder_operation_log` — ¿cuáles tienen migration formal y cuáles son ad-hoc?
5. **[Santiago]** El payload `301` ¿se entrega a SAP por algún canal (HTTP/SFTP/cola) o queda solamente en `report_301` y SAP lo lee por batch nocturno?
6. **[Brian/Santiago]** ¿Quién popula `simis.nro_despacho` con el número de permiso de exportación hoy? ¿Manual? ¿Workflow n8n? ¿Otro sistema?
7. **[Operativa]** ¿Cómo llega el BL Number al sistema hoy? No está en el 304. Manual desde la UI del Importer / scraping del carrier / mail?
8. **[Santiago]** El estado `status_id=9` (arrival) y `12` (departure) que setea Metric — ¿hay otros IDs que el dashboard nuevo deba soportar?
9. **[Brian]** ¿Hay constraint UNIQUE en `(orders.purchase_order)` o se permite duplicar? El controller hace find-or-create que evitaría duplicados, pero sin UNIQUE es por convención.
10. **[Santiago]** El endpoint `/prefolder/send` está en modo simulación local en el repo (`api_environment` no seteado). ¿Está apuntando a Interlog test/prod en el deploy actual?

---

_Análisis read-only. Sin commits. Generado el 2026-04-29 desde `~/projects/importer` y `~/projects/metric-api`._
