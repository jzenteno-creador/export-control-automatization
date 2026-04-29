# Preguntas abiertas

**Proyecto**: SSB-IT-RESEARCH
**Última actualización**: 29/04/2026

Priorizadas por impacto en diseño. Marcar con ✅ al cerrarse.

---

## Críticas — bloquean decisión de arquitectura

### Q1 — ¿Cómo se entera el dashboard de un 304 nuevo?
- **Quién responde**: Brian / Santiago
- **Opciones**: webhook desde Importer, pull via `ConsultaOrder`, cola, replicación, notificación desde Metric.
- **Por qué importa**: define el trigger de toda la arquitectura. Sin esto no hay diseño posible.
- **Estado**: **decisión tomada (22/04), confirmación pendiente de Brian**.
- **Resolución**:
  - **Opción elegida**: B (webhook desde Importer Laravel). Brian agrega al Importer una llamada HTTP POST saliente al dashboard después de recibir el 304 en `/api/orders/store`.
  - **Opciones descartadas**: A (SAP doble envío — Dow no lo hace), C (pull via ConsultaOrder — latencia, no event-driven), D (Metric — no persiste crudo, no idempotente, no emite eventos salientes; investigación completa en `research.md` sección 4).
  - **Walking Skeleton**: endpoint receptor desplegado el 22/04 en Supabase (`https://cctuowthpnstvdgjuomq.supabase.co/functions/v1/ingest-304`). Verificado con 5 tests + 11 JSONs reales cargados 22/04 tarde.
  - **Pedido a Brian**: mail enviado el 22/04 con URL, headers, contrato mínimo. Esperando confirmación de viabilidad técnica.

### Q2 — ¿Existe el flujo Importer → Metric? ¿Cómo funciona? ✅
- **Quién responde**: Brian / Santiago (originalmente). Resuelta por investigación directa de código.
- **Estado**: **cerrada (22/04)**. Resuelta por análisis del repo `sosab-api`.
- **Respuesta**: **No existe flujo Importer → Metric**. SAP envía el 304 **en paralelo** a dos destinos distintos:
  1. Importer Laravel: `POST /api/orders/store` — lo persiste crudo en el módulo Logs de JSON + lo normaliza a tablas internas.
  2. Metric (Flask + MySQL): `POST /gestor-expo/api/orders/store-complete` — lo normaliza directamente a tablas MySQL, **sin guardar crudo**.
- **Consecuencia**: si el dashboard quisiera el 304 desde Metric, tendría que reconstruir el JSON con joins (las funciones `create_general_304` / `create_material_304` hacen eso). Por esto se descartó la Opción D. Detalle completo en `research.md` sección 4.

### Q3 — ¿Existe un contrato estable (API, evento) que Metric exponga para avisar cambios de estado de orden?
- **Quién responde**: Brian / Santiago
- **Eventos relevantes**: orden despachada, orden embarcada, orden arribada.
- **Por qué importa**: alimenta las etapas 2, 9 del workflow (tracking).
- **Estado**: **parcialmente resuelta (23/04)**. Jona confirma que puede solicitar a Santiago:
  1. Endpoint de consulta (pull) al dashboard que lea estado de coordinación y eventos.
  2. **Replicación push** del 301 y 315 al dashboard cuando Metric los emite a SAP. Mismo patrón que el webhook del Importer con el 304.
- **Decisión provisional**: arrancar con push simétrico al 304. Bidirección: Jona también puede exponer endpoints de consulta al equipo de Metric si les sirve info que esté en el dashboard.
- Queda abierta pendiente de conversación formal con Santiago para acordar alcance del push.

### Q4 — ¿El flujo de exportación (órdenes tipo `E`) entra por `orders/store` y `shipments/store`? ¿Hay diferencias en el payload respecto a importación?
- **Quién responde**: Brian / Santiago
- **Por qué importa**: el doc técnico documenta solo importación. Vamos a operar exportación.
- **Estado**: abierta.

---

## Importantes — afectan implementación

### Q5 — ¿Los endpoints `/orders/store` y `/orders/factura` sin JWT qué auth tienen?
- **Quién responde**: Brian / Santiago
- **Posibilidades**: IP whitelist, HMAC, firma del payload, nada.
- **Por qué importa**: si el dashboard va a recibir el 304 vía el mismo mecanismo que SAP golpea al Importer, necesitamos saber qué replicar.
- **Estado**: abierta.

### Q6 — ¿Qué es "Kipin"?
- **Quién responde**: Julio / Mariano
- **Contexto**: Brian mencionó que el Importer se desarrolló inicialmente con Kipin (empresa / framework / herramienta).
- **Por qué importa**: si es un tercero con docs o devs accesibles, puede haber material de referencia que SSB no tiene internamente.
- **Estado**: abierta.

### Q7 — ¿Existe un endpoint de update de eventos (315) en el Importer, o entra todo por `shipments/store`?
- **Quién responde**: Brian / la doc Scribe
- **Por qué importa**: claridad sobre cómo mapean los 315 al modelo interno del Importer.
- **Estado**: abierta. Verificable en `https://importer.ssbplatform.com/docs`.

### Q8 — ¿Cuál es el schema exacto del JSON del 304? ✅
- **Quién responde**: el módulo "Logs de JSON" del Importer (tarea propia).
- **Por qué importa**: sin el schema no se puede modelar `orders` ni `inbound_events`.
- **Estado**: **cerrada (22/04)**. Se descargaron 11 JSONs reales del módulo Logs de JSON. Schema documentado en `research.md` sección 7. Quedan 10 sub-preguntas de detalle (Q15-Q24) derivadas del análisis.

### Q9 — ¿Acceso al módulo "Logs de JSON" del Importer? ✅
- **Quién responde**: Brian (si el acceso actual a UAT no alcanza).
- **Por qué importa**: precondición de Q8.
- **Estado**: **cerrada (22/04)**. Jona tiene acceso directo.

---

## Contextuales — útiles para prioridad y diseño

### Q10 — ¿Dónde se genera la aceptación de orden (301) que va a SAP?
- **Quién responde**: Brian / Santiago
- **Contexto**: Jona confirmó que sale de Metric.
- **Por qué importa**: saber si es un flujo automático o involucra decisión humana en Metric.
- **Estado**: parcialmente respondida (sale de Metric). Falta detalle del trigger.

### Q11 — ¿La URL `https://importer.ssbplatform.com/docs` de Scribe está actualizada?
- **Quién responde**: acceso directo de Jona con usuario y contraseña.
- **Por qué importa**: si Scribe está al día, se reduce la necesidad de leer código legacy.
- **Estado**: abierta (a verificar por Jona).

### Q12 — ¿Cuál es el flujo as-is completo de una orden de exportación hoy?
- **Quién responde**: equipo de documentación (2 personas).
- **Por qué importa**: mapear qué automatizar y qué mantener manual. Preguntas 13, 14 derivan de esta.
- **Estado**: abierta. Tarea operativa propia de Jona. Parcialmente cubierto en `business-context.md` §7 con lo que ya aportó Jona; falta validar con documentales.

### Q13 — ¿Cuáles son las excepciones recurrentes al flujo estándar?
- **Quién responde**: equipo de documentación.
- **Por qué importa**: modelar excepciones desde el día uno evita rediseños.
- **Estado**: abierta.

### Q14 — ¿Qué documentos acompañan una orden de exportación tipo (factura, CRT, certificado de origen, packing list, BL) y cuál es el ciclo de vida de cada uno?
- **Quién responde**: equipo de documentación.
- **Por qué importa**: define la etapa 7 del workflow (envío al cliente).
- **Estado**: parcialmente respondida (23/04). Jona aportó el detalle operativo en sesión. Lo sistematizado queda en el Plan de Releases R2. Falta validación con el equipo.

---

## Schema del JSON del 304 — derivadas del análisis de 11 JSONs

Preguntas que cierran el schema definitivamente. Ver `research.md` sección 7.12 para contexto completo de cada una.

### Q15 — ¿Qué representa el prefijo del PO: `0118...` vs `4010...`? ✅
- **Quién responde**: Jona (conocimiento operativo propio).
- **Contexto**: los 11 JSONs analizados se dividen claramente en dos grupos. Las órdenes `0118...` traen qualifiers adicionales (`1V`, `CO`, `AEG`). Las `4010...` vienen con una estructura mínima.
- **Estado**: **cerrada (22/04)**. Confirmado por Jona:
  - `0118...` = **Trade** (venta a cliente externo). Requiere qualifier `AEG` (AES - Ultimate Consignee Type) porque aplica regulación US de exportación a terceros. Trae `CO` porque hay contrato comercial con el cliente final. Trae `1V` (related vendor order number).
  - `4010...` = **STO** (Stock Transfer Order, intercompany Dow → Dow). Estructura mínima porque no hay vendor externo, no hay contrato comercial, no hay consignatario externo que declarar a AES.
  - **El prefijo es estable**: todas las trade arrancan con `0118`, todas las STO con `4010`. Sin excepciones reportadas.
  - **Consecuencia operativa clave**: en STO la documentación se envía siempre al mismo forwarder del lado del destino (típicamente Brasil). Flujo más estandarizado, destinos recurrentes (Santos, Navegantes, Rio de Janeiro, Paranaguá, Itajaí). En trade, el destinatario del mailing y las instrucciones específicas se leen del campo `BusinessInstructionsReferenceNumberNotes` del 304 y pueden variar orden a orden.
- **Implicancia para el dashboard**: el destinatario del mailing en STO puede resolverse con tabla maestra (cliente STO → forwarder destino). En trade requiere parseo IA del campo `BusinessInstructionsReferenceNumberNotes` (TXT 107). Documentar en `business-context.md` sección 4.3.

### Q16 — ¿Cuál es el mapa completo de shipping points / plantas Dow? Códigos vistos: `D116`, `D146`, `D147`, `D176`.
- **Quién responde**: Brian / Santiago, o documentación interna de Dow.
- **Contexto**: aparecen en qualifier `SF` (Ship From) dentro de `ReferenceIdentificationGeneral`.
- **Por qué importa**: para normalizar en el dashboard el origen físico de cada orden.
- **Estado**: abierta.

### Q17 — ¿Cuál es el mapa completo de transportation planning points? Códigos vistos: `P703`, `P706`, `P749`.
- **Quién responde**: Brian / Santiago, o documentación interna de Dow.
- **Contexto**: aparecen en qualifier `PE` (Plant Number) dentro de `ReferenceIdentificationGeneral`.
- **Por qué importa**: mismo motivo que Q16.
- **Estado**: abierta.

### Q18 — ¿Qué significa exactamente el qualifier `AEG` y por qué aparece solo en algunas órdenes?
- **Quién responde**: Brian / Santiago.
- **Contexto**: aparece con `FreeFormDescription: "AES - Ultimate Consignee Type"` y valor `"DIRECT CONSUMER"`. Solo en POs `0118...`. AES = *Automated Export System* de US Customs.
- **Por qué importa**: si es metadata regulatoria de Estados Unidos, puede no aplicar al dashboard (SSB opera desde Argentina). Confirmar si es safe ignorar.
- **Estado**: parcialmente resuelta (22/04 con Q15). Confirmado que aparece solo en órdenes trade (`0118...`) porque es metadata regulatoria US-AES que no aplica a intercompañía Dow-Dow. Falta confirmar: (a) qué otros valores puede tomar más allá de `"DIRECT CONSUMER"`, (b) si el dashboard debe persistirlo para trazabilidad o puede ignorarlo.

### Q19 — ¿Qué significa el flag `LJ=N` a nivel ítem?
- **Quién responde**: Brian / Santiago o documentación Dow.
- **Contexto**: aparece en los 31 ítems analizados siempre con valor `N`. En X12 estándar `LJ` = Local Jurisdiction, pero un valor `N` no encaja con una jurisdicción (se esperaría un código de estado/provincia).
- **Por qué importa**: si aparece alguna vez con `Y`, puede ser relevante para el dashboard.
- **Estado**: abierta.

### Q20 — ¿Cómo es la estructura del array `Hazardous` cuando una orden contiene productos peligrosos?
- **Quién responde**: Jona cuando aparezca una orden de producto peligroso en el Importer (tarea propia), o Brian / documentación.
- **Contexto**: en los 11 JSONs analizados el array está siempre vacío (`[]`), porque todas las resinas PE/PP son *"Not regulated for transport"*. La estructura real aparece solo con productos regulados.
- **Por qué importa**: si el dashboard tiene que mostrar datos IMDG (clase UN, proper shipping name, grupo de embalaje), necesitamos conocer la estructura antes de diseñar.
- **Estado**: abierta. Desbloqueable descargando un JSON de orden hazmat del módulo Logs de JSON si existe uno.

### Q21 — ¿El qualifier `RSD` en `DateTimeReference` significa "Requested Ship Date"?
- **Quién responde**: Brian / Santiago, o documentación SAP interna de Dow.
- **Contexto**: `RSD` no figura en el catálogo X12 estándar de DateTimeQualifier (elemento 374). Es probable convención SAP. La hipótesis operativa es que marca la fecha solicitada de despacho.
- **Por qué importa**: si la interpretación es incorrecta, toda la coordinación de fechas del dashboard queda mal modelada.
- **Estado**: abierta. Hipótesis fuerte pero sin confirmar.

### Q22 — ¿El `SCAC "SSB"` está registrado en NMFTA o es código bilateral Dow↔SSB?
- **Quién responde**: Julio / Mariano o equipo comercial SSB.
- **Contexto**: SCAC = *Standard Carrier Alpha Code* de NMFTA (entidad US). SSB aparece como SCAC en `RouteInformation.StandardCarrierAlphaCode` de los 11 JSONs.
- **Por qué importa**: saber si SSB está en NMFTA afecta qué datos enviamos a destinos de Estados Unidos. Si es bilateral, es metadata interna sin valor regulatorio.
- **Estado**: abierta.

### Q23 — ¿Cuál es el mapeo de `EquipmentType 40CZ` y `VAEM` a tipos de equipo estándar?
- **Quién responde**: Brian / Santiago o documentación Dow.
- **Contexto**: `40CZ` aparece en marítimo y `VAEM` en terrestre. No son ISO 6346 puro. Hipótesis: `40CZ` = contenedor marítimo de 40 pies (refer con un subtipo Z), `VAEM` = van/camión terrestre sin contenedor marítimo.
- **Por qué importa**: si aparecen otros tipos (20' reefer, tank container, flat rack), necesitamos poder identificarlos en el dashboard.
- **Estado**: abierta.

### Q24 — ¿Cómo se normalizan los `LocationIdentifier` de las entidades a códigos oficiales (UN/LOCODE o ISO 3166-2)?
- **Quién responde**: tarea propia de investigación (no requiere tercero) o confirmación de Brian si hay tabla maestra en Dow.
- **Contexto**: valores vistos en los JSONs: `B`, `C`, `BA`, `SC`, `SP`, `PR`, `RM`, `LIM`, `V`, `MG`, `MEX`. Son abreviaturas de estado/provincia o códigos internos. No son UN/LOCODE estándar.
- **Por qué importa**: si el dashboard muestra geografía de destinos, conviene persistir el valor crudo + un valor normalizado.
- **Estado**: abierta.

---

## Derivadas del Walking Skeleton (22/04)

### Q25 — ¿Es viable técnicamente agregar al Importer una llamada HTTP POST saliente al dashboard después de recibir el 304 en `/api/orders/store`?
- **Quién responde**: Brian.
- **Contexto**: es el pedido formal enviado por mail el 22/04. Tiene OK de Mariano. Brian tenía el viernes 25/04 para pushear a producción — no se ejecutó. Levantado nuevamente el 29/04.
- **Por qué importa**: si Brian dice que no, hay que volver a evaluar alternativas (SFTP, cola intermedia, modificar SAP). Si dice que sí, se coordina implementación.
- **Estado**: abierta. Sin respuesta al 29/04.

### Q26 — ¿El módulo "Logs de JSON" del Importer guarda el 304 de forma idempotente? Si SAP reenvía el mismo 304, ¿se duplica o se detecta?
- **Quién responde**: Brian.
- **Contexto**: forma parte del pedido a Brian (sección 4 del mail). Relevante porque el Walking Skeleton cumple idempotencia vía SHA-256; pero si el Importer no la tiene, podría haber un doble efecto operativo (una copia duplicada en Importer + una única en dashboard).
- **Por qué importa**: confirma si el Importer tiene la misma garantía que el dashboard, o si la idempotencia queda "aguas abajo" únicamente.
- **Estado**: abierta.

### Q27 — ¿Qué política de retries va a implementar Brian del lado del Importer si el dashboard está caído?
- **Quién responde**: Brian.
- **Contexto**: el mail propone dos opciones (reintento simple con backoff vs cola local). Brian decide según estructura del Importer.
- **Por qué importa**: afecta el SLA real del dashboard. Con cola local, aunque el dashboard esté caído 1 hora, nada se pierde. Con reintento simple + timeout, puede perderse el evento.
- **Estado**: abierta.

---

## Operativas — surgen del cierre de Goals/Non-goals (23/04)

### Q28 — ¿Qué países/clientes requieren COO físico (firmado por Cámara Arg. de Comercio) y no digital?
- **Quién responde**: equipo de documentación.
- **Por qué importa**: determina qué fracción de órdenes necesita el canal de mail físico (escáner → dashboard). Si es <5%, queda como caso edge. Si es mayor, conviene modelar bien.
- **Estado**: abierta.

### Q29 — ¿Existe una tabla maestra cliente STO → forwarder destino que se pueda sistematizar?
- **Quién responde**: Santiago / líder de equipo.
- **Por qué importa**: R2 depende de esta tabla para resolver destinatarios de mailing de órdenes STO sin parsear TXT 107 (ver Goals v5 G8, `business-context.md` 4.3).
- **Estado**: abierta.

### Q30 — ¿Cuál es el canal actual por donde se recibe el reporte VGM desde Bahía Blanca, y puede automatizarse el envío?
- **Quién responde**: Jona + operador de balanza en planta.
- **Contexto confirmado 23/04**: el reporte lo baja una persona y lo comparte por mail. A veces no está disponible el viernes; se solicita el lunes. SSB hace la limpieza y toma la última pesada con un control.
- **Por qué importa**: define si R3 arranca con upload manual o con mail dedicado + parseo automático.
- **Estado**: abierta. Dato preliminar: por mail → upload manual del operador.

### Q31 — ¿Log-In, Maersk o Hapag-Lloyd ofrecen alguna API para carga de VGM que no requiera el portal web ni el mail?
- **Quién responde**: comercial SSB (contacto con cada naviera) o search en docs oficiales.
- **Contexto confirmado 24/04**: research completo en `research-apis-carriers.md`. Maersk tiene API de VGM en su Developer Portal — consumible una vez que se tenga Customer Code. Hapag-Lloyd y Log-In no publican API para VGM. Para R3 inicial, el canal sigue siendo Excel + mail para los 3.
- **Por qué importa**: si alguna lo tiene, R3 podría incluir envío automático online para esa naviera. Si ninguna, confirmamos NG12 definitivo.
- **Estado**: parcialmente resuelta (24/04). Decisión provisional: R3 arranca con Excel + mail para los 3; integración API Maersk VGM se evalúa como mejora si aparece Customer Code antes de R3.

### Q32 — ¿Cuál es el regex del número de permiso de exportación?
- **Quién responde**: Jona (tarea propia de Claude Code con muestra de permisos).
- **Contexto**: ejemplos vistos: `25003EC03002997S`, `26003EC01001808H`. Formato aparente: `{YY}{NNN}EC{NN}{NNNNNNN}{L}`.
- **Por qué importa**: R1 valida el permiso que viene en la planilla de aduana contra este formato antes de cruzar con el reporte Interlog.
- **Estado**: abierta.

### Q33 — Santiago: implementar endpoint de consulta + push 301/315 simétrico al Importer.
- **Quién responde**: Santiago.
- **Por qué importa**: **bloquea R4** (tracking).
- **Estado**: abierta. A coordinar una vez que Brian confirme (Q25).

---

## APIs de navieras (24/04) — derivadas del research + mails enviados

### Q34 — ¿Log-In ofrece alguna forma de automatización no-UI para submit de SI y descarga de BL draft?
- **Quién responde**: Log-In (área comercial / IT).
- **Contexto**: mail enviado por Jona el 24/04. Research externo confirma que no hay developer portal público, no está en DCSA, no aparece en INTTRA. Log-Aí es solo UI web con login/password.
- **Por qué importa**: **bloquea la decisión de cómo integrar Log-In en R1**. Log-In es 60-70% del volumen de SSB.
- **Estado**: abierta. Sin respuesta al 29/04.

### Q35 — ¿Maersk tiene algún programa de onboarding API específico para forwarders LATAM o para cuentas Dow?
- **Quién responde**: Maersk (área técnica).
- **Contexto**: mail enviado por Jona el 24/04. Developer Portal es self-service, pero el Customer Code A136 se gestiona localmente.
- **Por qué importa**: informativo. Si existe onboarding dedicado reduce el riesgo de R1 Maersk.
- **Estado**: abierta. Sin respuesta al 29/04.

### Q36 — Cotización INTTRA / e2open para SSB (plan B).
- **Quién responde**: área comercial e2open / INTTRA.
- **Estado**: **no se cotiza hoy**. A reevaluar si Hapag sube volumen o aparece segundo cliente SSB que lo requiera. Diferida.

### Q37 — Obtener Customer Code Maersk vinculado a cuenta A136 PBB/Dow.
- **Quién responde**: oficina local Maersk Argentina.
- **Por qué importa**: **bloqueante de R1 Maersk**. Sin Customer Code, solo se puede desarrollar contra mocks DCSA.
- **Estado**: abierta. Gestionar con oficina local Maersk AR.

### Q38 — Confirmación técnica de las 5 decisiones de diseño del research de APIs.
- **Quién responde**: Jona + Claude.
- **Contexto**: analizadas en sesión 29/04. Decisión: APIs de carriers dejadas **en plan a definir**. Orden probable R1: Maersk → Log-In. Sin formalizar todavía.
- **Estado**: **parcialmente resuelta (29/04)**. A formalizar cuando haya más data (respuestas Q34/Q35, tráfico real de Brian).

---

## Dow / SAP — nuevas (29/04)

### Q39 — ¿SSB ya recibió el Tender file de Dow Sourcing con los Lane IDs actualizados (vigentes desde 1° mayo 2026)?
- **Quién responde**: Leo Mutto + Jorge Rojas (coordinación con Dow Sourcing).
- **Contexto**: Dow (Travis Spry) solicita que SSB agregue un nuevo campo `LaneID` en el JSON 301 (respuesta de booking que SSB envía a Dow). El dato lo provee Dow Sourcing vía Tender file. Ejemplos del formato: `ARBHI-PRtPR-BRIOA---40C-MRK`, `ARBUE-PRtPR-BRSUA---40C-MRK` (máx 34 caracteres). Dow confirma que para testing puede usarse cualquier texto ≤34 chars. Target go-live: Q2 2026, testing completo antes de mid-junio.
- **Por qué importa**: impacta el schema del 301 y el flujo de datos de Metric hacia SAP. Si SSB no tiene el Tender file, no puede mapear el campo. Si lo tiene, el desarrollo puede arrancar.
- **Estado**: abierta. Coordinar con Leo Mutto + Jorge Rojas (SSB) y Maru Barbieri / Travis Spry (Dow).

---

## Decisiones pendientes de Jona (no requieren tercero)

### D1 — ¿Borrar `.venv/` (ya hecho) cierra la posibilidad de usar Python? ¿O puede volver un microservicio Python aparte?
- **Contexto**: stack actual no usa Python. Si aparece necesidad (scraping pesado, parsing de PDFs), puede levantarse un microservicio separado (Fly.io / Railway), no adentro de Supabase.
- **Estado**: decisión diferida. Se evalúa si aparece el caso de uso.

### D2 — ¿Push del commit a GitHub ahora o después? ✅
- **Estado**: **cerrada (22/04)**. Push completado.

### D3 — ¿Manual de configuración de VS Code se genera ahora o después de la primera sesión de coding real?
- **Estado**: abierta. No urgente.

### D4 — ¿Co-authorship "Claude Opus 4.7" en commits sí o no?
- **Estado**: abierta.

### D5 — ¿`business-context.md` va como archivo vivo del proyecto? ✅
- **Estado**: **cerrada (22/04)**. Confirmado.

### D6 — ¿Mantener plan free de Supabase o upgrade a Pro cuando Brian conecte el endpoint?
- **Contexto**: el Walking Skeleton está en plan free (500 MB DB, 2 GB transfer). A 150-200 órdenes/mes × ~15 KB ≈ 30 KB/mes, el free alcanza por años. Pero Pro trae backups diarios, 7 días de point-in-time recovery, y 100 GB storage. Son USD 25/mes.
- **Estado**: abierta. Decisión a tomar cuando Brian confirme integración y empiece a fluir tráfico real.

### D7 — Renombrar `SUPABASE_WEBHOOK_SECRET` → `WEBHOOK_SECRET` en `.env.local.example`. ✅
- **Estado**: **cerrada (22/04 tarde) por commit `6b05fd1`**.

### D8 — Renombrar `openssl rand -base64 32` → `openssl rand -hex 24` en `.env.local.example` línea 21. ✅
- **Estado**: **cerrada (29/04)**. Cambio ejecutado por Claude Code. Pendiente commit de Jona: `git add .env.local.example && git commit -m "fix: D8 WEBHOOK_SECRET generation command"`.

---

## Legacy schema — preguntas para Brian / Santiago (29/04)

Derivadas del análisis de repos `importer` + `metric-api`. Ver `docs/legacy-schema-analysis.md`.

### Q40 — [Brian] ¿Qué valores tiene la tabla `statuses` en producción?
- **Por qué importa**: solo `status_id=1` ('N') está en seeders. Metric usa `9` y `12` sin documentación.
- **Estado**: abierta.

### Q41 — [Brian] ¿`pivot_entities` está activa o deprecada?
- **Por qué importa**: Importer usa FKs directas, Metric usa la pivote. El schema nuevo elige uno.
- **Estado**: abierta.

### Q42 — [Santiago] ¿Metric y el Importer comparten la misma DB MySQL?
- **Contexto**: Metric apunta a `35.193.12.137:3306`, DB `ssb_internacional`.
- **Estado**: abierta.

### Q43 — [Santiago] ¿Existen migrations formales para `expo_vessels`, `dow_port`, `carrier_leg`, `report_301`, `report_315`, `simis`, `prefolder_operation_log`?
- **Por qué importa**: sin schema formal no podemos asumir estructura estable.
- **Estado**: abierta.

### Q44 — [Santiago] ¿El 301 llega a SAP por HTTP o SAP lo lee por batch desde `report_301`?
- **Por qué importa**: define el timing del dashboard entre aceptación SSB y visibilidad SAP.
- **Estado**: abierta.

### Q45 — [Brian / Santiago] ¿Quién popula `simis.nro_despacho` hoy? ¿Manual, n8n, otro?
- **Por qué importa**: define si el dashboard puede confiar en `simis` o necesita persistir el permiso por cuenta propia.
- **Estado**: abierta.

### Q46 — [Operativa / Jona] ¿Cómo llega el BL Number al sistema? No está en el 304.
- **Por qué importa**: el BL es el documento central. Tiene que entrar por otro canal (mail carrier, portal, API Maersk).
- **Estado**: abierta.

### Q47 — [Santiago] ¿Qué otros `status_id` además de 9 y 12 usa Metric? ¿Hay un enum documentado?
- **Estado**: abierta. Derivada de Q40.

### Q48 — [Brian] ¿Hay constraint `UNIQUE` en `orders.purchase_order` en producción?
- **Por qué importa**: el dashboard usa `purchase_order` como join key — necesita garantía de unicidad.
- **Estado**: abierta.

### Q49 — [Santiago] ¿`/prefolder/send` apunta a Interlog test o producción en el deploy actual?
- **Por qué importa**: si ya apunta a prod, el dashboard puede coordinar el flujo de instrucción de exportación.
- **Estado**: abierta.
