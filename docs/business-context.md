# business-context.md — SSB International × PBB Polisur (Dow)

**Proyecto**: SSB-IT-RESEARCH
**Propósito**: documento de contexto operativo y glosario del negocio. Fuente única para que cualquier decisión técnica (schema, arquitectura, prompts, workflows) esté anclada en la operativa real de SSB.
**Autor**: Jona Zenteno (contenido), consolidación con Claude.
**Versión**: 2 — 22/04/2026 (cierre tarde)
**Mantenimiento**: se actualiza cuando aparece un concepto nuevo del dominio o cambia la operativa. No se edita sin consulta a Jona.

---

## 1. Alcance de este documento

Este archivo cubre **solo** lo que aplica al SSB Export Dashboard (el dashboard nuevo). Hay proyectos adyacentes (Validador Aduanal, Tarifa Schedule, Inbox Triage) cuya lógica interna vive en sus propios repos — acá se los menciona solo cuando interactúan o aportan conceptos.

**El objetivo del dashboard**: reducir el equipo documental de 2 a 1 persona manteniendo 150-200 órdenes/mes, automatizando el flujo de exportación desde ingesta del 304 hasta envío de documentación al cliente y tracking.

---

## 2. Las empresas

### 2.1 SSB International
- **Rol**: forwarder / NVOCC argentino que gestiona la operación completa de exportación para PBB Polisur.
- **Servicios**: coordinación logística, tramitación de permiso de embarque, generación y control documental, comunicación con clientes finales, tracking desde planta hasta destino.
- **NO es**: ni exportador de récord ni despachante de aduana. Es el intermediario que coordina y controla todo el proceso.
- **Mail grupal operativo**: `expo.rpbb@scbint.com`.

### 2.2 PBB Polisur (Dow)
- **Rol**: cliente. Exportador de récord (aparece como `EX` en todos los 304 con `IdentificationCode: A136`).
- **Producto principal**: resinas de polietileno en bolsas de 25 kg. Algún volumen de carga bulk.
- **Plantas**:
  - **Bahía Blanca** (códigos SAP `D146`, `D147`, `D116` según la subárea): planta principal de producción, aduana domiciliaria.
  - **Abbott** (código `D176`): planta de embolsado, también aduana domiciliaria.
- **Sistema del cliente**: SAP. El 304 lo genera el SAP corporativo global de Dow, no un ERP local.

### 2.3 Interlog (despachante de aduana)
- **Rol**: despachante externo. Uno solo para toda la operación PBB Polisur.
- **Relación**: tiene contrato directo con PBB Polisur, no con SSB.
- **Función**: tramita los permisos de exportación a partir de la instrucción de exportación que le envía SSB.
- **Integración futura**: hay una API en desarrollo (por programadores externos) entre Metric e Interlog para reemplazar el envío actual por mail + PDF.

---

## 3. El equipo interno de SSB

7-8 personas, divididas por rol:

| Rol | Cantidad | Responsabilidad |
|---|---|---|
| Supervisor (Jona) | 1 | Mejoras de automatización. Dueño del proyecto dashboard. |
| Líder de equipo | 1 | Apoyo general, el más experimentado. |
| Coordinador marítimo | 1 | Operaciones marítimas. Excel: SEGUIMIENTO MPC. |
| Coordinador terrestre general | 1 | Terrestre Brasil/Chile/Perú. Excel: NUEVO SEGUIMIENTO TERRESTRE. |
| Coordinador terrestre Río Chico | 1 | Solo Tierra del Fuego. Excel: Planilla terrestre RC. |
| Documentales | 2 | Certificados de origen, declaraciones VLE, envío de documentación, VGM, tablero documental. Excel: Control de cargas V2 MPC. |

**El dashboard apunta principalmente a absorber trabajo de los 2 documentales**, no de los coordinadores.

---

## 4. Volumen y alcance operativo

### 4.1 Volumen
- **300-400 contenedores/camiones por mes** en total.
- **150-200 órdenes/mes** es el subconjunto relevante para este dashboard (exportación de PBB Polisur, foco en documentación marítima + terrestre a Brasil/Chile/Perú).

### 4.2 Destinos principales
Brasil es el 70%+ del volumen. Después Chile, Perú, Tierra del Fuego. Volumen menor: USA, China, región andina.

### 4.3 Tipos de orden SAP

Dow emite dos tipos de orden con prefijos distintos en el PO, visibles en los 304. **Confirmado operativamente por Jona (22/04)** y **validado empíricamente con los 11 JSONs cargados el 22/04 tarde**:

| Prefijo PO | Tipo | Características en el 304 |
|---|---|---|
| `0118...` | **Trade** (venta a cliente externo) | Trae qualifiers adicionales: `1V`, `CO`, `AEG` (AES - Ultimate Consignee Type, regulación US) |
| `4010...` | **STO** (Stock Transfer Order, intercompany Dow → Dow) | Trae solo qualifiers mínimos: `19`, `11`, `PE`, `SF`, `PO` |

El prefijo es estable: todas las trade arrancan con `0118`, todas las STO con `4010`.

**Validación empírica (11 JSONs)**: 6 Trade + 5 STO = 11. Sin excepciones. Sin órdenes con prefijos distintos.

**Diferencia operativa clave para el dashboard**:

| Aspecto | STO (`4010...`) | Trade (`0118...`) |
|---|---|---|
| Destinatario de la documentación | **Siempre el mismo forwarder** del lado del destino (típicamente Brasil). Predecible con tabla maestra. | Variable orden a orden. Se extrae del campo `BusinessInstructionsReferenceNumberNotes` del 304. |
| Destinos | Recurrentes y acotados (Santos, Navegantes, Rio de Janeiro, Paranaguá, Itajaí, etc.). | Dispersos: ~30-40 clientes distintos con baja rotación. |
| Estandarización del flujo | Alta. | Media — requiere leer instrucciones específicas del exportador en cada orden. |
| Regulación US (AES) | No aplica (es intercompañía). | Aplica. `AEG` lleva el tipo de consignee final. |
| Candidato a automatización fase 3 | **Alto** — mailing resoluble con tabla maestra cliente → forwarder. | **Medio** — requiere parseo IA del campo de instrucciones. |
| Tamaño del campo `BusinessInstructionsReferenceNumberNotes` (empírico) | Plantillas repetidas idénticas: Comissaria Pibernat 3 órdenes con 3027 chars iguales, Caravan 2 órdenes con 1926 chars iguales. Sugiere parseabilidad alta. | Más variable: rango de 44 a 2065 chars en la muestra. |

#### Clientes STO (intercompany Dow → Dow)
- Dow Brasil Ind e Com (Navegantes, Itajaí, Santos, Manaus, Paranaguá, Rio de Janeiro, Extrema)
- Dow Perú
- Petroquímica Chile (Dow)
- Dow Chemical Company (USA — Houston)
- Dow Chemical Pacific (China — Dalian)

#### Clientes Trade (a terceros)
- ~30-40 clientes recurrentes, baja rotación.
- Requieren instrucciones específicas del exportador sobre qué mails enviar y a quién. Las instrucciones llegan dentro del campo `BusinessInstructionsReferenceNumberNotes` del 304.

### 4.4 Modos de transporte (MOT)

Codificado en el 304 como `RouteInformation[].TransportationMethodTypeCode`:

- **`O` (Ocean)**: marítimo containerizado. El grueso del volumen. Puertos argentinos de salida: Bahía Blanca (PTN, directo desde planta) y Buenos Aires (TRP, EXOLGAN — la mercadería llega en tren desde Bahía Blanca vía Abbott en algunos casos).
- **`M` (Motor)**: terrestre. Sale directo de plantas (aduanas domiciliarias). Paso principal: Paso de los Libres hacia Brasil. Secundario: Iguazú. Transportistas habituales: Don Pedro, Petrolera Alvear, Expreso El Aguilucho, Moggia, Siltrans, Loddin, Celsur.

**Validación empírica (11 JSONs)**: 8 marítimos + 3 terrestres.

### 4.5 Tipo de exportación (IntermodalServiceCode)

Codificado en el 304 como `Items[].ContainerDetails.IntermodalServiceCode`:

| Código | Significado |
|---|---|
| `01` | Terrestre (equipo VAEM) |
| `05` | Marítimo contenedor completo 40' (equipo 40CZ) |
| Otros posibles | Bulk, presurizado, aéreo — **no vistos en los 11 JSONs analizados** |

### 4.6 Navieras

- **Log-In**: 60-70% del volumen. Fuerte en Brasil.
- **Maersk**: segundo volumen. Tiene portal web para carga de BL y VGM manual.
- **Hapag-Lloyd**: tercer volumen. Fuerte en APAC y destinos lejanos.
- **Otras**: CMA CGM y otras según licitación.

---

## 5. Sistemas y herramientas actuales

### 5.1 Metric — sistema core de SSB
- Desarrollado por programadores externos. Repo: `git.ssbint.com/ssb_int_git/sosab-api.git`.
- **Recibe el JSON del 304 desde SAP** (el mismo que entra al Importer, en paralelo — Q2 cerrada en research.md sección 4).
- El coordinador carga manualmente: booking, cortes, buque, flete, aduana, transporte.
- Genera el PDF de instrucción de exportación para Interlog.
- Emite eventos 315 a SAP con fechas de tracking.
- **Estados**: New Offer → Accepted → In Transit → Arrive (+ Cancelada).

### 5.2 Importer ("Codego")
- Laravel 8 + PHP. Repo: `git.ssbint.com/ssb_int_git/codego_importer_uat.git`.
- UAT: `https://importer.ssbplatform.com/`. Docs: `/docs` (Scribe).
- **Recibe el JSON del 304** en `POST /api/orders/store` (sin JWT — auth real pendiente Q5).
- Módulo "Logs de JSON" permite descargar todos los JSONs entrantes (usado para obtener los 11 JSONs del research).

### 5.3 Excel Online en OneDrive
- Herramienta operativa diaria. Cada coordinador usa el suyo, pero todos tienen acceso cruzado.
- **Duplicación de trabajo** entre Metric y Excel: principal punto de dolor actual.
- Archivos vivos:
  - `PROGRAMA MARITIMO NW SSB 2026.xlsx`
  - `SEGUIMIENTO MPC - coordinación 2.0.xlsx`
  - `NUEVO SEGUIMIENTO TERRESTRE - 2026.xlsx`
  - `Planilla terrestre RC - 2025.xlsx`
  - `Control de cargas V2 - MPC.xlsx`
  - `FACTURAS PBB V2.xlsx`

### 5.4 Google Drive compartido ("Team Exportación")
- Carpeta maestra con subcarpetas por tipo de documento (BL Draft, BL Final, CRT, Factura, Packing List, Certificado de Origen, Booking Advice, etc.).
- **Naming convention estandarizada**: `[Número de orden]_[Código tipo doc]_[Detalle].[ext]`. Ej: `117602991_FC_0110-00054905.pdf`.
- Buscar por número de orden lista todos los documentos de esa orden de todas las carpetas.

### 5.5 Gmail
- Casilla funcional `expo.rpbb@scbint.com` — todos reciben todo.
- Portales de navieras (Log-In, Maersk, Hapag-Lloyd) están vinculados a esta casilla en la mayoría de los casos.

### 5.6 n8n Cloud
- Hosting en `jzenteno.app.n8n.cloud`.
- **Workflow activo principal**: reconocimiento de documentación por mail → descarga al Drive en la carpeta correspondiente con el naming correcto.
- Otros workflows en desarrollo: BL control, mailing automático.

---

## 6. Documentos clave del ciclo

### 6.1 Booking Advice
- **Origen**: llega del cliente (Dow) por dos vías simultáneas: JSON a Metric y PDF por correo.
- **Contenido**: información de la orden al momento del ofrecimiento. Producto, destino, cliente, incoterm, instrucciones de envío.
- **Automatización**: n8n lo captura del mail y lo guarda en Drive.

### 6.2 Instrucción de Exportación (IE)
- **Origen**: Metric la genera como PDF después de que el coordinador carga info logística.
- **Destino**: Interlog (por mail hoy, por API próximamente).
- **Riesgo crítico**: si el flete cargado está mal, el permiso sale con el dato incorrecto. La corrección tiene costo.

### 6.3 Permiso de Exportación (PE)
- **Origen**: Interlog lo tramita a partir de la IE.
- **Formato del permiso**: ej. `25003EC03002997S`.
- **Importancia**: sin permiso, la orden NO puede despacharse.

### 6.4 Excel de Planta (Informe de Despacho)
- **Origen**: personal de planta lo envía por mail al despachar mercadería.
- **Contenido**: pesada, producto, contenedores, terminal de destino.

### 6.5 Planilla de Aduana
- **Origen**: Interlog la envía por mail al despachar.
- **Contenido**: DDT, PO, buque, destino, terminal, canal, contenedores, precintos, bultos, peso.
- **Uso crítico**: la información se usa para declarar en el BL.

### 6.6 Reporte de Balanza (VGM / BGM)
- Pesadas de contenedores. Se arma tabla dinámica para extraer la última pesada por contenedor.
- Se envía a terminal y naviera (mail o portal según naviera).

### 6.7 Factura de Exportación
- Se emite al día siguiente del despacho.
- n8n la captura del mail y la guarda en Drive.
- Se cruza contra BL y planilla de aduana.

### 6.8 Bill of Lading (BL)
- **BL Draft**: el documental carga la declaración en el portal de la naviera (Log-In, Maersk, Hapag-Lloyd) usando datos de la planilla de aduana. Después descarga el draft.
- **Control del BL (crítico)**: cruce manual contra factura, planilla, otros documentos. Campos a verificar: consignatario, producto, peso, contenedor, permiso, precinto. Hoy 100% manual.
- **BL Final**: una vez aprobado, se descarga del portal.
- **Plazo**: cada naviera tiene límite horario distinto para correcciones.

### 6.9 CRT (Carta de Porte Internacional por Carretera)
- Equivalente terrestre del BL.
- Origen: el ATA (Agente de Transporte Aduanero) lo envía por correo.
- PDF digital o escaneado — el OCR para escaneados es pendiente.

### 6.10 Certificado de Origen (COO)
- Se tramita en la Cámara Argentina de Comercio.
- Aplica al ~95% de las exportaciones (producto argentino).
- **Modalidades**: digital (la mayoría) y **físico** (con firma y sello reales). El COO físico es el único documento que viaja por courier/correo al cliente; el resto de la documentación es 100% electrónico. Ver sección 7bis.

### 6.11 Packing List
- Variantes marítimo y terrestre.
- n8n lo captura del mail y lo guarda en Drive.

---

## 7. Flujo operativo completo (as-is)

### Fase 1 — Oferta y aceptación
1. SAP Dow emite el 304 → llega a Metric (JSON) y al Importer (JSON, endpoint `/api/orders/store`).
2. En paralelo, llega el Booking Advice como PDF por correo.
3. n8n captura el Booking Advice y lo guarda en Drive.
4. El coordinador carga la orden en su Excel de seguimiento (manual).
5. Estado en Metric: **New Offer → Accepted**.

### Fase 2 — Coordinación e instrucción
6. Coordinador carga en Metric: booking, cortes, buque, flete, aduana, transporte.
7. Metric genera PDF de Instrucción de Exportación.
8. Coordinador lo envía a Interlog por mail.
9. Interlog tramita el permiso de exportación.
10. Interlog envía los permisos por mail al final del día.

### Fase 3 — Despacho
11. Con permiso OK, planta consolida contenedor, precinta y despacha (aduana domiciliaria).
12. Planta envía Excel de despacho + reporte de balanza por mail.
13. Interlog envía planilla de aduana por mail.
14. n8n captura planilla y factura.
15. Estado en Metric: **Accepted → In Transit**.

### Fase 4 — Post-despacho documental
16. Factura de exportación (día siguiente). n8n la captura.
17. VGM: tabla dinámica de última pesada por contenedor → envío a terminal y naviera.
18. Declaración de embarque: documental carga en portal de naviera usando planilla.
19. Descarga BL Draft → control manual contra factura/planilla/otros → correcciones en portal → BL Final.
20. Certificado de origen: se tramita en Cámara Argentina de Comercio → PDF al Drive.

### Fase 5 — Envío al cliente y tracking
21. Documental arma el mail con BL + factura + packing list + COO + CRT según aplique.
22. Envío manual al cliente según instrucciones (ver sección 7bis).
23. Metric emite eventos 315 a SAP: Sailing Date, Confirmed on Board, Customs Cleared, BL Received, Vessel Arrival, etc.

---

## 7bis. Reglas operativas del mailing al cliente

Sección crítica. El mailing al cliente es uno de los puntos de dolor principales (P3 en sección 10) y su automatización es el objetivo de mayor valor del dashboard post-MVP.

### 7bis.1 Modalidad de envío

| Modalidad | Cuándo aplica | Materialización |
|---|---|---|
| **Electrónico** | Default — ~95%+ de las órdenes | Mail con documentación adjunta (BL, factura, packing list, COO digital, CRT cuando aplique). |
| **Físico** | Solo órdenes con **COO físico** requerido | Además del envío electrónico, courier/correo postal con el COO con firma y sello reales de la Cámara Argentina de Comercio. Algunos países/clientes lo exigen por regulación aduanera local. |

**Implicancia para el dashboard**: necesita un flag `requiere_envio_fisico` derivado por orden. La regla precisa de cuándo aplica el físico queda como pregunta abierta para el equipo documental (ver Q28 en `preguntas.md`).

### 7bis.2 Origen del destinatario

La lista de destinatarios de cada orden se compone de **dos fuentes complementarias del 304**:

| Fuente | Qué aporta | Fiabilidad |
|---|---|---|
| **Campo `BusinessInstructionsReferenceNumberNotes`** (texto libre del exportador) | Indica **qué documentación** mandar y **a quién**, con instrucciones específicas por orden. Parte estructurada con marcadores `#12A#`, `#13A#`, `#15B#` y parte texto libre. Ver sección 8. | Alta para Trade (instrucciones explícitas). Requiere parseo con IA en fase 2-3. |
| **Entidad `N1` (Notify Party)** | Mail de contacto del notify. **Presente en los 11 JSONs analizados (100%)**. | Alta como fallback universal. Validado empíricamente. |

**Regla práctica a implementar**:

1. Parsear el campo de instrucciones con IA → obtener lista principal de destinatarios y reglas específicas.
2. Si el parseo falla o no hay destinatarios claros → usar el mail de la entidad `N1` del 304 como fallback.
3. Aplicar overrides del cliente (ver 7bis.4).
4. Cuando Brian/SSB inicie el flujo, loguear qué fuente se usó (IA / N1 / override) para trazabilidad.

### 7bis.3 Diferencia operativa STO vs Trade

Implicancia directa para automatización:

- **STO (prefijo `4010...`)**: el destinatario es casi siempre un **despachante/forwarder intermediario conocido** del lado destino (Comissaria Pibernat en Brasil, BDP International en Chile, etc.). El mailing es **automatizable sin IA** con una tabla maestra `cliente_sto → despachante_destino`. Ver Q29 en `preguntas.md` (pendiente confirmar si esa tabla existe hoy en SSB).
- **Trade (prefijo `0118...`)**: el destinatario suele ser el **cliente directo** o un intermediario variable. Requiere parseo del campo de instrucciones (IA) o uso del fallback N1.

### 7bis.4 Overrides por cliente — requerimiento del dashboard

**Capacidad que el dashboard debe tener en la web** (no resuelve por sí solo el 304 — es decisión manual del equipo documental):

1. **Agregar destinatarios** a la lista derivada del 304 a nivel cliente. Caso típico: un cliente pide incluir backup, persona nueva del equipo, gerente en copia.
2. **Excluir destinatarios** de la lista derivada del 304 a nivel cliente o a nivel orden puntual. Caso típico: mail de persona que dejó la empresa, mail equivocado, contacto que pidió baja.

**Principios**:

- **Persistencia por cliente**: los overrides se configuran una vez, no en cada orden.
- **Excepciones a nivel orden**: posibilidad de override puntual solo para una orden específica (sin afectar la regla del cliente).
- **Audit trail obligatorio**: quién agregó/quitó, cuándo, por qué pedido. Sin trazabilidad no se puede responder "¿por qué sigue llegando a X?" o "¿quién sacó a Y?".
- **Reversible**: baja un override no implica borrar historial.

**Cuándo se implementa**: fuera del MVP. Módulo de mailing completo = fase 2/3 del proyecto.

---

## 8. El campo más crítico del 304 — `BusinessInstructionsReferenceNumberNotes`

Merece sección propia por su valor operativo.

**Qué es**: campo string dentro del JSON del 304 con **instrucciones del exportador (Dow) al forwarder (SSB)**. Texto libre, entre 44 y 3027 caracteres según la orden.

**Qué contiene**:
- Qué documentación enviar y a qué direcciones de mail (define el mailing).
- Qué datos debe tener el BL (consignee, notify, NCM, CNPJ, freight prepaid/collect).
- Requisitos regulatorios por país (ISPM 15 para pallets de madera a Brasil, CNPJ en BL, etc.).
- Casos especiales (direct collect al banco del importador, freight collect, etc.).

**Estructura interna (semi-estructurada)**:
- Marcadores tipo `#12A#`, `#13A#`, `#15B#` que codifican tipo de instrucción.
- Caracteres especiales escapados con `#` (reemplaza `ñ`, `ç`, `%`, `&`).
- Hay dos variantes: estructurada con marcadores y texto libre sin marcadores.

**Por qué es crítico operativamente**:
- Hoy el equipo documental lo lee manualmente en cada orden.
- Es vinculante: si no se cumple, puede haber errores costosos.
- En caso de conflicto o error, se revisa con el exportador.

**Dónde vive en el dashboard (futuro)**: candidato #1 para asistencia con IA en fase 2/3. Permitiría auto-armar el mailing, flagear requisitos especiales antes del BL, detectar casos especiales.

**En el schema**: se persiste el texto completo crudo, sin transformar, hasta que exista un modelo de parseo validado.

**Validación empírica del tamaño (11 JSONs del 22/04)**:

| Rango de caracteres | Cantidad de JSONs | Observación |
|---|---|---|
| < 100 | 2 | Rio Chico (78), BDP South America (44) |
| 500 - 1000 | 3 | Tecnología de Materiales (553), Cryovac (837), BDP Chile (873) |
| 1500 - 2100 | 3 | Caravan do Brasil (1926) x2, Chiacchio (2065) |
| 3000+ | 3 | Comissaria Pibernat (3027) x3 |

Las 3 órdenes de Pibernat (3027 idéntico) y las 2 de Caravan (1926 idéntico) sugieren **plantillas repetidas** — buena noticia para el parseo IA, patrón estable.

---

## 9. Identificadores operativos (nomenclatura de campos)

Referencia rápida de números que aparecen en la operativa. Esta sección es el **Ubiquitous Language** (lenguaje ubicuo) del proyecto — los nombres que se usan acá son los nombres que se deben usar en Supabase, código, prompts y conversaciones.

### 9.1 Identificadores de orden

| Concepto | Dónde aparece en 304 | Formato | Ejemplo |
|---|---|---|---|
| **PO / Purchase Order** | Qualifier `PO` en `ReferenceIdentificationGeneral` | String numérico | `0118705352`, `4010470219` |
| **ShipmentID** | `ShipmnetIdentificationNumber` (con typo) | String numérico | `0048062233` |
| **Contract** | Qualifier `CO` (solo algunas órdenes) | String libre | `37111`, `PD2026/102097`, `230N_04_2026_138` |
| **Delivery / DN** | Sub-qualifier `DELIVERY` en Items | String numérico 10 dígitos | `0831636939` |
| **File SSB** | Número interno SSB | Numérico | `37693`, `38081` |
| **Booking** | Asignado por naviera post-coordinación | Alfanumérico | `LA0434884`, `257215188` |
| **Permiso (PE)** | Asignado por Interlog | Alfanumérico | `26003EC01001808H` |
| **BL** | Asignado por naviera | Alfanumérico | `BHI099351RCN`, `068N902808414` |
| **Invoice** | Número de factura de exportación | Formato con guion | `0110-00054905` |
| **COO** | Número certificado de origen | `AR004...` | `AR004A18250003162300` |

**Nota importante sobre leading zeros del PO**:

SAP persiste los PO como **CHAR(10) con ceros a izquierda** (alineación a derecha con relleno). Es convención interna SAP, no dato operativo.

- En el JSON del 304 llega siempre con 10 dígitos: `0118705352`.
- El equipo operativo lo busca, escribe y menciona **sin el cero inicial**: `118705352`.
- En STO el primer dígito es `4`, así que no hay ceros a quitar: `4010470219` queda igual.

**Regla para el dashboard**:
- **Persistir crudo** tal cual llega (10 chars, cumple criterio no-negociable #5 de `plan.md` sobre preservar el input).
- **Mostrar al usuario** sin el cero a la izquierda.
- La conversión es trivial: `TRIM(LEADING '0' FROM po)` en SQL o `parseInt` en JavaScript.
- Este tratamiento es un ejemplo concreto de **Anti-Corruption Layer (ACL)**: la convención de SAP no debe contaminar la UI ni el resto del modelo interno.

### 9.2 Identificadores de producto

| Concepto | Dónde aparece | Significado |
|---|---|---|
| **GMID** | `Items[].CommodityCode` (18 dígitos con leading zeros) | Global Material Identifier de Dow. Los últimos 6 dígitos son el *significant number* en SAP. **NO es HS/NCM.** |
| **Material / Lading Description** | `Items[].LadingDescription` | Nombre comercial Dow (ej. `"DOWLEX(tm) TG 2085B Polyethylene Resin"`) |
| **NCM / PA** | **No viene en el 304** | Posición Arancelaria Mercosur. Se obtiene de otra fuente (SAP Dow interno o tabla maestra SSB). Ej: `39014000000K` |

### 9.3 Identificadores logísticos

| Concepto | Dónde aparece | Ejemplo |
|---|---|---|
| **MOT** (Mode of Transport) | `RouteInformation[].TransportationMethodTypeCode` | `O` (Ocean), `M` (Motor) |
| **Incoterm** | `TransportationTermsCode` | `CPT`, `CFR`, `FCA` |
| **Service Type** | `TariffServiceCode` | `DD` (Door-to-Door), `DP` (Door-to-Port) |
| **Shipping Point / SH Point** | Qualifier `SF` en refs generales | `D146`, `D116`, `D147`, `D176` |
| **Transportation Planning Point** | Qualifier `PE` en refs generales | `P703`, `P706`, `P749` |
| **DeliveryLocation (lugar Incoterm)** | `DeliveryLocation` (texto libre) | `"SALVADOR PORT"`, `"NAVEGANTES PORT"`, `"BAHIA BLANCA"`, `"MAIPU"` — **ver nota crítica abajo** |
| **Destino físico final** | Entidad `ST` (Ship To) → `CityName` + `CountryCode` | `EXTREMA / BR`, `LONDRINA / BR`, `RIO GRANDE / AR` |
| **Container Type** | `Items[].ContainerDetails.EquipmentType` | `40CZ` (marítimo 40'), `VAEM` (terrestre/van) |
| **Fecha planificada de despacho** | Sub-qualifier `PGIDATE` en items | YYYYMMDD, ej `20260425` |
| **Fecha solicitada de despacho** | Qualifier `RSD` en `DateTimeReference` | YYYYMMDD |
| **Fecha entrega requerida** | Qualifier `002` en `DateTimeReference` | YYYYMMDD |

**Nota crítica sobre destino** (corrección importante del 22/04):

`DeliveryLocation` **no es el destino físico final de la mercadería**. Es el lugar asociado al Incoterm declarado:

- En Incoterms **CPT / CFR** (Carriage Paid To / Cost and Freight): `DeliveryLocation` es el **puerto de descarga**. Ej: Santos Port, Navegantes Port. Pero la mercadería continúa después por camión interior hasta el cliente (ej: Santos Port → Extrema, 400 km tierra adentro).
- En Incoterms **FCA / FOB** (Free Carrier / Free On Board): `DeliveryLocation` es el **punto de entrega en origen**. Ej: Bahía Blanca, Abbott Whse. La mercadería va físicamente a otro destino (ej: Abbott Whse → Rio Grande, Tierra del Fuego).

Para obtener el **destino físico final** (lo que el documental necesita para el mailing) hay que mirar la entidad `ST` (Ship To) del JSON, no `DeliveryLocation`. Implicancia para el schema: el dashboard necesita **dos campos distintos**, destino logístico Incoterm + destino físico final. Si mostrara solo uno, rompe la operativa.

### 9.4 Actores del embarque (Entities del 304)

| Code | Rol | Quién típicamente |
|---|---|---|
| `EX` | Exportador | Siempre PBB Polisur S.R.L. (A136) |
| `ST` | Ship To (destinatario físico) | Cliente final |
| `N1` | Notify Party | Despachante o cliente lado importador |
| `BT` | Bill To (facturar a) | Generalmente = ST |
| `NP` | Notify secundario | Banco, agente, partner |
| `CN` | Consignee del BL | Consignatario formal (solo en algunos JSONs) |
| `DIR` | Distribution Recipient | Destinatario de distribución posterior |
| `PK`, `PK2`, `PK3` | Packer (principal y secundarios) | Partner que empaca |
| `16` | Plant | Punto de despacho físico |
| `AO` | Account Of | En estos JSONs: puerto de destino |

---

## 10. Puntos de dolor y oportunidades (priorizados)

### P1 (crítico) — Acceso a información para declaración del BL
Los documentales cruzan 3 fuentes (planilla de aduana, factura, booking) para cargar la declaración en portales de navieras. Hoy es manual. El Validador Aduanal ya resuelve parte (parseo de planillas); integrarlo al dashboard cierra el círculo.

### P2 (crítico) — Control del BL
Cruce manual de BL draft contra factura, planilla y otros documentos. Errores recurrentes: tipeo, producto desactualizado, permiso mal escrito, peso incorrecto. **Oportunidad**: automatizar cruce con IA (fase 2-3 del dashboard).

### P3 (crítico) — Mailing de documentación
100% manual. Documental busca docs en Drive, arma mail, adjunta, envía. Puede haber 2-3 envíos por orden. Sin seguimiento, sin alertas de arribo al cliente. **Oportunidad**: pre-armar mail con estructura fija + adjuntos correctos + destinatarios derivados del 304 (`BusinessInstructions...` + `N1`) + overrides configurables por cliente. Ver sección 7bis.

### P4 — Duplicación Metric / Excel
Toda coordinación se carga dos veces: Metric (cara al cliente SAP) + Excel (herramienta interna). Reducir la duplicación es objetivo largo plazo.

### P5 — Deadlines y alertas
Cortes documentales, VGM, plazos de corrección de BL por naviera — hoy monitoreados por una persona mirando el programa marítimo. **Oportunidad**: alertas proactivas en el dashboard.

### P6 — CRT escaneados
OCR pendiente en n8n para completar archivado automático de CRT (los digitales ya funcionan).

---

## 11. Integraciones existentes y futuras

### Existentes
| Integración | Tipo | Estado |
|---|---|---|
| SAP Dow → Metric | JSON (oferta de orden, 304) | Funcionando |
| SAP Dow → Importer | JSON (misma oferta, endpoint `orders/store`) | Funcionando |
| Metric → SAP | API (eventos 315) | Funcionando |
| Gmail → Drive (n8n) | Automatizado (Booking, PL, FC) | Funcionando |
| Metric → PDF (Instrucción) | Generación interna | Funcionando |

### En desarrollo
| Integración | Tipo | Estado |
|---|---|---|
| Metric → Interlog | API JSON (instrucciones) | En desarrollo (programadores externos) |

### Del dashboard nuevo (SSB-IT-RESEARCH)
| Integración | Tipo | Fase |
|---|---|---|
| Dashboard ← 304 (Importer, webhook) | Webhook HTTP POST desde Importer Laravel al endpoint Supabase | Endpoint desplegado 22/04, esperando que Brian implemente outbound call |
| Dashboard → Supabase | Persistencia | Walking Skeleton desplegado (tabla `inbound_events` con 11 filas reales al 22/04 tarde) |
| Dashboard ↔ n8n | Orquestación de workflows | Pendiente |
| Dashboard ↔ Claude API | Control BL + parseo instrucciones | Fase 2-3 |

---

## 12. Glosario (términos operativos + técnicos)

### Términos del negocio (comex)
| Término | Significado |
|---|---|
| **ATA** | Agente de Transporte Aduanero (terrestre) |
| **BGM** | Bill of Lading marítimo — se usa como sinónimo interno de peso verificado (balanza). Ver VGM. |
| **BL** | Bill of Lading, conocimiento de embarque marítimo |
| **BL Draft / BL Final** | Borrador del BL para revisión / versión final aprobada |
| **Booking** | Reserva de espacio en buque |
| **Booking Advice** | Documento con info de la orden al momento del ofrecimiento |
| **COO / COD** | Certificate of Origin / Certificado de Origen |
| **CRT** | Carta de Porte Internacional por Carretera (equivalente terrestre del BL) |
| **Cut Off** | Fecha límite de ingreso de contenedores a terminal |
| **Cut Off Doc** | Fecha límite de presentación de documentación |
| **DC** | Delivery Confirmation |
| **DDT** | Documento de Transporte (en planilla de aduana) |
| **DJO** | Declaración Jurada de Origen |
| **DN** | Delivery Number |
| **EGI** | Envío de instrucción (terrestre) |
| **ETA** | Estimated Time of Arrival |
| **ETD** | Estimated Time of Departure |
| **Freight prepaid / collect** | Flete pagado en origen / a cobrar en destino |
| **ISPM 15** | Norma internacional de tratamiento fitosanitario para embalajes de madera |
| **IE** | Instrucción de Exportación |
| **MOT** | Mode of Transport |
| **MPC** | Siglas internas SSB — marítimo ? (a clarificar si surge ambigüedad) |
| **NCM / PA** | Nomenclatura Común del Mercosur / Posición Arancelaria |
| **NW** | Fecha de New (ofrecimiento) |
| **PE** | Permiso de Exportación |
| **PO** | Purchase Order |
| **POD** | Port of Discharge (puerto de destino) |
| **POL** | Port of Loading (puerto de origen) |
| **PTN** | Puerto Nuevo (Bahía Blanca) |
| **SHP** | Shipment Number |
| **SITA** | Solicitud de anulación de permiso |
| **STO** | Stock Transfer Order (intercompany Dow) |
| **TRP** | Terminal Río de la Plata (Buenos Aires) |
| **VGM** | Verified Gross Mass — peso verificado del contenedor (internamente lo llaman BGM) |
| **315** | Evento de tracking en SAP |

### Términos técnicos del 304 / EDI
| Término | Significado |
|---|---|
| **304** | Transaction Set de EDI X12 — "Shipping Instructions". El JSON que Dow manda a SSB |
| **301** | Transaction Set X12 — "Confirmation". Lo emite Metric hacia SAP |
| **EDI X12** | Electronic Data Interchange formato ANSI X12. Estándar US de mensajería B2B |
| **EntityIdentifier** | Código de rol de un actor del embarque (EX, ST, N1, etc.) |
| **GMID** | Global Material Identifier de Dow. Código interno de producto. NO es NCM |
| **IDOC SHPMNT** | Tipo de documento SAP (SHPMNT03/05/06). Se serializa a X12 o JSON antes de enviar |
| **Qualifier** | En EDI, muchos elementos son pares *qualifier + value*. El qualifier define qué tipo de dato es el value |
| **ReferenceIdentificationQualifier** | Código que identifica qué tipo de referencia sigue (PO, CO, SF, etc.) |
| **SCAC** | Standard Carrier Alpha Code. Asignado por NMFTA (USA). En los 304 aparece `SSB` — pendiente confirmar si es oficial o bilateral |
| **UN/LOCODE** | Código UN de 5 caracteres para puertos (ej. `BRSSZ` = Santos) |

### Entidades técnicas del proyecto
| Término | Significado |
|---|---|
| **Codego** | Nombre interno del Importer (producto Laravel) |
| **Kipin** | Posible desarrollador/herramienta original del Importer. A confirmar (Q6) |
| **Logs de JSON** | Módulo del Importer que audita todos los JSONs entrantes. Fuente de los 11 JSONs del 304 analizados |
| **Metric** | Sistema core de SSB. Repo `sosab-api` |
| **SIMI** | Sistema de Importaciones de la República Argentina (relevante para el módulo de despachos del Importer, no para exportación) |

---

## 13. Principios operativos que guían el dashboard

1. **Automatizar sin reemplazar decisiones humanas.** El documental sigue aprobando el BL, el dashboard asiste.
2. **El 304 es la fuente única de verdad del ofrecimiento.** Se persiste crudo antes de procesarse.
3. **Idempotencia absoluta.** Mismo 304 reenviado no duplica efectos.
4. **Trazabilidad completa.** Logging de entradas, salidas, estados, timestamps.
5. **Sin acoplamiento a lógica interna de Metric/Importer.** Solo APIs estables y contratos públicos.
6. **Validar con Brian/Santiago antes de apoyarse en código legacy.**

---

## 14. Proyectos adyacentes (referencia rápida)

Estos proyectos existen en paralelo. **No se arrastran por defecto al diseño del dashboard**. Se integran o aportan conceptos solo cuando corresponda.

- **Validador Aduanal** (`validador-aduanal`): web app en Netlify + Supabase. Parsea planillas de aduana. Puede integrarse al dashboard para el módulo de declaración de BL (P1).
- **Tarifa Schedule** (`tarifa-schedule`): HTML con tarifas y schedule de servicios marítimos. En pausa.
- **Inbox Triage** (`ssb-inbox-triage`): asistente inteligente de correo con clasificación IA. En desarrollo activo. Puede aportar patrones de clasificación para el mailing automático al cliente (P3).

---

*Última actualización: 22/04/2026 (cierre tarde). Se actualiza cuando aparece un concepto nuevo del dominio o cambia la operativa.*
