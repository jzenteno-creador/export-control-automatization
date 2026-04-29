# Research — SSB Export Dashboard

**Proyecto**: SSB-IT-RESEARCH
**Autor**: Jona Zenteno
**Última actualización**: 24/04/2026 (research APIs navieras)
**Estado**: investigación con Walking Skeleton desplegado + 11 JSONs reales cargados y analizados vía SQL. Hallazgos empíricos incorporados en sección 7.13. **Nuevo 24/04**: research técnico de APIs de carriers (Maersk, Hapag-Lloyd, Log-In) incorporado en sección 8. Archivo aparte con detalle: `research-apis-carriers.md`.

---

## 1. Objetivo del proyecto

Dashboard operacional para el equipo de documentación de exportación de SSB. Reduce el equipo documental de 2 a 1 persona manteniendo 150–200 órdenes/mes.

Etapas operativas a cubrir (orden cronológico, no de prioridad de desarrollo):

1. Ingesta de ofrecimiento (304 desde SAP).
2. Detección de despacho.
3. Recolección de info para declaración de embarque.
4. Generación/ingreso de declaración de embarque.
5. Obtención y descarga del BL draft.
6. Control documental del BL draft (con IA — fase posterior).
7. Evaluación y envío de documentación al cliente (factura, CRT terrestre; foco inicial marítimo).
8. Control de mailing.
9. Tracking: avisos de embarque, próximo arribo, arribo.
10. (Escalamiento futuro).

**Foco inicial**: declaración de embarque + control de BL, modalidad marítima.

---

## 2. Arquitectura de mensajería SAP ↔ SSB

```
          304 (oferta)
    SAP ─────────────────▶  Importer  ─── ¿? ───▶  Metric  ──301/315──▶ SAP
                                                                (no consumidos hoy)
```

### 2.1 Mensajes SAP del ecosistema

| ID | Dirección | Contenido | Rol en el dashboard |
|----|-----------|-----------|---------------------|
| **304** | SAP → Importer | Oferta de orden | **Input principal** (etapa 1) |
| **301** | Metric → SAP | Aceptación de orden (coordinada y lista para despacho) | A evaluar — potencial input para estado "confirmada" (fases posteriores) |
| **315** | Metric → SAP | Updates de eventos (sailing date, arrival at destination, etc.) | A evaluar — potencial fuente para etapa 9 tracking, complementaria o alternativa a APIs de carriers |

**Nota**: el término "304" es el identificador del mensaje en contexto SAP. Internamente el Importer no lo llama así — hay que mapear cómo lo nombra en código/endpoints.

### 2.2 Vínculo Importer ↔ Metric

**Cerrado 22/04**: no existe flujo Importer → Metric. SAP envía el 304 **en paralelo** a los dos sistemas. Ver sección 4.2.

---

## 3. Importer — hallazgos técnicos

### 3.1 Stack

- **Framework**: Laravel 8 (PHP 7.3/8.0)
- **Frontend**: AdminLTE 3 + Livewire + Alpine.js + Tailwind
- **Auth API**: JWT (middleware `jwt.verify`) + Sanctum
- **Docs API**: Scribe (autogenerado)
- **Storage**: AWS S3
- **Email**: Mailgun
- **Auditing**: Laravel Auditing (owen-it) — audita cambios en Órdenes y Despachos SIMI
- **Repo**: `git.ssbint.com/ssb_int_git/codego_importer_uat.git`
- **Nombre interno del producto**: "Codego"
- **UAT**: `https://importer.ssbplatform.com/`
- **Docs Scribe**: `https://importer.ssbplatform.com/docs` (acceso con usuario y contraseña)
- **Origen del desarrollo**: al parecer **Kipin** (tercero/herramienta) al inicio de la operativa con el cliente. Pregunta abierta.

### 3.2 Endpoints API públicos

Fuente: `routes/api.php` del repo + doc técnico de Brian.

| Método | Path | Auth JWT | Uso |
|--------|------|----------|-----|
| POST | `/api/token` | No | Login / obtención de JWT |
| POST | `/api/register` | No | Registro usuarios |
| POST | `/api/orders/store` | **No** | Crear/actualizar orden (receptor del 304) |
| POST | `/api/orders/factura` | **No** | Registrar factura de una orden |
| POST | `/api/orders/ConsultaOrder` | Sí | Consultar órdenes por PO/tipo/fecha |
| POST | `/api/materials/store` | Sí | Cargar materiales a una orden |
| POST | `/api/shipments/store` | Sí | Registrar embarques |

**Observación**: `/orders/store` y `/orders/factura` están fuera del JWT. Brian los lista sin marca de auth — parece ser diseño, no bug. Falta saber qué otra auth tienen (IP whitelist, HMAC, etc.). Pregunta abierta.

### 3.3 Tipos de orden

El Importer maneja 3 tipos:

| Código | Tipo |
|--------|------|
| `I` | Importación |
| `E` | **Exportación** |
| `mro` | MRO (mantenimiento/reparaciones/operaciones) |

**Confirmado**: el Importer es el repositorio central de órdenes, también exportación. Los datos de las órdenes que vamos a consumir están acá.

### 3.4 Módulo "Logs de JSON" — hallazgo clave

El Importer registra **todas** las integraciones recibidas vía API (JSON entrantes) con payload completo descargable. Filtrable por PO, número de embarque, estado.

**Implicancia estratégica**: desbloquea el schema del 304 sin depender de Brian. Pudiendo descargar JSONs reales históricos, el schema se obtiene por inferencia directa.

**Estado**: tarea completada. Se descargaron 11 JSONs reales del 304 desde el módulo Logs de JSON. Análisis documentado en sección 7. **Validación empírica adicional completada el 22/04 tarde**: los 11 JSONs fueron cargados al endpoint del Walking Skeleton y analizados vía SQL — hallazgos en sección 7.13.

### 3.5 Módulos de la plataforma (resumen)

Doc técnico completo pasado por Brian. Módulos principales:

1. **Órdenes** — central, maneja I/E/MRO.
2. **Despachos / SIMI** — importa despachos aduaneros.
3. **Embarques** — carrier, vessel, contenedor, modo de transporte.
4. **Consumos temporales** — admisión temporaria.
5. **Seriales de cilindros** — stock de cilindros industriales.
6. **Pagos MRO**.
7. **Tránsitos y temporales** — plazos de admisión temporaria.
8. **Facturas de orden**.
9. **Logs de JSON** — auditoría de integraciones API.
10. **Administración** — catálogos maestros.

Los módulos relevantes para el dashboard de exportación: **Órdenes**, **Embarques**, **Facturas**, **Logs de JSON**.

### 3.6 Flujo típico documentado por Brian

```
1. SAP → POST /api/orders/store      → Crea Orden
2. SAP → POST /api/orders/factura    → Factura comercial
3. SAP → POST /api/shipments/store   → Embarque
4. Operador sube SIMI desde aduana   → Despacho vinculado
5. Operador actualiza follow-up Excel → Estado embarque
6. Temporales: plazos y consumos
7. Notificaciones por Mailgun
```

**Atención**: este flujo describe **importación** (pasos 4, 6). Para **exportación** el flujo puede ser diferente — no está documentado. Pregunta abierta.

### 3.7 Deuda técnica y semántica

- Archivos duplicados con guion bajo (backups viejos conviviendo con activo): `composer_.json`, `routes/web_.php`, `database_/`, `config/logging.php_old`.
- `data.txt` (172 KB) y `t.txt` (38 KB) en raíz: dumps de debug viejos (Maatwebsite/Excel). Basura.
- `README.md` es default de Laravel. **Cero documentación interna del proyecto**.
- Julio confirmó: "3 generaciones, 6 devs". Reconstruir contexto leyendo código sin validación con Brian/Santiago es riesgoso.

---

## 4. Metric — investigado (22/04/2026)

**Investigación realizada con Claude Code sobre el repo `sosab-api` clonado en `~/projects/metric-api`. Hallazgos documentados acá.**

### 4.1 Stack real

- **Framework**: Flask (Python), no FastAPI. Patrón Blueprint.
- **Base de datos**: MySQL (vía `config/db_connection.py`).
- **Repo**: `git.ssbint.com/ssb_int_git/sosab-api.git`
- **Entry point**: `wsgi.py` + `myproject.py` (171 KB, monolítico).
- **Estructura**: archivos Python planos en raíz + carpetas `routers/`, `schemas/`, `services/`, `models/`, `utils/`, `Importer/`, `interlog_API/`, `data_management/`, `dow_dashboard/`.
- **Deuda técnica visible**: archivos vacíos (`editeta.py`, `eidtata.py`, `PagosMro.php`), archivos con nombres raros (`'how stash@{43ebecc}'`), logs grandes (`document_scanner_test.log` 190 KB, `upload_errors_backup.log` 100 KB), `sync_log.db` en repo.

### 4.2 Cómo recibe el 304 de SAP

**Endpoint**: `POST /gestor-expo/api/orders/store-complete`

- Archivo: `Importer/Gestion_Carpetas/Expo/gestor_expo.py:899` — función `store_complete_order`.
- Registrado con `url_prefix='/gestor-expo'` en `myproject.py:4555`.
- Docstring del endpoint dice: *"Replica completa del método store() de Laravel"*. Confirma que SAP envía el 304 a **dos lugares en paralelo**: al Importer Laravel (`/api/orders/store`) y a Metric (`/gestor-expo/api/orders/store-complete`). **No hay retransmisión Importer → Metric** — son dos ingresos simultáneos del mismo mensaje.
- Parsea el schema del 304 confirmado en sección 7: `ReferenceIdentificationGeneral`, `ShipmnetIdentificationNumber` (con el typo característico), `DateTimeReference` (RSD/002/AA8), `Entities`, `RouteInformation`, `Items`, `BusinessInstructionsReferenceNumberNotes`.

### 4.3 Cómo persiste Metric el 304

**No lo guarda crudo**. Lo parsea y lo distribuye en ~10 tablas MySQL:

| Tabla | Contenido |
|---|---|
| `orders` | Orden (INSERT/UPDATE por `purchase_order`) |
| `shipments` | Embarques (por `shipment_number` + `order_id`) |
| `pivot_entities` | Entidades del embarque (una fila por entidad, INSERT incondicional) |
| `route_informations` | Rutas (INSERT incondicional) |
| `materials`, `products`, `container_types`, `contacts`, `companies`, `currencies`, `incoterms`, `entities` | Catálogos + relaciones |

**Único campo crudo retenido**: `BusinessInstructionsReferenceNumberNotes` → `shipments.ref_notes`.

**Implicancia crítica para nosotros**: si el dashboard consumiera el 304 desde Metric (opción D de sección 5.1), **el JSON original ya está perdido**. Habría que reconstruirlo con joins (es lo que hacen las funciones `create_general_304` y `create_material_304` — ver 4.5).

### 4.4 Salidas / eventos cuando Metric recibe un 304

**Ninguna.** La función `store_complete_order` al recibir un 304:
1. Inserta/actualiza en las tablas.
2. `conn.commit()`.
3. Responde `{order_id, shipment_id, items_count}` con status 200.
4. Fin.

No dispara webhook saliente, no emite evento a cola, no manda mail, no llama a n8n. Si el dashboard quisiera enterarse del 304 vía Metric, habría que modificar el código de Metric (opción C, descartada).

Salidas presentes en otros lugares del repo (no atadas al ingreso del 304):
- `myproject.py:3391-3400`: endpoint `post()` que hace `requests.post('https://rica.elemica.com/upload/SSB_Prod', ...)` — emisión del **315 a Elemica** (middleware B2B de Dow), pero triggered desde el frontend, no desde `store-complete`.
- `send301.py` / `send315.py`: solo escriben tablas locales `report_301` / `report_315`, no envían a SAP (el nombre es engañoso).

### 4.5 Las funciones `create_general_304` y `create_material_304`

Están en `expomaterials.py:1268` y `expomaterials.py:1393`.

**No son receptores** — son **reconstructores**. Toman un `creator: str` (el PO), corren un `SELECT` con múltiples `JOIN` contra `orders`, `shipments`, `pivot_entities`, `entities`, `cities`, `vessels`, `currencies`, `plants`, `materials`, y devuelven un JSON con **forma** de 304 sintetizado desde la DB.

No escriben a DB, no hacen HTTP outbound. Probable uso: UI interna, generación de PDFs, consumers internos que necesitan ver el "304 equivalente" de una orden existente.

### 4.6 Endpoints proxy `/get-304/*`

`myproject.py:2521-2584` expone `GET /get-304`, `GET /get-304-by-id/<id>`, `POST /post-304/`. Son **proxies HTTP** a `http://localhost:3008/ssbint/trescientoscuatro/`. Qué corre en el puerto 3008 no está en el repo `sosab-api` — probablemente un servicio Node separado que almacena 304s originales. **Pregunta abierta** (no crítica para el MVP).

### 4.7 Riesgos identificados en el código de Metric

1. **Idempotencia sospechosa**: `pivot_entities` y `route_informations` hacen INSERT incondicional al recibir un 304. Si SAP reenvía el mismo 304 (reintento de red, reproceso), probablemente se duplican filas en esas tablas. **No confirmado en producción**, pero el código sugiere que sí ocurre. Riesgo si el dashboard dependiera de la consistencia de Metric.
2. **Campos ignorados del 304**: `TariffServiceCode`, `ApplicationType`, `TransactionSetPurposeCode`, `ShipmentMethodPayment`, `PlaceOfReceiptCode`, `PlaceOfDelivery`, qualifiers `CO`, `AEG`, `1V`, sub-qualifiers de ítem (`PGIDATE`, `PAYMTRMS`, `DELIVERY`, `OCEAN CSGN`), `Hazardous`, etc. No vi código que los procese en `store_complete_order`. Confirmado por lectura pero no exhaustivo.
3. **Auth del endpoint**: no tiene decoradores visibles. ¿IP whitelist en nginx? ¿Reverse proxy? No documentado.

### 4.8 Consecuencia para la decisión de integración

Con lo investigado, **Metric no es candidato viable** para que el dashboard consuma el 304 desde allí. Razones:
- No persiste el crudo (rompe criterio no-negociable #5 de `plan.md`).
- No es idempotente (rompe criterio no-negociable #2).
- No emite eventos salientes al recibir un 304.
- Repo legacy sin tests visibles, mantenido por programadores externos.

**Decisión arquitectónica derivada**: consumir el 304 desde el **Importer Laravel**, no desde Metric. El Importer sí persiste crudo en su módulo "Logs de JSON" y Brian es dev accesible interno. Ver `plan.md` sección 7, decisión del 22/04 sobre integración via webhook desde Importer.

---

## 5. Estrategia de integración (preliminar — a validar)

### 5.1 Para recibir el 304

Opciones evaluadas (actualizado 22/04 post-investigación de Metric):

| Opción | Descripción | Estado | Pros | Contras |
|--------|-------------|--------|------|---------|
| A | SAP envía el 304 también al dashboard (doble ingesta) | **Descartada** | Desacoplado del Importer | Requiere cambio en SAP — Dow no lo hace |
| B | Importer reenvía al dashboard vía webhook (HTTP POST del payload crudo después de recibirlo) | **Elegida (22/04)** | El Importer ya persiste crudo; Brian accesible; respeta criterios #2 y #5 | Requiere dev en Importer (Brian) |
| C | Dashboard hace pull al Importer vía `ConsultaOrder` | Descartada | Sin cambios en terceros | Latencia, no event-driven, riesgo de perder órdenes |
| D | Dashboard consume desde Metric | **Descartada post-investigación (22/04)** | — | Metric no persiste crudo (rompe criterio #5); no idempotente (rompe criterio #2); sin webhooks salientes; repo legacy mantenido por externos. Ver sección 4.8. |

**Decisión del 22/04**: Opción B. Pedido formal enviado a Brian. Walking Skeleton del receptor desplegado en Supabase. Ver `plan.md` sección 7 y `docs/walking-skeleton.md`.

---

## 6. Glosario

- **304**: mensaje SAP de oferta de orden → Importer.
- **301**: mensaje SAP de aceptación de orden → desde Metric hacia SAP.
- **315**: mensaje SAP de update de evento (sailing, arrival) → desde Metric hacia SAP.
- **BL / BL draft**: Bill of Lading / su versión borrador para revisión previa a emisión.
- **CRT**: Carta de Porte Internacional por Carretera (transporte terrestre).
- **Codego**: nombre interno del producto Importer.
- **EDI X12**: *Electronic Data Interchange* formato ANSI ASC X12. Estándar estadounidense de mensajería B2B estructurada. El 304 es un "Transaction Set" dentro de X12.
- **GMID**: *Global Material Identifier*. Código interno Dow para identificar cada producto del catálogo. En los JSONs aparece con leading zeros como número de 18 dígitos.
- **IDOC SHPMNT**: tipo de documento SAP (`SHPMNT03`, `SHPMNT05`, `SHPMNT06`) que SAP usa internamente para representar una orden de embarque antes de serializarla a X12 o JSON.
- **Kipin**: *a definir* — posible desarrollador/herramienta original del Importer.
- **MOT**: *Mode of Transport*. Modalidad de transporte (marítimo, terrestre, aéreo).
- **Metric**: plataforma core de SSB (repo `sosab-api`).
- **NCM**: Nomenclatura Común del Mercosur. Código arancelario argentino/brasileño de 8 dígitos.
- **Qualifier** (en EDI): en X12 muchos elementos son pares *qualifier + value*: el qualifier define qué tipo de dato es el value. Ejemplo: `PO` + `0118705352` significa "Purchase Order Number = 0118705352".
- **Scribe**: librería Laravel para autogenerar docs de API REST.
- **SIMI**: Sistema de Importaciones de la República Argentina.
- **MRO**: *Maintenance, Repair and Operations*.
- **UN/LOCODE**: *United Nations Code for Trade and Transport Locations*. Código de 5 caracteres (2 país + 3 lugar) para identificar puertos y ciudades. Ej: `BRSSZ` = Santos, Brasil.

---

## 7. Estructura del JSON del 304 (Dow/PBB Polisur → Importer)

Esta sección documenta la estructura real de los JSONs que SAP de Dow envía al endpoint `/api/orders/store`. Basada en análisis directo de **11 JSONs reales** descargados del módulo Logs de JSON del Importer. Foco: solo campos que efectivamente aparecen en estos JSONs, con interpretación operativa de Jona + contexto técnico X12.

### 7.1 Origen del formato

El JSON es una serialización sabor SAP del **EDI X12 Transaction Set 304 "Shipping Instructions"**. El nombre de los campos sigue la convención interna SAP/Dow más que X12 puro. La estructura y los qualifiers usados son estándar X12, con extensiones propias Dow.

Flujo real de generación: `SAP (Sales Order) → Outbound Delivery → Shipment Document → IDOC SHPMNT → middleware B2B → JSON al Importer`.

**Para este proyecto**: el formato no va a cambiar. No hay que interpretar el estándar X12 en abstracto, solo este dialecto Dow.

### 7.2 Observaciones generales de los 11 JSONs

Constantes en todos los JSONs:
- `RoutingNumber`: siempre `33708426259` (constante Dow).
- `TransactionSetPurposeCode`: siempre `"49"` (Original - No Response Necessary).
- `ApplicationType`: siempre `"BN"` (Booking).
- `ShipmentMethodPayment`: siempre `"PP"` (Prepaid).
- `CurrencyCode`: siempre `"USD"`.
- Exportador (`EntityIdentifier: EX`): siempre `PBBPOLISUR S.R.L.` con `IdentificationCode: A136`.
- Endpoint destino: siempre `"q": "/api/orders/store"`.

Variables clave (dimensiones que discriminan tipos de orden):
- **PO prefix**: `0118...` (6 JSONs) vs `4010...` (5 JSONs). **Confirmado (22/04)**: `0118...` = **Trade** (venta a cliente externo), `4010...` = **STO** (Stock Transfer Order, intercompany Dow → Dow). Prefijo estable. Ver `business-context.md` sección 4.3 para consecuencias operativas.
- **MOT** (`RouteInformation[].TransportationMethodTypeCode`): `O` (marítimo, 8 JSONs) vs `M` (terrestre, 3 JSONs).
- **IntermodalServiceCode**: `05` (marítimo contenedor 40', 8 JSONs) vs `01` (terrestre, 3 JSONs).
- **TariffServiceCode**: `DD` (Door-to-Door, 6 JSONs) vs `DP` (Door-to-Port, 5 JSONs).
- **Incoterm** (`TransportationTermsCode`): CPT, CFR, FCA (tres variantes en los 11 JSONs).

### 7.3 Estructura de alto nivel

Todo JSON del 304 tiene 7 zonas principales:

```
{
  "RoutingNumber": ...,                         // metadata Dow
  "ShipmnetIdentificationNumber": ...,          // ID de shipment SAP (nótese typo)
  "TariffServiceCode": ...,                     // tipo de servicio (DD/DP)
  "ShipmentMethodPayment": "PP",                // siempre prepaid
  "TransactionSetPurposeCode": "49",            // siempre original
  "ApplicationType": "BN",                      // siempre booking
  "ReferenceIdentificationGeneral": [...],      // referencias nivel orden (PO, CO, etc.)
  "CurrencyCode": "USD",
  "TransportationTermsCode": ...,               // Incoterm
  "DeliveryLocation": ...,                      // lugar Incoterm (NO destino físico)
  "TermsOfSale": 0 o 31,                        // código numérico condición de pago
  "TermsOfSaleDescription": "...",              // texto libre condición de pago
  "DateTimeReference": [...],                   // fechas clave
  "Entities": [...],                            // actores del embarque
  "PlaceOfReceiptCode": ...,                    // código de sitio origen
  "PlaceOfDelivery": ...,                       // opcional (solo 1/11 lo trae)
  "RouteInformation": [...],                    // MOT + ruta
  "BusinessInstructionsReferenceNumberNotes": "...",  // TEXTO LIBRE CRITICO
  "Items": [...],                               // productos + contenedores
  "q": "/api/orders/store"                      // endpoint destino
}
```

### 7.4 Campos del encabezado (nivel orden)

#### Identificadores

| Campo JSON | Tipo | Descripción operativa | Ejemplo |
|---|---|---|---|
| `ShipmnetIdentificationNumber` | string | Número de shipment de SAP. **Nombre del campo viene con typo** (falta una `e` en "Shipment"). Se muestra como secundario en el dashboard. | `"0048062233"` |
| `RoutingNumber` | number | Identificador del routing de Dow. Constante en todos los JSONs. Metadata técnica, no operativa. | `33708426259` |

#### Códigos de servicio y pago

| Campo JSON | Valores vistos | Significado | Relevancia dashboard |
|---|---|---|---|
| `TariffServiceCode` | `DD`, `DP` | DD = Door-to-Door (retiro en planta, entrega en domicilio destino). DP = Door-to-Port (retiro domicilio, entrega en terminal destino). | **Alta** — define alcance del servicio |
| `ShipmentMethodPayment` | `PP` | Prepaid (flete pagado en origen). Constante en los 11 JSONs. | Baja — sin variación |
| `TransactionSetPurposeCode` | `49` | Original - No Response Necessary. Constante. | Baja — sin variación |
| `ApplicationType` | `BN` | Booking. Constante. | Baja — sin variación |
| `CurrencyCode` | `USD` | Moneda. Constante. | Baja — sin variación |

#### Términos comerciales

| Campo JSON | Valores vistos | Significado |
|---|---|---|
| `TransportationTermsCode` | `CPT`, `CFR`, `FCA` | Incoterm 2020. CPT = Carriage Paid To. CFR = Cost and Freight. FCA = Free Carrier. |
| `DeliveryLocation` | texto libre | **Lugar asociado al Incoterm declarado**, no necesariamente el destino físico final de la mercadería. En Incoterms CPT/CFR representa el puerto de destino marítimo; en FCA/FOB representa el punto de entrega en origen. **Debe interpretarse siempre junto con `TransportationTermsCode`.** Ver 7.13 hallazgo 1. Ej: `"SALVADOR PORT"`, `"Navegantes Port"`, `"BAHIA BLANCA"`, `"MAIPU"`, `"CALLAO PORT"`. **Sin normalizar** — inconsistencia de casing entre JSONs (`"NAVEGANTES PORT"` vs `"Navegantes Port"` aparecen como 2 valores distintos para el sistema, pero es el mismo puerto). |
| `TermsOfSale` | `0`, `31` | Código numérico de condición de pago. `0` = términos inmediatos/especiales (se lee del texto), `31` = "NET EOM PLUS 1 MO PLUS 1 DAY". |
| `TermsOfSaleDescription` | texto libre | Descripción humana de la condición de pago. Ej: `"60 DAYS AFTER B/L DATE"`, `"NET 60 DAYS FROM INVOICE DATE"`, `"75 DAYS FROM INVOICE DATE - DATED DRAFT"`. |

### 7.5 ReferenceIdentificationGeneral (referencias nivel orden)

Array de pares `ReferenceIdentificationQualifier` + `ReferenceIdentification`. Los qualifiers encontrados en los 11 JSONs:

| Qualifier | Frecuencia | Significado | Ejemplo de valor | Criticidad |
|---|---|---|---|---|
| `PO` | 11/11 | **Purchase Order Number**. Identificador principal de la orden. | `"0118705352"`, `"4010470219"` | **Máxima** — ID principal |
| `19` | 11/11 | Pier/muelle | `"0803"` | Metadata |
| `11` | 11/11 | Account Number | `"Z013"`, `"Z039"` | Metadata |
| `PE` | 11/11 | Plant Number (punto de despacho, "shipping point" SAP) | `"P703"`, `"P706"`, `"P749"` | Media — trazabilidad |
| `SF` | 11/11 | Ship From (planta física origen) | `"D116"`, `"D146"`, `"D147"`, `"D176"` | Media — trazabilidad |
| `CO` | 6/11 | Contract Number (referencia contractual comercial) | `"37111"`, `"PD2026/102097"`, `"230N_04_2026_138"` | Media — solo algunas órdenes |
| `1V` | 6/11 | Related Vendor Order Number (orden vendor secundaria). Aparece solo en POs `0118...`. | `"0118705352"` (mismo valor que PO) | Baja |
| `AEG` | 6/11 | No es qualifier X12 estándar. Dow lo usa con `FreeFormDescription: "AES - Ultimate Consignee Type"`. **Extensión Dow**. Aparece solo en POs `0118...`. | `"DIRECT CONSUMER"` | Baja — metadata regulatoria US-AES |

**Observación**: los qualifiers `1V`, `CO` y `AEG` aparecen solo en las órdenes tipo `0118...`. Las órdenes `4010...` traen una versión mínima de este array (solo `19`, `11`, `PE`, `SF`, `PO`). Esto refuerza que son dos tipos de orden SAP distintos.

### 7.6 DateTimeReference (fechas clave)

Array de pares `DateTimeQualifier` + `Date`. Ambos qualifiers aparecen en los 11 JSONs:

| Qualifier | Significado | Ejemplo | Relevancia |
|---|---|---|---|
| `RSD` | Requested Ship Date (fecha solicitada de despacho). **No figura en el catálogo X12 estándar** — convención SAP. | `20260425` (YYYYMMDD) | **Alta** — marca cuándo debe salir |
| `002` | Delivery Requested (fecha de entrega requerida al comprador) | `20260526` | **Alta** — ETA contractual |

Formato: entero `YYYYMMDD` (ejemplo: `20260425` = 25 abr 2026).

### 7.7 Entities (actores del embarque)

Array de actores. Cada entidad tiene estructura:

```json
{
  "EntityIdentifier": "ST",
  "Name": "...",
  "IdentificationCode": "...",
  "TAXID": "...",
  "AddressInformation": "...",
  "CityName": "...",
  "PostalCode": "...",
  "CountryCode": "...",
  "LocationIdentifier": "...",
  "Contacts": [
    {
      "ContactFunctionCode": "...",
      "Name": "...",
      "ElectronicMail": "...",
      "Telephone": "..."
    }
  ]
}
```

Roles encontrados (`EntityIdentifier`) con frecuencia en los 11 JSONs:

| Code | Frecuencia | Rol | Quién es típicamente |
|---|---|---|---|
| `16` | 11/11 | Plant (punto de despacho / sede logística) | Planta PBB Polisur o warehouse Dow (Bahía Blanca, Abbott) |
| `EX` | 11/11 | Exportador | **Siempre PBBPOLISUR S.R.L. (A136)** — constante |
| `ST` | 11/11 | Ship To (destinatario físico) | Cliente final o hub Dow destino. **Este es el destino físico real de la mercadería** — ver 7.13 hallazgo 1 |
| `N1` | 11/11 | Notify Party | Despachante o cliente del lado importador. **Fallback confirmado para el mailing** — ver 7.13 hallazgo 2 |
| `BT` | 11/11 | Bill To (a quién facturar) | Generalmente = Ship To, salvo trade con intermediarios |
| `NP` | 11/11 | Notify Party secundario | Segundo notify (banco, agente, partner logístico) |
| `DIR` | 10/11 | Distribution Recipient | Destinatario de distribución posterior o responsable específico |
| `PK` | 7/11 | Packer (empaque) | Partner que empaca o procesa |
| `AO` | 4/11 | Account Of ("por cuenta de") — **en estos JSONs representa el puerto de destino** | Puerto físico (ej: SALVADOR PORT, CALLAO PORT) |
| `CN` | 3/11 | Consignee del BL | Consignatario formal (aparece solo en algunos casos) |
| `PK2` | 2/11 | Packer secundario | Segundo empacador (multi-site o sub-rol) |
| `PK3` | 1/11 | Packer terciario | Tercer empacador |

**Observación crítica**: en la mayoría de los JSONs, `ST` + `N1` + `BT` refieren a la misma empresa (el cliente final). Cuando divergen, indica que el cliente factura a una empresa pero recibe mercadería en otra, o que hay un intermediario notify (forwarder, despachante, banco). Detectar estas divergencias es señal clave para documentación.

**Campos de entidad**:

| Campo | Descripción | Notas |
|---|---|---|
| `Name` | Razón social | A veces truncado (ej: `"CHIACCHIO INDUSTRIA DE"`) |
| `IdentificationCode` | ID interno SAP del business partner | Numérico con leading zeros |
| `TAXID` | CUIT, CNPJ, RUT, etc. según país | Solo presente en algunas entidades (ST, BT) |
| `AddressInformation` | Dirección | Texto libre, a veces concatenado |
| `LocationIdentifier` | Abreviatura de estado/provincia o código interno | **No es UN/LOCODE estándar**. Valores vistos: `B`, `C`, `BA`, `SC`, `SP`, `PR`, `RM`, `LIM`, `V`, `MG`, `MEX`. Normalización pendiente. |

**`ContactFunctionCode`** (dentro de Contacts):

| Code | Significado | Uso |
|---|---|---|
| `ZZ` | Mutually Defined (definido bilateralmente) | Contacto general, uso más frecuente (42 ocurrencias) |
| `CN` | General Contact | 36 ocurrencias |
| `RE` | Receiving Contact | Contacto de recepción (típico en `ST`), 11 ocurrencias |

### 7.8 RouteInformation (ruta y modo de transporte)

Array de 1 elemento en los 11 JSONs. Estructura:

```json
{
  "StandardCarrierAlphaCode": "SSB",
  "TransportationMethodTypeCode": "O",
  "FreeFormDescription": "053109",
  "RouteDescription": "TM-ST05-TT31-TLT09"
}
```

| Campo | Significado |
|---|---|
| `StandardCarrierAlphaCode` | SCAC. Siempre `"SSB"` en estos JSONs — indica que SSB International es el carrier/forwarder asignado. **A confirmar si SSB está registrado en NMFTA o si es código bilateral Dow↔SSB**. |
| `TransportationMethodTypeCode` | **O** (Containerized Ocean) o **M** (Motor/terrestre). **Campo crítico** — distingue marítimo de terrestre. |
| `FreeFormDescription` | Código corto que parece codificar ruta (ej: `"053109"`, `"010701"`). Interpretación Dow-specific, a confirmar. |
| `RouteDescription` | Descripción codificada de la ruta. Ej: `"TM-ST05-TT31-TLT09"` para marítimo, `"LAA-CUST-PCKUP-AR-FTL EXPORT-0DAY-01"` para terrestre. |

### 7.9 BusinessInstructionsReferenceNumberNotes (TEXTO LIBRE CRITICO)

Campo string con instrucciones del exportador al forwarder. **Es el campo de mayor valor operativo y el de mayor dificultad de automatización**.

**Contenido operativo** (confirmado por Jona):
- Qué documentación debe enviarse y a qué direcciones.
- Instrucciones específicas para el BL (qué debe decir, qué NCM declarar, datos del consignee/notify).
- Instrucciones para certificado de origen, packing list, factura.
- Instrucciones regulatorias por país de destino (ej: CNPJ obligatorio en BL para Brasil, ISPM 15 para pallets de madera).
- Casos especiales: direct collect al banco, wooden package, freight collect vs prepaid.

**Estadísticas de los 11 JSONs**:

| Longitud del campo | Cantidad de JSONs |
|---|---|
| < 100 chars | 2 (mínimo: 44 chars) |
| 100 - 1000 chars | 3 |
| 1000 - 2000 chars | 2 |
| 2000 - 3000 chars | 1 |
| 3000+ chars | 3 (máximo: 3027 chars) |

**Estructura interna** (semi-estructurada, no estándar al 100%):
- Usa marcadores tipo `#12A#`, `#13A#`, `#15B#` (códigos de tipo de instrucción).
- Caracteres especiales escapados con `#` (reemplaza `ñ`, `ç`, etc. y símbolos `%`, `&`).
- Saltos de línea inconsistentes (a veces `,,` como separador).
- Dos variantes observables: estructurada con marcadores `#XX#` y de texto libre sin marcadores.

**Implicancia para el dashboard**: este campo es el candidato #1 para automatización con IA en fase 2/3. Hoy el equipo documental lo lee manualmente en cada orden. Parsearlo permitiría:
- Auto-armar el mailing a las direcciones correctas.
- Detectar requisitos especiales del BL antes de cargar en el portal de la naviera.
- Flagear casos especiales (direct collect, freight collect, requisitos regulatorios).

**En el schema**: persistir el texto completo crudo sin transformar, hasta que exista modelo de parseo validado.

### 7.10 Items (productos + contenedores)

Array de ítems. Cada ítem representa un producto dentro de un contenedor (o grupo de contenedores). Un JSON puede tener 1 a N ítems. En los 11 JSONs vimos ítems con una estructura consistente:

```json
{
  "ContainerDetails": [...],
  "ReferenceIdentification": [...],
  "BusinessInstructionsAndReferenceNumber": [...],
  "QuantityAndWeight": [...],
  "PricingInformationUnitPrice": ...,
  "PricingInformationQuantity": ...,
  "PricingInformationMonetaryAmount": ...,
  "ExchangeRateCurrencyCode": "USD",
  "ExchangeRate": ...,
  "DescriptionMarksAndNumbers": [...],
  "ItemIdentification": [...],
  "LJ": "N",
  "Hazardous": [],
  "Remarks": "..."
}
```

#### ContainerDetails

```json
{
  "NumberOfContainers": 2,
  "IntermodalServiceCode": "05",
  "EquipmentType": "40CZ",
  "EquipmentNumber": "40CMISSING",
  "SealNumber": "NA"
}
```

| Campo | Valores vistos | Significado |
|---|---|---|
| `NumberOfContainers` | 1, 2, 3, 4 | Cantidad de contenedores asignados al ítem |
| `IntermodalServiceCode` | `01`, `05` | **01** = terrestre (7 ocurrencias). **05** = marítimo contenedor completo (24 ocurrencias). Input de Jona: codifica tipo de exportación (contenedor completo, presurizado, aéreo, bulk). |
| `EquipmentType` | `40CZ`, `VAEM` | **40CZ** = contenedor marítimo 40 pies (no es ISO 6346 estricto, es código Dow-specific). **VAEM** = equipo terrestre (camión/van, sin contenedor marítimo). |
| `EquipmentNumber` | `40CMISSING`, `XNOTFOUNDX` | Placeholder — el número real del contenedor aún no se asignó cuando Dow genera el 304 (se conoce recién en despacho). |
| `SealNumber` | `NA` | Mismo motivo — precinto se asigna en despacho. |

#### ReferenceIdentification (nivel ítem)

Similar al nivel orden, qualifiers encontrados:

| Qualifier | Significado |
|---|---|
| `PO` | Purchase Order (mismo PO de la orden) |
| `CO` | Contract Number (si aplica) |
| `DP` | Delivery Point (código interno SAP del punto de despacho) |

#### BusinessInstructionsAndReferenceNumber (sub-qualifiers Dow)

Array de pares `ReferenceIdentification` + `Description`. **No son qualifiers X12 estándar** — son nombres de campos SAP/Dow transportados en el segmento L11:

| Sub-qualifier | Frecuencia | Significado | Ejemplo |
|---|---|---|---|
| `PGIDATE` | 31/31 ítems | **Post Goods Issue Date**. Fecha de planificación de despacho SAP. Formato YYYYMMDD. | `"20260425"` |
| `PAYMTRMS` | 31/31 ítems | **Payment Terms**. Descripción textual de condición de pago. Redundante con `TermsOfSaleDescription` del encabezado. | `"60 DAYS AFTER B/L DATE"` |
| `DELIVERY` | 31/31 ítems | **Delivery Number**. Número de documento de entrega SAP (VBELN del LIKP). Vincula el ítem con el flujo documental SAP. | `"0831636939"` |
| `OCEAN CSGN` | 7/31 ítems | **Ocean Consignment**. Aparece solo en algunos JSONs marítimos. Contiene datos del consignee en texto libre. | `"Caravan do Brasil Trading Ltda ..."` |

**Observación**: `PGIDATE`, `PAYMTRMS` y `DELIVERY` siempre aparecen juntos y son **esenciales para trazabilidad SAP**. `OCEAN CSGN` es una extensión que duplica datos del consignee ya presentes en Entities.

#### QuantityAndWeight

```json
{
  "GrossWeight": 27540,
  "ActualNetWeight": 27000,
  "BilledRatedWeight": 1080,
  "Volume": 45.522,
  "LadingQuantity": 1080,
  "PackagingFormCode": "BAG"
}
```

| Campo | Significado |
|---|---|
| `GrossWeight` | Peso bruto en kg (incluye packaging) |
| `ActualNetWeight` | Peso neto real en kg |
| `BilledRatedWeight` | Peso facturable (en unidades de packaging, no kg). **Típicamente coincide con `LadingQuantity`**. |
| `Volume` | Volumen en m³ (metros cúbicos) |
| `LadingQuantity` | Cantidad de bultos |
| `PackagingFormCode` | Tipo de envase. Siempre `"BAG"` en los 11 JSONs (resinas en bolsas de 25 kg). |

#### Pricing

| Campo | Significado |
|---|---|
| `PricingInformationUnitPrice` | Precio unitario |
| `PricingInformationQuantity` | Cantidad |
| `PricingInformationMonetaryAmount` | Monto total del ítem (= unit × quantity) |
| `ExchangeRateCurrencyCode` | Moneda de tipo de cambio (siempre `"USD"`) |
| `ExchangeRate` | Tipo de cambio informado |

#### DescriptionMarksAndNumbers

```json
{
  "LadingDescription": "DOWLEX(tm) TG 2085B Polyethylene Resin",
  "CommodityCode": "000000000000374367"
}
```

| Campo | Significado |
|---|---|
| `LadingDescription` | Nombre comercial del producto Dow. |
| `CommodityCode` | **GMID de Dow**, no HS code. Numérico de 18 dígitos con leading zeros. El significant number (últimos 6 dígitos) identifica el material en SAP. **Importante**: no se puede usar este campo directamente para declaración aduanera — el NCM/HS real hay que tomarlo de otra fuente. |

#### ItemIdentification

```json
{
  "ProductServiceIDQualifierVo": "0831636939",
  "ProductServiceIDQualifierVs": "000010",
  "ReferenceIdentificationItem": [
    {"ReferenceIdentification": "ITEMDESC", "FreeFormDescription": "..."},
    {"ReferenceIdentification": "DGTXT", "FreeFormDescription": "..."},
    {"ReferenceIdentification": "HAZPROPERNAME1", "FreeFormDescription": "..."}
  ]
}
```

| Campo | Significado |
|---|---|
| `ProductServiceIDQualifierVo` | **VO** en X12 = Vendor's Order Number. El número es el Delivery SAP. |
| `ProductServiceIDQualifierVs` | **VS no es qualifier X12 estándar**. El número es el ítem de la delivery (10, 20, 30...). Probable convención Dow. |
| `ReferenceIdentificationItem[].ITEMDESC` | Descripción extendida del ítem con unidad y packaging. |
| `ReferenceIdentificationItem[].DGTXT` | **Dangerous Goods Text** — texto regulatorio de peligrosidad (`"Not regulated for transport"` en todos los JSONs, son resinas no peligrosas). |
| `ReferenceIdentificationItem[].HAZPROPERNAME1` | **Hazardous Proper Name 1** — nombre regulatorio UN (IMDG/IATA). En estos JSONs siempre `"Not regulated for transport"`. |

#### Otros campos de ítem

| Campo | Valor en los 11 JSONs | Significado |
|---|---|---|
| `LJ` | Siempre `"N"` (31/31) | Campo X12 estándar "LJ" = Local Jurisdiction. Con valor `N` probablemente es un flag Y/N Dow-specific (no es jurisdicción). Pendiente confirmar. |
| `Hazardous` | Siempre `[]` (vacío) en los 11 JSONs | Array de datos de peligrosidad. Vacío porque son resinas no reguladas. Estructura a confirmar cuando aparezca una orden de producto peligroso. |
| `Remarks` | Texto libre, opcional | Aparece en ítems que son "copias" de otro (repetición del producto en otro contenedor). Contiene `"Marking Instructions:..."`. |

### 7.11 Clasificación de campos para el schema

Para el diseño de Supabase, clasificación por criticidad operativa (basado en input de Jona + análisis de JSONs):

**Categoría A — Críticos para el dashboard (se muestran/operan con ellos diariamente)**

- `PO` (de `ReferenceIdentificationGeneral`) — identificador principal visible. **Persistir crudo (10 chars) + mostrar sin leading zero** (ver `business-context.md` 9.1).
- `ShipmnetIdentificationNumber` — ID secundario.
- `TransportationMethodTypeCode` (MOT: O/M) — discrimina marítimo/terrestre.
- `IntermodalServiceCode` — tipo de exportación.
- `TransportationTermsCode` (Incoterm) — **crítico**, determina la interpretación de `DeliveryLocation`.
- `DeliveryLocation` — **lugar Incoterm, NO destino físico final**. Se combina obligatoriamente con `TransportationTermsCode` para interpretar. Ver 7.13 hallazgo 1.
- `TariffServiceCode` (DD/DP).
- **Entidad `ST` (Ship To) — destino físico final** de la mercadería. Campos críticos: `Name`, `CityName`, `CountryCode`, `TAXID`, `AddressInformation`. Es la fuente real del destino para mailing, tracking, documentación.
- Entidad `N1` (Notify Party) — nombre, email del contacto. **Fallback universal del mailing** (11/11 con mail en la muestra). Ver 7.13 hallazgo 2.
- Entidades `EX`, `BT`, `CN` con `Name`, `TAXID`, `Address`, `Email` principal.
- `Items[].LadingDescription` — nombre del producto.
- `Items[].CommodityCode` (GMID).
- `Items[].ContainerDetails.NumberOfContainers` y `EquipmentType`.
- `Items[].QuantityAndWeight.*` (peso, volumen, cantidad).
- `DateTimeReference` (RSD y 002).
- `Items[].BusinessInstructionsAndReferenceNumber.PGIDATE` — fecha despacho planificada.
- `Items[].BusinessInstructionsAndReferenceNumber.DELIVERY` — número de delivery SAP.
- `BusinessInstructionsReferenceNumberNotes` — instrucciones al forwarder (texto crítico). Ver sección 8 de `business-context.md` y 7bis del mismo archivo para su rol en el mailing.

**Categoría B — Trazabilidad (se guardan, se consultan a demanda)**

- `RoutingNumber` — constante, metadata.
- Qualifiers `PE`, `SF` (Plant, Ship From).
- `CO` (contract number) cuando existe.
- `PlaceOfReceiptCode`, `PlaceOfDelivery`.
- `RouteInformation.FreeFormDescription`, `RouteDescription`.
- `ExchangeRate`, `ExchangeRateCurrencyCode`.
- `PricingInformation*` (precios).
- Entidades secundarias: `DIR`, `NP`, `AO`, `PK`, `PK2`, `PK3`.
- `PAYMTRMS` (redundante con `TermsOfSaleDescription`).
- `TermsOfSale`, `TermsOfSaleDescription`.

**Categoría C — Probablemente ignorable (metadata técnica o sin variación)**

- `TransactionSetPurposeCode` (constante 49).
- `ApplicationType` (constante BN).
- `ShipmentMethodPayment` (constante PP).
- `CurrencyCode` (constante USD).
- `q` (endpoint destino, metadata).
- `EquipmentNumber`, `SealNumber` (siempre placeholders).
- `LJ` (siempre N).
- `Hazardous` (siempre vacío en los 11; revisar cuando aparezcan peligrosos).
- Qualifiers `19`, `11`, `1V`, `AEG`.
- `OCEAN CSGN` (duplica datos de Entities).
- `LocationIdentifier` de entidades (sin normalizar, no aporta vs la dirección completa).

### 7.12 Puntos a confirmar con Brian/Santiago (o pendientes de Jona)

Para cerrar el schema definitivamente, resta validar:

1. ~~**Diferencia PO `0118...` vs `4010...`**~~ — **Cerrado (22/04)**. Trade (`0118...`) vs STO intercompany (`4010...`). Ver `business-context.md` 4.3.
2. **Códigos `D116`, `D146`, `D147`, `D176`** — mapa completo de shipping points / plantas Dow.
3. **Códigos `P703`, `P706`, `P749`** — mapa completo de transportation planning points.
4. **Significado exacto de `AEG`** y por qué aparece solo en algunas órdenes. **Parcial (22/04)**: confirmado que aparece solo en trade (`0118...`) porque es metadata regulatoria US-AES que no aplica a intercompañía. Falta confirmar si los valores posibles son más allá de `"DIRECT CONSUMER"`.
5. **Significado de `LJ=N`** — confirmar que es flag Y/N y qué flag exactamente.
6. **Estructura del array `Hazardous`** cuando una orden contiene productos peligrosos.
7. **Qualifier `RSD` en `DateTimeReference`** — confirmar que es Requested Ship Date.
8. **`SCAC "SSB"`** — confirmar si está registrado NMFTA o es código bilateral con Dow.
9. **`EquipmentType 40CZ` y `VAEM`** — validar mapping a tipos de contenedor/equipo estandarizados.
10. **Normalización de `LocationIdentifier`** (B, C, BA, SC, SP, PR, RM, LIM, V, MG, MEX) a códigos de estado/provincia o UN/LOCODE.

Estas preguntas se agregan a `preguntas.md`.

### 7.13 Validación empírica con los 11 JSONs cargados (22/04 tarde)

Los 11 JSONs fueron cargados al endpoint del Walking Skeleton y analizados vía SQL sobre la tabla `inbound_events` en Supabase. Hallazgos netos que complementan o corrigen la documentación previa:

#### Hallazgo 1 — `DeliveryLocation` ≠ destino físico final (corrección importante)

Cruzando `DeliveryLocation` con `TransportationTermsCode` (Incoterm) y con la entidad `ST.CityName`:

| Incoterm | DeliveryLocation | Ship To city | Ship To país | Ship To empresa |
|---|---|---|---|---|
| CFR | Navegantes Port | ITAJAI | BR | DOW BRASIL |
| CFR | Santos Port | EXTREMA | BR | DOW BRASIL |
| CFR | Santos Port | EXTREMA | BR | DOW BRASIL |
| CFR | Santos Port | EXTREMA | BR | DOW BRASIL |
| CPT | CALLAO PORT | LIMA | PE | TECNOLOGIA DE MATERIALES |
| CPT | MAIPU | MAIPU | CL | PETROQUIMICA DOW |
| CPT | NAVEGANTES PORT | BALNEARIO CAMBORIU | BR | CARAVAN DO BRASIL |
| CPT | NAVEGANTES PORT | BALNEARIO CAMBORIU | BR | CARAVAN DO BRASIL |
| CPT | SALVADOR PORT | VITORIA DA CONQUISTA | BR | CHIACCHIO |
| FCA | ABBOTT WHSE | RIO GRANDE | AR | RIO CHICO |
| FCA | BAHIA BLANCA | LONDRINA | BR | CRYOVAC LONDRINA |

Patrón confirmado:
- En **FCA** (2 órdenes): `DeliveryLocation` es el **punto de entrega en origen** (Abbott Whse, Bahía Blanca). La mercadería va físicamente a otro destino (Río Grande Tierra del Fuego, Londrina Brasil).
- En **CFR/CPT** (9 órdenes): `DeliveryLocation` es el **puerto de descarga marítima**. La mercadería continúa después a la ciudad final del `Ship To` (ej: Santos → Extrema, Callao → Lima, Salvador → Vitória da Conquista). Dow paga hasta el puerto, no hasta el cliente.

**Consecuencia para el schema**: el dashboard necesita **dos campos distintos**, no uno:
- **Destino logístico / punto Incoterm** → `DeliveryLocation` + `TransportationTermsCode`. Útil para tracking del tramo que gestiona Dow/SSB.
- **Destino físico final** → `ST.Name`, `ST.CityName`, `ST.CountryCode`. Útil para el documental (mailing, documentación final).

Si el dashboard mostrara solo `DeliveryLocation` como "destino", en FCA y en CPT/CFR con continuación terrestre el documental vería información engañosa.

#### Hallazgo 2 — `N1` con mail presente en el 100% de los JSONs

Los 11 JSONs tienen `N1` (Notify Party) con un email válido en el array de `Contacts`. Esto valida la regla del mailing: **`N1` sirve como fallback universal** si el parseo del campo `BusinessInstructionsReferenceNumberNotes` falla o no arroja destinatarios claros.

**Caveat**: 11 JSONs no garantizan que la regla valga para los 150-200/mes de producción. El dashboard debe chequear en runtime y loguear warning si alguna vez cae una orden sin mail de N1. Costo trivial, buena defensa.

#### Hallazgo 3 — Concentración del mailing STO en despachantes conocidos

Agrupación del `N1.Name` por tipo de orden en la muestra:

| notify_name | cantidad | Tipo probable |
|---|---|---|
| COMISSARIA PIBERNAT | 3 | STO Brasil (despachante Dow en Brasil) |
| CARAVAN DO BRASIL | 2 | Trade Brasil (cliente directo) |
| CHIACCHIO | 1 | Trade Brasil |
| CRYOVAC LONDRINA | 1 | Trade Brasil |
| BDP INTERNATIONAL CHILE | 1 | STO Chile (despachante) |
| TECNOLOGIA DE MATERIALES | 1 | Trade Perú |
| RIO CHICO | 1 | Trade Argentina (Tierra del Fuego) |
| BDP SOUTH AMERICA | 1 | STO (despachante) |

Observación: en **STO** el notify es casi siempre un **despachante/forwarder intermediario conocido** (Pibernat en Brasil, BDP en Chile). En **Trade** el notify suele ser el **cliente directo** (Chiacchio, Cryovac, Tecnología de Materiales, Caravan, Rio Chico).

Implicancia para la automatización del mailing (ver `business-context.md` 7bis.3):
- **Mailing STO automatizable con tabla maestra** cliente STO → despachante_destino, sin necesidad de parseo IA.
- **Mailing Trade requiere parseo IA** del campo de instrucciones (o fallback a N1).

#### Hallazgo 4 — `DeliveryLocation` con casing inconsistente

En la muestra aparecen `"NAVEGANTES PORT"` (2) y `"Navegantes Port"` (1) como 3 órdenes distintas al mismo puerto. Para SQL son 2 destinos distintos.

Implicancia: el schema normalizado necesitará una **tabla maestra de destinos** (catalog) para unificar variantes. No es urgente (lo resolvemos cuando tengamos el schema normalizado), pero es un requerimiento confirmado empíricamente, no un supuesto teórico.

#### Hallazgo 5 — Plantillas repetidas en el campo de instrucciones

Las 3 órdenes de Pibernat tienen `BusinessInstructionsReferenceNumberNotes` de 3027 caracteres **idénticos**. Las 2 de Caravan tienen el mismo campo de 1926 caracteres idénticos. Esto sugiere que Dow usa **plantillas reutilizables** por cliente, lo cual es buena noticia para el parseo con IA en fase 2/3 — patrón estable significa mejor precisión.

#### Distribución confirmada

| Dimensión | Esperado (sección 7.2) | Medido | Estado |
|---|---|---|---|
| Trade / STO | 6 / 5 | 6 / 5 | ✅ Confirmado |
| Marítimo / Terrestre | 8 / 3 | 8 / 3 | ✅ Confirmado |
| Incoterms presentes | CPT, CFR, FCA | CPT, CFR, FCA | ✅ Confirmado |

---

## 8. APIs de navieras — research técnico (24/04/2026)

R1 del MVP incluye **generación de declaración de embarque** (Shipping Instruction / SI) y **control del BL draft**. Hasta el 23/04 el supuesto tácito era que el dashboard armaría la SI internamente y el documental la cargaría manualmente en el portal de cada naviera. El 24/04 Jona abrió una investigación para evaluar si las 3 navieras principales (Log-In, Maersk, Hapag-Lloyd) ofrecen API de submit de SI y retorno del BL draft — lo que cambiaría R1 de "dashboard asistido" a "dashboard end-to-end".

**Archivo con el research completo**: `research-apis-carriers.md` (en este mismo directorio). Acá queda el resumen ejecutivo y los findings necesarios para que el resto de los .md tengan contexto sin tener que abrir el archivo grande.

### 8.1 BLUF del research

Los 3 carriers tienen madurez técnica muy asimétrica:

| Carrier | Volumen SSB | Submit SI por API | Get BL draft | Estado general |
|---|---|---|---|---|
| **Log-In** | 60-70% (principal) | **No** | **No** | Solo portal web Log-Aí. No tiene developer portal, no está en DCSA, no hay APIs públicas documentadas. Pendiente respuesta del mail enviado. |
| **Maersk** | 2do volumen | **Sí productivo** (DCSA BL 3.0 + INTTRA) | **Sí** | Developer Portal con OAuth2. 6 APIs DCSA productivas. Bloqueante: Customer Code vinculado a cuenta A136 PBB/Dow. |
| **Hapag-Lloyd** | 3ro volumen (bajo) | **No en catálogo público** | No público | T&T DCSA + Schedules sí; submit de SI no. Canal alternativo real: INTTRA. Dado el bajo volumen, **INTTRA marcado como plan B, no plan A**. |

### 8.2 Hallazgos factuales (datos oficiales de los portales)

**Maersk** — Developer Portal en [developer.maersk.com/api-catalogue](https://developer.maersk.com/api-catalogue):

- Productos DCSA relevantes para R1: **Ocean Booking v2 [DCSA]**, **Ocean Booking Status Webhook [DCSA]**, **Ocean – Carrier Bill of Lading [DCSA]** (cubre submit de SI + retorno de Transport Document/draft BL + BL final), **Ocean Commercial Schedules [DCSA]**.
- Productos de tracking (para R4): **Track and Trace Plus**, **Maersk Visibility Studio** (con webhook push).
- Auth: OAuth 2.0 client credentials flow. Endpoints REST JSON.
- Rate limits por consumer key, HTTP 429 en exceso.
- Onboarding self-service en [accounts.maersk.com/developer-maeu/user/register](https://accounts.maersk.com/developer-maeu/user/register). Mail corporativo obligatorio para Customer APIs.
- **Bloqueante real**: las Customer APIs requieren al menos 1 Customer Code válido de Maersk vinculado al consumer key. Para que responda con datos de órdenes PBB/Dow, tiene que ser el código de cuenta A136. Esto se pide a la oficina local Maersk Argentina — no lo genera el portal.
- **Canal alternativo**: INTTRA / e2open. Maersk confirma oficialmente que acepta SI vía INTTRA sin intervención manual ([Maersk BL transfer 2025](https://www.maersk.com/news/articles/2025/03/11/digital-solutions-update-bill-of-lading-transfer)).
- **Draft BL / Verify Copy**: desde 15-sept-2025 Maersk discontinuó pedidos manuales por mail. Las vías válidas son (a) API DCSA Transport Document, (b) suscripción a notificación email con PDF adjunto, (c) descarga del portal.
- Maersk también soporta **EDI IFTMIN D99B** bilateral para clientes con volumen.

**Hapag-Lloyd** — Developer Portal en [api-portal.hlag.com](https://api-portal.hlag.com/):

- Productos públicos: **Track & Trace (DCSA 2.2)** en BETA pública, **Quick Quotes**, **Quick Quotes Spot**, **Routing**, **Live Position**, **Reefer Monitoring**, **Commercial Schedules (DCSA)**.
- **Submit SI: no hay API en catálogo público**. Las vías reales son: eaSI (PDF editable por mail/web), Hapag-Lloyd Navigator (portal web), INTTRA, EDI bilateral.
- **Draft BL**: herramienta "BL Draft Approval" dentro del Navigator web. No hay API documentada para descarga del draft.
- **eBL**: emite vía IQAX o WaveBL (plataformas terceras, requieren registro separado del cliente).
- Auth: OAuth 2.0 Authorization Code. Onboarding manual — aprobación puede tardar semanas.
- **Decisión de SSB**: dado que Hapag-Lloyd es bajo volumen (3ro), **INTTRA se marca como plan B, no se prioriza hoy**. Si algún día Hapag sube volumen o publica su SI API, se reevalúa.

**Log-In** — sin developer portal conocido:

- Único canal digital confirmado: **Log-Aí** (plataforma web en [logai.loginlogistica.com.br](https://logai.loginlogistica.com.br)) con login/password. Funcionalidades publicadas: booking online, tracking, envío/descarga de documentación.
- No está en DCSA (DCSA son 10 carriers globales; Log-In es cabotagem Brasil + Mercosur).
- No aparece en INTTRA ni en otros hubs conocidos.
- **Respuesta oficial pendiente**: Jona envió mail el 24/04 a Log-In preguntando por API directa, EDI, hub alternativo. Sin respuesta al 24/04.
- Inferencia razonable (sin confirmación): camino realista sería RPA sobre Log-Aí, email estructurado, o algún acuerdo bilateral si Log-In lo ofrece.
- **Impacto**: Log-In concentra el mayor volumen, y es el carrier con menor madurez técnica. Asimetría clave que R1 tiene que absorber.

### 8.3 Estándar DCSA — por qué importa

**DCSA** (Digital Container Shipping Association): asociación fundada en 2019 por Maersk, MSC, CMA CGM, Hapag-Lloyd, ONE, Evergreen, Yang Ming, HMM y ZIM (PIL se sumó en 2024). Publica specs públicas de API para container shipping, alineadas con UN/CEFACT e IMO.

Estándares relevantes para R1:

- **DCSA Booking 2.0** — define el contrato de datos de una reserva (booking). Finalizado febrero-2025.
- **DCSA Bill of Lading 3.0** — incluye módulos de Shipping Instructions, Transport Document (draft + final), eBL Issuance, eBL Surrender. Finalizado febrero-2025.

Maersk tiene implementaciones productivas de ambos. Hapag-Lloyd tiene el roadmap pero no expuesto públicamente aún. Log-In no es miembro y no se espera adopción en el corto plazo.

**Valor estratégico para SSB**: adoptar DCSA como **modelo de datos interno** (canonical model) desacopla el dashboard de la diversidad de canales. Un solo contrato interno que se traduce a REST Maersk, EDI INTTRA (si algún día lo usamos), scraping Log-Aí, o lo que venga. Se documenta como decisión pendiente de análisis en `plan.md` y se defiende con ejemplo de mapeo 304 → DCSA la próxima sesión.

Repos de referencia DCSA:
- [github.com/dcsaorg/DCSA-OpenAPI](https://github.com/dcsaorg/DCSA-OpenAPI) — specs OpenAPI.
- [github.com/dcsaorg/DCSA-EBL](https://github.com/dcsaorg/DCSA-EBL) — implementación de referencia Java.

### 8.4 5 decisiones de diseño que este research habilita

El research abrió 5 decisiones grandes de arquitectura R1. Quedan **enumeradas, no tomadas**. Las analizamos con cabeza fresca al inicio de la próxima sesión.

1. **Arquitectura de adapters por carrier**. Que el dashboard trate a cada carrier como caja negra que implementa `submitSI()` + `onDraftBLReady()`. Maersk usa API nativa, Hapag vía INTTRA plan B, Log-In vía RPA/email estructurado. Interface común adentro, implementaciones distintas. Desacopla al resto del sistema de la heterogeneidad técnica.
2. **Contratar INTTRA / e2open**. Resolvería Hapag-Lloyd y daría canal redundante para Maersk. **No resolvería Log-In**. Dado que Hapag es bajo volumen, **queda como plan B, a evaluar solo si Hapag sube volumen o si una segunda línea de negocio (otro cliente SSB) lo requiere**.
3. **Orden de arranque de R1**. Eje técnico por Maersk (API madura, feedback rápido, menor riesgo, sirve de referencia para el modelo de datos DCSA). Eje de proceso/UX por Log-In (ahí está el volumen y el dolor manual). No arrancar los 3 en paralelo.
4. **DCSA Bill of Lading 3.0 como contrato interno**. El dashboard traduce una sola vez (304 → DCSA en el borde) y todo adentro habla DCSA. Cuando Hapag publique su SI API, ya está hecha media integración. Para Log-In es un contrato estable aunque nunca adopte DCSA.
5. **Orden de onboarding Maersk**. 1) registrar en developer portal (10 min), 2) crear app y obtener consumer keys (5 min), 3) suscribir los 6 productos DCSA + Visibility Studio (15 min), 4) pedir Customer Code A136 a oficina local Maersk AR (días-semanas), 5) pedir aprobación Visibility Studio por mail separado ([MVSAPISupport@maersk.com](mailto:MVSAPISupport@maersk.com)). Mientras el Customer Code está en trámite, Claude Code puede desarrollar contra mock services del portal + schemas DCSA de GitHub.

### 8.5 Preguntas derivadas — en `preguntas.md`

- Q34 — ¿Log-In ofrece alguna forma de automatización no-UI? (pendiente respuesta Log-In al mail del 24/04).
- Q35 — ¿Maersk tiene algún programa de onboarding API específico para forwarders LATAM o cuentas Dow? (pendiente respuesta al mail del 24/04).
- Q36 — Cotización INTTRA / e2open — solo si Hapag-Lloyd no publica su SI API y el volumen empieza a justificarlo.
- Q37 — Customer Code Maersk vinculado a cuenta A136 PBB/Dow. Pedir a oficina local Maersk AR. **Bloqueante de R1 Maersk**.
- Q38 — Confirmación técnica de las 5 decisiones de diseño del research. **A tomar al inicio de la próxima sesión**.

### 8.6 Implicancia para el diseño de R1

Con este research, R1 deja de ser "un único camino técnico para los 3 carriers" y pasa a ser "3 caminos asimétricos coordinados por un adapter common interface". Eso **no cambia el alcance funcional del MVP** (sigue siendo declaración de embarque + control BL marítimo), pero cambia la estrategia de implementación:

- **Maersk**: API nativa, automatización end-to-end posible dentro del sprint técnico.
- **Hapag-Lloyd**: bajo volumen, R1 puede arrancar en modo asistido (carga manual con dashboard que muestra el package pre-llenado) sin perder mucho valor. INTTRA queda reservado.
- **Log-In**: depende de la respuesta del mail. Si Log-In dice "sí tenemos API/EDI/SFTP", R1 lo integra. Si dice "no hay nada", R1 arranca en modo asistido + evaluación de RPA.

El `plan.md` **no se actualiza con esto en la sesión de 24/04** — las 5 decisiones se toman la próxima sesión con cabeza fresca, y recién ahí se ajustan R1 y el backlog.

---

---

## 9. Análisis de 111 JSONs — hallazgos clave (29/04)

**Muestra**: 11 manuales del 22/04 + 100 nuevos del 29/04 vía script contra `importer.ssbplatform.com`. STO=55, Trade=56.

### 9.1 Regla estable: Item = Delivery = Contenedor

Confirmado en 111/111 órdenes: `Items.length` = deliveries únicas = contenedores o camiones.

- `Items[].ContainerDetails[].NumberOfContainers` repite el total del shipment por ítem → **NO usar para contar contenedores**.
- `Items.length` es el contador correcto.
- Número de delivery SAP: `Items[].ItemIdentification[0].ProductServiceIDQualifierVo` (qualifier VO).
- Mostrar sin leading zeros: `parseInt(val, 10).toString()`.

### 9.2 GMID y descripción de producto

| Campo | Path en JSON | Ejemplo |
|---|---|---|
| GMID (18 dígitos) | `Items[].DescriptionMarksAndNumbers.CommodityCode` | `000000000000374367` |
| GMID significativo (6 dígitos) | últimos 6 del CommodityCode | `374367` |
| Descripción comercial | `Items[].DescriptionMarksAndNumbers.LadingDescription` | `DOWLEX(tm) TG 2085B Polyethylene Resin` |

### 9.3 MOT: fallback por RouteDescription

`RouteInformation[0].TransportationMethodTypeCode` vacío en algunas órdenes STO.

- `O` → Marítimo
- `M` → Terrestre
- vacío → leer `RouteDescription`: `DSV/TT/TM-/SEA` → Marítimo; `FTL/CUST/PCKUP/AR-` → Terrestre

110 explícitos + 1 inferido correctamente en la muestra.

### 9.4 DeliveryLocation — normalización requerida

17 valores únicos con inconsistencias de case (`Santos Port` vs `SANTOS PORT`). Schema normalizado aplica `UPPER(TRIM())` al ingestar.

### 9.5 Discriminadores perfectos STO / Trade

| Campo | STO | Trade |
|---|---|---|
| `TariffServiceCode` | `DP` (55/55) | `DD` (56/56) |
| `TransportationTermsCode` | `CFR`, `FOB` | `CPT`, `CIP`, `FCA` |
| Qualifiers `1V`/`CO`/`AEG` | nunca | siempre |

### 9.6 Campos siempre constantes (metadata)

`RoutingNumber` siempre `33708426259`, `SealNumber` siempre `NA`, `Hazardous` siempre `[]`, `CurrencyCode` siempre `USD`, `SCAC` siempre `SSB`.

### 9.7 Entity identifiers — mapeo operativo corregido

| Code | Rol correcto |
|---|---|
| `EX` | Exporter (PBB Polisur A136) |
| `ST` | Ship-To (destinatario físico, fuente del país destino) |
| `N1` | Notify Party |
| `BT` | Bill-To |
| `16` | Plant / Punto de despacho |
| `NP` | Notify Party secundario |
| `CN` | Consignee BL |
| `DIR` | Distribution Recipient (NO "Director") |
| `PK` | Doc. Recipient original |
| `PK2`, `PK3` | Doc. Recipient copia 2/3 |
| `AO` | Puerto de destino (Account Of) |

### 9.8 BusinessInstructionsReferenceNumberNotes (TXT 107)

Presente en 111/111 con 27 variantes únicas. Instrucciones al forwarder: BL, NCM, notify party, distribución de documentos, empaque ISPM 15, collect/prepaid. Campo de mayor valor operativo para R1. Persistir completo crudo + parseado. Nunca sobreescribir el crudo.

---

## 10. Legacy schema analysis — Importer + Metric (29/04)

Análisis de `~/projects/importer` (Laravel 8) + `~/projects/metric-api` (Flask). Solo exportación Dow. Detalle completo en `docs/legacy-schema-analysis.md`.

### 10.1 Hallazgos críticos

1. Tablas master del Importer: `orders` + `shipments` (~80 columnas). Relacionadas por `orders.id ↔ shipments.order_id`. Ultra-anchas — el schema nuevo no replica esto.
2. Claves de join estables: `purchase_order` y `shipment_number`.
3. 301 a SAP: no se envía por HTTP — persiste en `report_301`. SAP lee por batch. [Confirmar con Santiago — Q44].
4. 315 events: `VD` → `actual_departure_date` + `status_id=12`. `VA` → ETA + `status_id=9`.
5. API Interlog [PRÓXIMA A PRODUCCIÓN]: `POST /prefolder/send` en Metric. PO + PDF base64 → JWT → `prefolder_operation_log` → mail Mailgun.
6. Permiso de exportación: `orders.dispatch_number` (Importer) + `simis.nro_despacho` (Metric). Hoy manual. Slot natural para el dashboard.

### 10.2 Tabla comparativa de entidades clave

| Entidad | En JSON 304 | En Importer | En Metric |
|---|---|---|---|
| PO Number | `RefIdGeneral[PO]` | `orders.purchase_order` | `orders.purchase_order` |
| Shipment Num. | `ShipmnetIdentificationNumber` | `shipments.shipment_number` | `shipments.shipment_number` |
| Naviera/SCAC | `RouteInfo[].SCAC` (siempre SSB) | `shipments.carrier_id→carriers` | `carrier_leg` |
| Buque/Vessel | no está | `shipments.vessel_id→vessels` | `expo_vessels` [?] |
| ETD | `DateTimeRef[002]` (cargo ready) | `shipments.estimated_departure_date` | misma |
| ETA | no está | `shipments.estimated_arrival_date` | misma |
| BL Number | no está | `orders.bill_of_landing` (duplicado en shipments) | misma |
| Puerto destino | `DeliveryLocation` + `PlaceOfDelivery` (24%) | `orders.destination_port_id→ports` | `dow_port` |
| Permiso exportación | no está | `orders.dispatch_number` | `simis.nro_despacho` |
| Instrucción Interlog | N/A | N/A | `prefolder_operation_log` |

### 10.3 Inconsistencias que el schema nuevo no replica

1. Doble path entidad↔orden (FK directa + pivote) → elegir uno.
2. `bill_of_landing` duplicado en `orders` y `shipments` → una sola fuente.
3. `shipments` ultra-ancha de ~80 columnas → schema nuevo comienza limpio.
4. Sin transacciones en `OrderController::store` → el nuevo arranca con `BEGIN/COMMIT`.
5. `log_jsons` solo cubre inbound. 301/315 en tablas separadas → dashboard unifica.

---

## 11. API Interlog + permisos de exportación (29/04)

### 11.1 API Interlog — instrucción de exportación

- **Estado**: próxima a producción en Metric.
- **Endpoint**: `POST /prefolder/send` (prefolder_routes.py:700).
- **Payload**: PO + PDF instrucción de exportación en base64.
- **Flujo**: JWT → `prefolder_operation_log` → mail Mailgun si `send_email_on_success=1`.
- **Sub-régimen**: `simis` JOIN por `dispatch_number = nro_despacho` con filtro `siglas='EC' AND tipo_operacion='permiso_embarque'`.

### 11.2 Permisos de exportación — flujo planificado

- **Origen**: Interlog envía permisos por mail.
- **Destino**: casilla `ssbintn8n@ssbint.com` (n8n).
- **Formato**: `{YY}{NNN}EC{NN}{NNNNNNN}{L}` — ej. `25003EC03002997S`.
- **Estado actual**: nadie parsea estos mails. `simis.nro_despacho` se carga manual.
- **Plan**: n8n lee la casilla, extrae el número, lo asocia por PO/despacho, lo persiste en el schema normalizado.
- **Uso**: cruce contra planilla de aduana y declaración de embarque para detectar errores y órdenes sin permiso.
