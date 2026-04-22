# Preguntas abiertas

**Proyecto**: SSB-IT-RESEARCH
**Última actualización**: 22/04/2026 (cierre tarde)

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
  - **Walking Skeleton**: endpoint receptor deployado el 22/04 en Supabase (`https://cctuowthpnstvdgjuomq.supabase.co/functions/v1/ingest-304`). Verificado con 5 tests iniciales + 11 JSONs reales cargados manualmente el 22/04 tarde.
  - **Pedido a Brian**: mail enviado el 22/04 con URL, headers, contrato mínimo. Esperando confirmación de viabilidad técnica — **responde mañana 23/04 a las 9 AM**.

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
- **Por qué importa**: alimenta las etapas 2, 9 del workflow (tracking). También alimenta el mailing al cliente cuando se dispara documentación post-despacho (etapa 7).
- **Estado**: **parcialmente resuelta (22/04)**.
  - **Lado del mailing al cliente (cerrado empíricamente)**: la regla del mailing sale del 304 mismo, no depende de un evento de Metric. Se compone de: (a) parseo del campo `BusinessInstructionsReferenceNumberNotes` (instrucciones del exportador, fuente principal), (b) entidad `N1` del 304 como fallback universal (confirmado 11/11 en la muestra). Detalle en `business-context.md` sección 7bis. Overrides manuales por cliente configurables desde la web (funcionalidad a implementar en fase 2/3).
  - **Lado del tracking post-despacho (queda abierto)**: Metric **no emite webhooks salientes** cuando recibe o cambia una orden. El único outbound HTTP visible es `requests.post('https://rica.elemica.com/upload/SSB_Prod', ...)` que emite 315 a Elemica (middleware B2B de Dow), triggered desde el frontend, no event-driven.
  - **Consecuencia pendiente**: si el dashboard necesita reaccionar a eventos de tracking (sailing date, arrival, etc.), el camino más probable es **polling o lectura directa de la DB de Metric** (si se negocia acceso read-only) — no webhooks. Alternativa: consumir los 315 directamente de SAP si hay forma, pero requiere coordinación con Dow. Queda abierta para discutir con Brian cuando lleguemos a la etapa 9 del workflow.

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
- **Estado**: **cerrada (22/04)**. Se descargaron 11 JSONs reales del módulo Logs de JSON. Schema documentado en `research.md` sección 7. Validación empírica adicional completada el 22/04 tarde (sección 7.13). Quedan 10 sub-preguntas de detalle (Q15-Q24) derivadas del análisis.

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
- **Estado**: **parcialmente cubierta (22/04)**. Flujo documentado en `business-context.md` sección 7 (fases 1-5). Falta validación formal con Santiago y documentales para confirmar excepciones y detalles.

### Q13 — ¿Cuáles son las excepciones recurrentes al flujo estándar?
- **Quién responde**: equipo de documentación.
- **Por qué importa**: modelar excepciones desde el día uno evita rediseños.
- **Estado**: abierta.

### Q14 — ¿Qué documentos acompañan una orden de exportación tipo (factura, CRT, certificado de origen, packing list, BL) y cuál es el ciclo de vida de cada uno?
- **Quién responde**: equipo de documentación.
- **Por qué importa**: define la etapa 7 del workflow (envío al cliente).
- **Estado**: **parcialmente cubierta (22/04)**. Documentos listados en `business-context.md` sección 6. Falta detalle de ciclo de vida por documento y validación con documentales.

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
- **Implicancia para el dashboard**: el destinatario del mailing en STO puede resolverse con tabla maestra (cliente STO → forwarder destino). En trade requiere parseo IA del campo `BusinessInstructionsReferenceNumberNotes`. Documentar en `business-context.md` sección 4.3.

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
- **Contexto**: es el pedido formal enviado por mail el 22/04. Tiene OK de Mariano.
- **Por qué importa**: si Brian dice que no, hay que volver a evaluar alternativas (SFTP, cola intermedia, modificar SAP). Si dice que sí, se coordina implementación.
- **Estado**: **abierta — responde mañana 23/04 a las 9 AM**. Bloquea siguiente milestone (conectar el endpoint del Walking Skeleton con datos reales de producción).

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

## Derivadas del análisis empírico de los 11 JSONs (22/04 tarde)

### Q28 — ¿Qué países/clientes/tipos de orden exigen COO físico (courier/correo postal) y no solo digital?
- **Quién responde**: equipo de documentación (2 personas).
- **Contexto**: durante la sesión del 22/04 Jona confirmó que el ~95% de la documentación al cliente se envía electrónicamente. El caso único que requiere envío físico es cuando el cliente necesita el **Certificado de Origen (COO) físico** (con firma y sello reales de la Cámara Argentina de Comercio). Son pocos y puntuales.
- **Por qué importa**: el dashboard necesita un flag derivado `requiere_envio_fisico` por orden. Sin una regla clara (países, clientes, tipo de producto), ese flag tiene que ser manual para cada orden. Con una regla (ej: "COO físico obligatorio para cliente X, o para país destino Y"), se puede derivar automáticamente.
- **Opciones de regla**:
  - Lista cerrada de clientes que siempre requieren físico.
  - Lista de países destino cuyo régimen aduanero lo exige.
  - Marcar manualmente por orden (fallback si no hay regla estable).
- **Estado**: abierta. Tarea operativa propia + consulta a documentales.

### Q29 — ¿Existe hoy en SSB una tabla maestra que mapee `cliente_STO → despachante_destino`?
- **Quién responde**: Santiago / equipo documental / líder de equipo.
- **Contexto**: validación empírica del 22/04 tarde confirmó que en STO (prefijo `4010...`) el notify del 304 es casi siempre un despachante conocido del lado destino (Comissaria Pibernat para Brasil, BDP International para Chile, etc.). Si existe una tabla maestra con este mapeo, el mailing STO se automatiza sin IA en fase 1/2 (simple lookup por cliente_STO).
- **Por qué importa**: si existe la tabla, el trabajo de automatización del mailing STO es **simple lookup**. Si no existe, hay que armarla con los datos históricos + validación. Cambia el timing de cuándo podemos automatizar mailing STO.
- **Estado**: abierta.

---

## Decisiones pendientes de Jona (no requieren tercero)

### D1 — ¿Borrar `.venv/` (ya hecho) cierra la posibilidad de usar Python? ¿O puede volver un microservicio Python aparte?
- **Contexto**: stack actual no usa Python. Si aparece necesidad (scraping pesado, parsing de PDFs), puede levantarse un microservicio separado (Fly.io / Railway), no adentro de Supabase.
- **Estado**: decisión diferida. Se evalúa si aparece el caso de uso.

### D2 — ¿Push del commit a GitHub ahora o después? ✅
- **Estado**: **cerrada (22/04)**. Push completado. Commits en remoto: `9529b5b` (cleanup), `4aedd4a` (Walking Skeleton), `7078467` (docs del Walking Skeleton), `33168a2` (5 .md vivos), `292cfca` (normalización permisos).

### D3 — ¿Manual de configuración de VS Code se genera ahora o después de la primera sesión de coding real?
- **Estado**: abierta. No urgente.

### D4 — ¿Co-authorship "Claude Opus 4.7" en commits sí o no?
- **Estado**: abierta.

### D5 — ¿`business-context.md` va como 5° archivo vivo del proyecto SSB-IT-RESEARCH? ✅
- **Contexto**: Jona tiene un business context base que usa en otros proyectos. Quedó propuesto combinarlo con lo nuevo del dashboard en un archivo propio del proyecto.
- **Estado**: **cerrada (22/04)**. Confirmado. `business-context.md` es archivo vivo del proyecto. Adicionalmente, desde el 22/04 se sumaron `walking-skeleton.md` (6°) y `sesion-actual.md` (7°, handoff efímero) como archivos vivos — ver `plan.md` sección 6.

### D6 — ¿Mantener plan free de Supabase o upgrade a Pro cuando Brian conecte el endpoint?
- **Contexto**: el Walking Skeleton está en plan free (500 MB DB, 2 GB transfer). A 150-200 órdenes/mes × ~15 KB ≈ 30 KB/mes, el free alcanza por años. Pero Pro trae backups diarios, 7 días de point-in-time recovery, y 100 GB storage. Son USD 25/mes.
- **Estado**: abierta. Decisión a tomar cuando Brian confirme integración y empiece a fluir tráfico real.

### D7 — ¿Alinear nombre de variable `SUPABASE_WEBHOOK_SECRET` → `WEBHOOK_SECRET` en `.env.local.example`?
- **Contexto**: el script del paso 2 del 22/04 tarde (carga de 11 JSONs) descubrió que el `.env.local` usa `WEBHOOK_SECRET` (sin prefijo), pero varios prompts antiguos y docs mencionan `SUPABASE_WEBHOOK_SECRET`. Claude Code usó el correcto por inferencia, pero el `.env.local.example` sigue desalineado.
- **Opciones**: (a) renombrar en `.env.local.example` para reflejar el uso real, (b) renombrar en `.env.local` para que matchee el prefijo anterior.
- **Recomendación**: opción (a) — usar `WEBHOOK_SECRET` sin prefijo. Más corto y consistente con la única aplicación que lo usa.
- **Estado**: abierta, baja prioridad. Tarea de 2 minutos para próxima sesión.
