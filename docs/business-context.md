# business-context.md — SSB International × PBB Polisur (Dow)

**Proyecto**: SSB-IT-RESEARCH
**Propósito**: documento de contexto operativo y glosario del negocio. Fuente única para que cualquier decisión técnica (schema, arquitectura, prompts, workflows) esté anclada en la operativa real de SSB.
**Autor**: Jona Zenteno (contenido), consolidación con Claude.
**Versión**: 3 — 24/04/2026
**Mantenimiento**: se actualiza cuando aparece un concepto nuevo del dominio o cambia la operativa. No se edita sin consulta a Jona.

**Cambios v2 → v3 (24/04)**: agregado al glosario DCSA, DCSA Bill of Lading 3.0, DCSA Booking 2.0, Shipping Instruction (SI), Draft BL / Verify Copy, Customer Code, eaSI, Log-Aí. Aclarado INTTRA como plan B (no plan A). Nota sobre pendiente Log-In.

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
- **Integración futura**: API en testeo final (a confirmar fecha de producción). Hasta entonces, plan B: mail con instrucción de exportación.

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

Dow emite dos tipos de orden con prefijos distintos en el PO, visibles en los 304. **Confirmado operativamente por Jona (22/04)**:

| Prefijo PO | Tipo | Características en el 304 |
|---|---|---|
| `0118...` | **Trade** (venta a cliente externo) | Trae qualifiers adicionales: `1V`, `CO`, `AEG` (AES - Ultimate Consignee Type, regulación US) |
| `4010...` | **STO** (Stock Transfer Order, intercompany Dow → Dow) | Trae solo qualifiers mínimos: `19`, `11`, `PE`, `SF`, `PO` |

El prefijo es estable: todas las trade arrancan con `0118`, todas las STO con `4010`.

**Diferencia operativa clave para el dashboard**:

| Aspecto | STO (`4010...`) | Trade (`0118...`) |
|---|---|---|
| Destinatario de la documentación | **Siempre el mismo forwarder** del lado del destino (típicamente Brasil). Predecible con tabla maestra. | Variable orden a orden. Se extrae del TXT 107 del 304. |
| Destinos | Recurrentes y acotados (Santos, Navegantes, Rio de Janeiro, Paranaguá, Itajaí, etc.). | Dispersos: ~30-40 clientes distintos con baja rotación. |
| Estandarización del flujo | Alta. | Media — requiere leer instrucciones específicas del exportador en cada orden. |
| Regulación US (AES) | No aplica (es intercompañía). | Aplica. `AEG` lleva el tipo de consignee final. |
| Candidato a automatización | **Tabla maestra**: cliente STO → forwarder destino. Q29 abierta. | **Parseo IA del TXT 107** (G6 del MVP). |

#### Clientes STO (intercompany Dow → Dow)
- Dow Brasil Ind e Com (Navegantes, Itajaí, Santos, Manaus, Paranaguá, Rio de Janeiro, Extrema)
- Dow Perú
- Petroquímica Chile (Dow)
- Dow Chemical Company (USA — Houston)
- Dow Chemical Pacific (China — Dalian)

#### Clientes Trade (a terceros)
- ~30-40 clientes recurrentes, baja rotación.
- Requieren instrucciones específicas del exportador sobre qué mails enviar y a quién. Las instrucciones llegan dentro del TXT 107 del 304.

### 4.4 Modos de transporte (MOT)

Codificado en el 304 como `RouteInformation[].TransportationMethodTypeCode`:

- **`O` (Ocean)**: marítimo containerizado. El grueso del volumen. Puertos argentinos de salida: Bahía Blanca (PTN, directo desde planta) y Buenos Aires (TRP, EXOLGAN — la mercadería llega en tren desde Bahía Blanca vía Abbott en algunos casos).
- **`M` (Motor)**: terrestre. Sale directo de plantas (aduanas domiciliarias). Paso principal: Paso de los Libres hacia Brasil. Secundario: Iguazú. Transportistas habituales: Don Pedro, Petrolera Alvear, Expreso El Aguilucho, Moggia, Siltrans, Loddin, Celsur.
- **`A` (Aéreo)**: 2-3 operaciones al año. **Fuera del alcance del MVP** — Jona lo confirma el 24/04.

### 4.5 Tipo de exportación (IntermodalServiceCode)

Codificado en el 304 como `Items[].ContainerDetails.IntermodalServiceCode`:

| Código | Significado |
|---|---|
| `01` | Terrestre (equipo VAEM) |
| `05` | Marítimo contenedor completo 40' (equipo 40CZ) |
| Otros posibles | Bulk, presurizado, aéreo — **no vistos en los 11 JSONs analizados** |

### 4.6 Navieras

- **Log-In**: 60-70% del volumen. Fuerte en Brasil. **Plataforma digital**: Log-Aí (portal web con login/password). **No tiene developer portal ni API pública conocida**. Respuesta oficial a consulta formal pendiente (mail enviado 24/04). Ver Q34, `research-apis-carriers.md` sección 4.
- **Maersk**: segundo volumen. **Tiene Developer Portal API productivo** (OAuth 2.0 + DCSA Bill of Lading 3.0). El mail del 24/04 confirmó que existe "algo desarrollado", pendiente respuesta del área técnica. Cuello de botella para usar las APIs: Customer Code vinculado a cuenta A136. Ver Q37, `research-apis-carriers.md` sección 2.
- **Hapag-Lloyd**: tercer volumen (bajo). **Developer Portal con APIs de T&T y Schedules, pero submit de SI no publicado**. Vía oficial productiva: eaSI (PDF/web) o INTTRA bilateral. Dado el bajo volumen, SSB prioriza modo asistido; INTTRA queda como plan B. Ver `research-apis-carriers.md` sección 3.
- **Otras**: CMA CGM y otras según licitación.

#### 4.6.1 Estrategia de integración (24/04)

Del research completo en `research-apis-carriers.md` surgen 5 decisiones de diseño que quedan **enumeradas y pendientes de tomar**. Una de ellas es la arquitectura de adapters por carrier: cada naviera se trata como caja negra que implementa `submitSI()` + `onDraftBLReady()`, con implementación interna distinta:

- **Maersk** → API nativa (OAuth 2.0 + REST DCSA).
- **Hapag-Lloyd** → modo asistido en R1 (dashboard muestra package pre-llenado, documental copy-paste). INTTRA como plan B futuro si sube volumen.
- **Log-In** → depende de respuesta Log-In. Si ofrecen API/EDI/SFTP se integra; si no, modo asistido con eventual RPA sobre Log-Aí.

VGM: ninguna naviera tiene API pública para VGM conocida al 24/04. Sigue como envío por Excel + mail (R3 del MVP). Ver Q31.

---

## 5. Sistemas y herramientas actuales

### 5.1 Metric — sistema core de SSB
- Desarrollado por programadores externos. Repo: `git.ssbint.com/ssb_int_git/sosab-api.git`.
- **Recibe el JSON del 304 desde SAP** (el mismo que entra al Importer, retransmitido o en paralelo — Q2 cerrada: en paralelo).
- El coordinador carga manualmente: booking, cortes, buque, flete, aduana, transporte.
- Genera el PDF de instrucción de exportación para Interlog.
- Emite eventos 315 a SAP con fechas de tracking.
- **Estados**: New Offer → Accepted → In Transit → Arrive (+ Cancelada).
- **Bot interno**: los coordinadores disparan un bot de Metric que sube documentos desde Drive a Metric. Este bot **no se toca** (NG15 del dashboard). El dashboard lee los Drives en paralelo.

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
- **Flujo de control en el dashboard**: el dashboard extrae el permiso de la planilla de aduana y lo cruza contra el **reporte de permisos descargado periódicamente de Interlog** (método actual del equipo). Detecta errores de tipeo en la planilla.

### 6.4 Excel de Planta (Informe de Despacho)
- **Origen**: personal de planta lo envía por mail al despachar mercadería.
- **Contenido**: pesada, producto, contenedores, terminal de destino.

### 6.5 Planilla de Aduana
- **Origen**: Interlog la envía por mail al despachar.
- **Contenido**: DDT, PO, buque, destino, terminal, canal, contenedores, precintos, bultos, peso, **permiso de exportación**.
- **Uso crítico**: la información se usa para declarar en el BL. Es el input principal de R1 del MVP.
- **Errores recurrentes**: al ser un Excel manual, puede haber errores en permiso, contenedor, precinto. El dashboard cruza contra fuentes adicionales (304, factura, reporte Interlog) para detectarlos.

### 6.6 Reporte de Balanza (VGM — Verified Gross Mass)
- **Origen**: balanza de planta en Bahía Blanca. Una persona baja un reporte consolidado de todas las pesadas del período.
- **Canal**: llega por mail al equipo SSB.
- **Limitación operativa**: a veces no está disponible el viernes; se solicita el lunes.
- **Proceso actual**: se hace una limpieza del reporte y se toma la última pesada por contenedor, con un control manual de que sea la correcta.
- **Envío a navieras**: a **Log-In y Maersk** se envía un Excel con formato establecido (reserva, contenedor, pesada) por correo electrónico. No hay API disponible al 24/04.
- **Nota de terminología**: internamente a veces se dice "BGM" o se escucha como "BGM" en transcripciones, pero el nombre correcto es **VGM** (Verified Gross Mass — peso bruto verificado, definición IMO SOLAS). BGM no es un estándar internacional; usamos **VGM** en toda la documentación técnica.

### 6.7 Factura de Exportación
- Se emite al día siguiente del despacho.
- n8n la captura del mail y la guarda en Drive.
- Se cruza contra BL y planilla de aduana.

### 6.8 Bill of Lading (BL)

- **Shipping Instruction (SI) / "Declaración de embarque"**: el input que SSB envía al carrier para que emita el BL. Internamente en SSB se llama "declaración de embarque". En la industria / especificaciones DCSA se llama **Shipping Instruction**. Son sinónimos. Hoy el documental la carga manualmente en el portal de la naviera usando datos de la planilla de aduana. R1 del MVP automatiza la generación del package y, donde hay API disponible (Maersk), el envío directo.
- **BL Draft / Verify Copy**: el borrador del BL que emite el carrier después de recibir la SI. En Maersk el término oficial es *Verify Copy*; en Hapag *Draft BL*; en Log-In se llama *BL Draft*. Son equivalentes.
- **Control del BL (crítico)**: cruce manual contra factura, planilla, otros documentos. Campos a verificar: consignatario, producto, peso, contenedor, permiso, precinto. Hoy 100% manual. **Automatizado en R1 del MVP**: determinístico + IA.
- **BL Final**: una vez aprobado, se descarga del portal (Maersk discontinuó pedidos por mail desde sept-2025).
- **Plazo**: cada naviera tiene límite horario distinto para correcciones.

### 6.9 CRT (Carta de Porte Internacional por Carretera)
- Equivalente terrestre del BL.
- Origen: el ATA (Agente de Transporte Aduanero) lo envía por correo.
- PDF digital o escaneado — el OCR para escaneados es pendiente.

### 6.10 Certificado de Origen (COO)
- Se tramita en la Cámara Argentina de Comercio.
- Aplica al ~95% de las exportaciones (producto argentino).
- **COO digital** (~95% casos): Cámara entrega un ZIP con XML (certificado digital válido) + PDF (informativo). El documental descarga, descomprime, arma el envío al cliente con XML re-comprimido + PDF. **Automatizado en R2 del MVP (G9)**.
- **COO físico** (casos residuales, Q28 abierta): requiere firma física de la Cámara. Se envía por courier. El dashboard solo lo marca como físico y gestiona la parte escaneada del flujo documental.

### 6.11 Packing List
- Variantes marítimo y terrestre.
- n8n lo captura del mail y lo guarda en Drive.

### 6.12 Certificado de Seguro
- Aplica solo a órdenes **CIF** (Cost Insurance Freight — Incoterm donde el exportador paga seguro hasta destino).
- Lo emite la compañía aseguradora y se recibe por correo.
- El operador lo guarda en Drive; el dashboard lo adjunta al mail cuando la orden lo requiere. **Parte de R2 del MVP (G11)**.

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
8. Coordinador lo envía a Interlog por mail (o por API cuando esté productiva).
9. Interlog tramita el permiso de exportación.
10. Interlog envía los permisos por mail al final del día.

### Fase 3 — Despacho
11. Con permiso OK, planta consolida contenedor, precinta y despacha (aduana domiciliaria).
12. Planta envía Excel de despacho + reporte de balanza (VGM) por mail.
13. Interlog envía planilla de aduana por mail.
14. n8n captura planilla y factura.
15. Estado en Metric: **Accepted → In Transit**.

### Fase 4 — Post-despacho documental
16. Factura de exportación (día siguiente). n8n la captura.
17. VGM: limpieza del reporte + selección de última pesada por contenedor → envío a terminal y naviera por Excel + mail.
18. Shipping Instruction / Declaración de embarque: documental la carga en portal de naviera usando planilla de aduana + factura + VGM. **R1 automatiza este paso** (modo asistido para carriers sin API, end-to-end para Maersk).
19. Descarga BL Draft / Verify Copy → control manual contra factura/planilla/otros → correcciones en portal → BL Final. **R1 automatiza el control del BL** (determinístico + IA).
20. Certificado de origen: se tramita en Cámara Argentina de Comercio → ZIP con XML + PDF → descompresión → Drive.

### Fase 5 — Envío al cliente y tracking
21. Documental arma el mail con BL + factura + packing list + COO + CRT + certificado de seguro CIF según aplique.
22. Envío manual al cliente según instrucciones del TXT 107 del 304.
23. Metric emite eventos 315 a SAP: Sailing Date, Confirmed on Board, Customs Cleared, BL Received, Vessel Arrival, etc.

### 7bis Estado operativo consolidado para el dashboard (23/04)

A partir del cierre de Goals/Non-goals del MVP (23/04), el dashboard representa los 5 fases as-is con **4 estados primarios** más checkpoints paralelos. Esto refleja mejor cómo piensa el operador:

| Estado dashboard | Equivalente Metric / fase as-is | Comentario |
|---|---|---|
| **New Offer** | Metric "New Offer" / fase 1 | 304 recibido. |
| **Aceptado y Documentado** | Metric "Accepted" / fases 2-4 | Consolidación: instrucción enviada, planilla cargada, BL aprobado, mails enviados. Checkpoints paralelos dentro de este estado. |
| **En Tránsito** | Metric "In Transit" / inicio de fase 5 | Disparado por 315 de zarpe. Alertas de "próximo arribo" N días antes. |
| **Arribado** | Metric "Arrive" / fin de fase 5 | Disparado por 315 de arribo. |

Los checkpoints paralelos del estado 2 (`planilla_cargada`, `permiso_controlado`, `declaracion_lista`, `bl_aprobado`, `mail_{doc}_enviado`) son visibles en el dashboard sin ser "estados" en sentido estricto. El estado 3 avanza **independientemente** de que falten mails — el dashboard sigue alertando al operador hasta que se complete el envío de todos los documentos.

---

## 8. El campo más crítico del 304 — `BusinessInstructionsReferenceNumberNotes` (alias TXT 107)

Merece sección propia por su valor operativo.

**Alias SSB**: `TXT 107`. Es cómo el operador ve este campo en SAP y cómo se lo nombra internamente. De acá en adelante, los documentos técnicos del proyecto y el código pueden usar ambos términos indistintamente.

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

**Dónde vive en el dashboard (MVP)**: candidato #1 para IA. **G6 del MVP** (v5, 23/04): parseo IA del TXT 107 que alimenta G5 (Panel Declaración Lista), G7 (Control BL en texto libre) y G8 (Template del mail al cliente).

**En el schema**: se persiste el texto completo crudo, sin transformar, junto con la versión parseada. El texto crudo nunca se sobreescribe.

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

**Nota sobre leading zeros del PO**: SAP persiste CHAR(10) con ceros adelante. El equipo SSB opera sin el cero (`0118705352` → `118705352`). El dashboard **persiste crudo** (con ceros) y **muestra normalizado** (sin ceros) — ACL (Anti-Corruption Layer) en la UI.

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
| **Incoterm** | `TransportationTermsCode` | `CPT`, `CFR`, `FCA`, `CIF` |
| **Service Type** | `TariffServiceCode` | `DD` (Door-to-Door), `DP` (Door-to-Port) |
| **Shipping Point / SH Point** | Qualifier `SF` en refs generales | `D146`, `D116`, `D147`, `D176` |
| **Transportation Planning Point** | Qualifier `PE` en refs generales | `P703`, `P706`, `P749` |
| **DeliveryLocation** | Campo `DeliveryLocation` (texto libre) | `"SALVADOR PORT"`, `"NAVEGANTES PORT"`, `"MAIPU"` |
| **Container Type** | `Items[].ContainerDetails.EquipmentType` | `40CZ` (marítimo 40'), `VAEM` (terrestre/van) |
| **Fecha planificada de despacho** | Sub-qualifier `PGIDATE` en items | YYYYMMDD, ej `20260425` |
| **Fecha solicitada de despacho** | Qualifier `RSD` en `DateTimeReference` | YYYYMMDD |
| **Fecha entrega requerida** | Qualifier `002` en `DateTimeReference` | YYYYMMDD |

**IMPORTANTE**: `DeliveryLocation` **no es** destino físico final. Es el lugar asociado al Incoterm. En FCA es punto de origen (Abbott/Bahía Blanca). En CPT/CFR es puerto de descarga, no ciudad de entrega final. El destino físico final se deriva de la entidad `ST` (Ship To). El schema normalizado necesita **dos campos distintos**.

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
Los documentales cruzan 3 fuentes (planilla de aduana, factura, booking) para cargar la declaración en portales de navieras. Hoy es manual. El Validador Aduanal ya resuelve parte (parseo de planillas); **se copia al dashboard en R1 del MVP** (NG16) para cerrar el círculo.

### P2 (crítico) — Control del BL
Cruce manual de BL draft contra factura, planilla y otros documentos. Errores recurrentes: tipeo, producto desactualizado, permiso mal escrito, peso incorrecto. **Atacado en R1 del MVP (G7)**: determinístico + IA.

### P3 (crítico) — Mailing de documentación
100% manual. Documental busca docs en Drive, arma mail, adjunta, envía. Puede haber 2-3 envíos por orden. Sin seguimiento, sin alertas de arribo al cliente. **Atacado en R2 del MVP (G8, G14)**: pre-armado + seguimiento por doc/cliente.

### P4 — Duplicación Metric / Excel
Toda coordinación se carga dos veces: Metric (cara al cliente SAP) + Excel (herramienta interna). Reducir la duplicación es objetivo largo plazo, fuera del MVP.

### P5 — Deadlines y alertas
Cortes documentales, VGM, plazos de corrección de BL por naviera — hoy monitoreados por una persona mirando el programa marítimo. **Atacado en R4 del MVP (G12)**: alertas proactivas.

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
| Metric → Interlog | API JSON (instrucciones) | En testeo final |

### Del dashboard nuevo (SSB-IT-RESEARCH)
| Integración | Tipo | Release |
|---|---|---|
| Dashboard ← Importer (webhook 304) | Push HTTP | ✅ Walking Skeleton desplegado. Confirmación Brian pendiente (Q25). |
| Dashboard ↔ Supabase | Persistencia | En uso (WS). Schema completo pendiente. |
| Dashboard ↔ n8n | Orquestación de workflows | Pendiente |
| Dashboard ↔ Claude API | Parseo TXT 107, control BL, template mail | R1-R2 |
| Dashboard ← Metric (301 push) | Push HTTP | R4 (a solicitar a Santiago) |
| Dashboard ← Metric (315 push) | Push HTTP | R4 (a solicitar a Santiago) |
| Dashboard ↔ API Interlog | API JSON | R1 Vía A (en testeo) |
| Dashboard ↔ Drive | Lectura por naming convention | R1-R2 |
| Dashboard → Maersk (SI submit + BL draft retrieve) | REST DCSA OAuth2 | R1. Pendiente Customer Code (Q37). |
| Dashboard → Hapag-Lloyd (modo asistido) | UI + copy-paste | R1. INTTRA como plan B futuro. |
| Dashboard → Log-In | Depende respuesta Log-In (Q34) | R1. Modo asistido inicial. |

---

## 12. Glosario (términos operativos + técnicos)

### Términos del negocio (comex)
| Término | Significado |
|---|---|
| **ATA** | Agente de Transporte Aduanero (terrestre) |
| **BL** | Bill of Lading, conocimiento de embarque marítimo |
| **BL Draft / Verify Copy** | Borrador del BL que emite el carrier después de recibir la Shipping Instruction, antes de confirmar el BL Final. En Maersk se llama *Verify Copy*; en Hapag *Draft BL*; en Log-In *BL Draft*. Son equivalentes. Se revisa, se corrige si hace falta, se aprueba. |
| **BL Final / Original** | Versión final aprobada del BL. Se descarga del portal de la naviera o llega por mail / e-BL según carrier. |
| **Booking** | Reserva de espacio en buque |
| **Booking Advice** | Documento con info de la orden al momento del ofrecimiento |
| **CIF** | Cost Insurance Freight — Incoterm donde el exportador paga seguro hasta destino |
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
| **MPC** | Siglas internas SSB — marítimo (a clarificar si surge ambigüedad) |
| **NCM / PA** | Nomenclatura Común del Mercosur / Posición Arancelaria |
| **NW** | Fecha de New (ofrecimiento) |
| **PE** | Permiso de Exportación |
| **PO** | Purchase Order |
| **POD** | Port of Discharge (puerto de destino) |
| **POL** | Port of Loading (puerto de origen) |
| **PTN** | Puerto Nuevo (Bahía Blanca) |
| **SHP** | Shipment Number |
| **Shipping Instruction / SI** | Instrucción que el shipper (SSB en nombre de PBB) envía al carrier (Log-In / Maersk / Hapag) para que emita el BL. Internamente SSB la llama **"declaración de embarque"**. Son sinónimos. Contiene shipper, consignee, notify, incoterm, cargo, HS codes, instrucciones especiales. |
| **SITA** | Solicitud de anulación de permiso |
| **STO** | Stock Transfer Order (intercompany Dow) |
| **TRP** | Terminal Río de la Plata (Buenos Aires) |
| **VGM** | **Verified Gross Mass** — peso bruto verificado del contenedor (IMO SOLAS). Internamente a veces se dice "BGM" — el término correcto es **VGM con V chica**. |
| **315** | Evento de tracking en SAP |

### Términos técnicos del 304 / EDI
| Término | Significado |
|---|---|
| **304** | Transaction Set de EDI X12 — "Shipping Instructions". El JSON que Dow manda a SSB |
| **301** | Transaction Set X12 — "Confirmation". Lo emite Metric hacia SAP |
| **EDI X12** | Electronic Data Interchange formato ANSI X12. Estándar US de mensajería B2B |
| **EDIFACT** | Estándar europeo/ONU de EDI. Equivalente global a X12. Relevante acá: el formato **IFTMIN** (Shipping Instructions) que Maersk acepta vía EDI directo o INTTRA. |
| **EntityIdentifier** | Código de rol de un actor del embarque (EX, ST, N1, etc.) |
| **GMID** | Global Material Identifier de Dow. Código interno de producto. NO es NCM |
| **IDOC SHPMNT** | Tipo de documento SAP (SHPMNT03/05/06). Se serializa a X12 o JSON antes de enviar |
| **Qualifier** | En EDI, muchos elementos son pares *qualifier + value*. El qualifier define qué tipo de dato es el value |
| **ReferenceIdentificationQualifier** | Código que identifica qué tipo de referencia sigue (PO, CO, SF, etc.) |
| **SCAC** | Standard Carrier Alpha Code. Asignado por NMFTA (USA). En los 304 aparece `SSB` — pendiente confirmar si es oficial o bilateral |
| **TXT 107** | Alias SSB de `BusinessInstructionsReferenceNumberNotes`. Cómo lo ve el operador en SAP. |
| **UN/LOCODE** | Código UN de 5 caracteres para puertos (ej. `BRSSZ` = Santos) |

### Términos técnicos de APIs / carriers (nuevos — 24/04)
| Término | Significado |
|---|---|
| **DCSA** | *Digital Container Shipping Association*. Asociación fundada en 2019 por los 10 carriers deep-sea globales más grandes (Maersk, MSC, CMA CGM, Hapag-Lloyd, ONE, Evergreen, Yang Ming, HMM, ZIM, PIL). Publica specs públicas de API para container shipping. Adoptar DCSA como modelo de datos interno desacopla el dashboard de la heterogeneidad de carriers. |
| **DCSA Bill of Lading 3.0** | Estándar DCSA que define el contrato de datos de la Shipping Instruction, el Draft BL y el BL final. Finalizado feb-2025. Incluye módulos de *Shipping Instructions*, *Transport Document*, *eBL Issuance*, *eBL Surrender*. Maersk lo tiene productivo en su Developer Portal como API "Ocean – Carrier Bill of Lading [DCSA]". |
| **DCSA Booking 2.0** | Estándar DCSA del contrato de datos de la reserva (booking). Finalizado feb-2025. Maersk lo expone como API "Ocean Booking v2 [DCSA]". |
| **DCSA Track & Trace 2.2** | Estándar DCSA para eventos de shipment/equipment/transport. Hapag-Lloyd lo tiene en beta pública. Productos equivalentes en Maersk: Track and Trace Plus + Visibility Studio. |
| **Customer Code** | Código que Maersk asigna a cada cliente corporativo. Las Customer APIs de Maersk (las que devuelven datos de órdenes reales) requieren que el consumer key del developer portal esté vinculado a al menos 1 Customer Code válido. **Para SSB, el Customer Code relevante es el de la cuenta A136 PBB/Dow** — se solicita a la oficina local Maersk AR. Bloqueante de R1 Maersk hasta que se tenga. |
| **Consumer Key / Consumer Secret** | Credenciales OAuth 2.0 que generan las APIs de Maersk y Hapag-Lloyd en sus developer portals. El Consumer Key identifica la app; el Secret se usa para obtener tokens de acceso. |
| **Shipping Instruction (SI)** | Nombre estándar industria / DCSA de la "declaración de embarque" de SSB. Ver entrada del glosario comex arriba. |
| **eaSI** | *electronic advanced Shipping Instructions*. Herramienta de Hapag-Lloyd para envío de SI. Dos variantes: eaSI online (formulario web) y eaSI mail (PDF editable por mail). **No tiene variante API pública al 24/04**. |
| **Log-Aí** | Plataforma web de Log-In Logística Intermodal ([logai.loginlogistica.com.br](https://logai.loginlogistica.com.br)). Cliente accede con login/password. Permite booking online, tracking, envío/descarga de documentación. **No tiene API pública conocida** al 24/04 — respuesta oficial pendiente (Q34). |
| **INTTRA / e2open** | Hub/plataforma de integración B2B para container shipping. Co-fundada por Maersk, CMA CGM, Hapag-Lloyd, MSC, Hamburg Süd; propiedad de e2open desde 2018. Acepta SI vía API/EDI (EDIFACT IFTMINb) y la enruta al carrier final. **Para SSB queda como plan B** — a contratar solo si Hapag sube volumen o si un segundo cliente SSB lo requiere. No resuelve Log-In (no está en INTTRA). |
| **eBL** | *electronic Bill of Lading*. Versión digital del BL con validez legal equivalente al papel. Hapag-Lloyd emite eBL vía IQAX o WaveBL (plataformas terceras). Maersk tiene su propio flujo eBL. No aplica a Log-In. |
| **OAuth 2.0** | Estándar de autorización usado por Maersk y Hapag-Lloyd. Maersk usa *client credentials flow* (server-to-server), Hapag *authorization code*. |

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

1. **Automatizar sin reemplazar decisiones humanas.** El documental sigue aprobando el BL y el envío de mails. El dashboard asiste intensivamente pero los gates siguen humanos.
2. **El 304 es la fuente única de verdad del ofrecimiento.** Se persiste crudo antes de procesarse.
3. **Idempotencia absoluta.** Mismo 304 reenviado no duplica efectos.
4. **Trazabilidad completa.** Logging de entradas, salidas, estados, timestamps, acciones del operador (who/when/what).
5. **Sin acoplamiento a lógica interna de Metric/Importer.** Solo APIs estables y contratos push confirmados.
6. **Validar con Brian/Santiago antes de apoyarse en código legacy.**
7. **Los documentos se adelantan al cliente apenas estén aprobados.** No se espera a tener todo junto — cada doc se envía cuando está listo.
8. **Arquitectura de adapters por carrier** (propuesto 24/04, a cerrar próxima sesión). Cada naviera se trata como caja negra con interface común; la heterogeneidad técnica no se filtra al resto del sistema.

---

## 14. Proyectos adyacentes (referencia rápida)

Estos proyectos existen en paralelo. **No se arrastran por defecto al diseño del dashboard**. Se integran o aportan conceptos solo cuando corresponda.

- **Validador Aduanal** (`validador-aduanal`): web app en Netlify + Supabase. Parsea planillas de aduana. **Absorbido al dashboard en R1 del MVP**; standalone se discontinúa (NG16).
- **Tarifa Schedule** (`tarifa-schedule`): HTML con tarifas y schedule de servicios marítimos. En pausa.
- **Inbox Triage** (`ssb-inbox-triage`): asistente inteligente de correo con clasificación IA. En desarrollo activo. Fuera del MVP (NG13); evaluable para fase 2.

---

*Última actualización: 24/04/2026. Se actualiza cuando aparece un concepto nuevo del dominio o cambia la operativa.*
