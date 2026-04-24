# Research APIs de navieras — Maersk, Hapag-Lloyd, Log-In

**Proyecto**: SSB-IT-RESEARCH
**Autor**: Research técnico ejecutado por Claude (research tool), consolidación con Jona.
**Fecha**: 24/04/2026
**Contexto**: R1 del MVP incluye generación de Shipping Instruction (SI / "declaración de embarque") + control del BL draft. Este archivo evalúa qué capacidades de API ofrece cada uno de los 3 carriers principales para automatizar ese flujo.
**Estado**: research factual completo. Las 5 decisiones de diseño quedan abiertas en `preguntas.md` Q38 y se analizan en la próxima sesión.

---

## 0. BLUF

Los 3 carriers tienen asimetría grande en madurez técnica:

- **Maersk** tiene API productiva pública (OAuth2 + DCSA Bill of Lading 3.0). Es el único donde el dashboard puede ser end-to-end sin RPA. Bloqueante: Customer Code vinculado a cuenta A136.
- **Hapag-Lloyd** tiene Developer Portal pero **el catálogo público no incluye submit de SI**. Vía oficial digital: eaSI (PDF/web) o INTTRA bilateral. Dado el bajo volumen en SSB, INTTRA queda como plan B.
- **Log-In** no tiene developer portal, no está en DCSA, no hay APIs públicas. Único canal digital: portal Log-Aí web. Respuesta oficial pendiente — mail enviado 24/04.

Implicancia estratégica: R1 tiene que tolerar **tres niveles de automatización distintos** por carrier desde el día uno. Diseñarlo como "todas las navieras son APIs" es un error; diseñarlo como "todo manual con carga asistida" subutiliza lo que sí existe en Maersk.

---

## 1. Matriz comparativa (estado a abril 2026)

| Capacidad | Maersk | Hapag-Lloyd | Log-In |
|---|---|---|---|
| Submit Shipping Instructions vía API | **Sí pública** (Carrier Bill of Lading [DCSA] + INTTRA) | **No en catálogo público** (eaSI por mail/web; EDI bilateral sí) | **No** (solo UI Log-Aí) |
| Submit Booking vía API | **Sí pública** (Ocean Booking v2 [DCSA]) | **No público** (bilateral / Coneksion / INTTRA) | **No** |
| Obtener Draft BL / Verify Copy | **Sí** (suscripción de notificación con PDF; API Transport Document DCSA) | **No API pública**; aprobación vía portal "BL Draft Approval" | **No** (descarga desde Log-Aí UI) |
| Obtener BL final / Original | **Sí** (web, notificación, e-BL vía IQAX/eBL partners) | Portal + e-BL (IQAX / WaveBL); no API pública | **No** (Log-Aí UI) |
| Track & Trace | **Sí** (Track & Trace Plus + Maersk Visibility Studio webhooks DCSA) | **Sí pública** (DCSA T&T 2.2, beta público) | Tracking solo en UI |
| Schedules | **Sí** (Ocean Commercial Schedules [DCSA]) | **Sí** (Commercial Schedules DCSA + Routing/Pricing) | **No** |
| Webhooks / push events | **Sí** (Ocean Booking Status Webhook, Visibility Studio) | **No** en T&T hoy — solo polling | **No** |
| Miembro DCSA / standards | **Sí** (fundador) | **Sí** (fundador) | **No** |
| Canal INTTRA/e2open | **Sí productivo** | **Sí productivo** | **No evidenciado** |
| EDI directo (IFTMIN/IFTMBF) | **Sí** (D99B documentado en developer portal) | **Sí bilateral** | **No documentado** |

Leyenda: "Sí pública" = documentada en developer portal con onboarding self-service; "Sí bilateral" = existe pero requiere contrato/IT setup individual; "No" = no existe o no hay evidencia; "Desconocido" = no se encontró documentación pública concluyente.

---

## 2. Maersk

### 2.1 Developer Portal — catálogo de APIs

Maersk publica su catálogo en [developer.maersk.com/api-catalogue](https://developer.maersk.com/api-catalogue). Requiere login para ver specs completas y endpoints en vivo; sin login solo se ven mock services.

Productos detectados en URLs públicas del catálogo, relevantes para R1 y R4:

- **Ocean Booking v2 [DCSA]** — [developer.maersk.com/api-catalogue/EDP%20Booking](https://developer.maersk.com/api-catalogue/EDP%20Booking)
- **Ocean Booking Status Webhook [DCSA]** — [developer.maersk.com/api-catalogue/ocean-booking-status-webhook](https://developer.maersk.com/api-catalogue/ocean-booking-status-webhook)
- **Ocean – Carrier Bill of Lading [DCSA]** — [developer.maersk.com/api-catalogue/dcsa-bill-of-lading](https://developer.maersk.com/api-catalogue/dcsa-bill-of-lading) — cubre Shipping Instructions + Transport Document del estándar DCSA BL 3.0.
- **Ocean – Commercial Schedules [DCSA]** — [developer.maersk.com/api-catalogue/ocean-commercial-schedules](https://developer.maersk.com/api-catalogue/ocean-commercial-schedules)
- **Track and Trace Plus** — [developer.maersk.com/api-catalogue/Track%20and%20Trace%20Plus](https://developer.maersk.com/api-catalogue/Track%20and%20Trace%20Plus)
- **Maersk Visibility Studio** — [developer.maersk.com/api-catalogue/maersk-visibility-studio](https://developer.maersk.com/api-catalogue/maersk-visibility-studio)
- **VGM (Verified Gross Mass)** — [developer.maersk.com/api-catalogue/VGM/Learn-more](https://developer.maersk.com/api-catalogue/VGM/Learn-more)
- **Import Demurrage & Detention API** — [developer.maersk.com/api-catalogue/Import%20Demurrage%20and%20Detention](https://developer.maersk.com/api-catalogue/Import%20Demurrage%20and%20Detention)
- **Ocean Invoice Summary** — [developer.maersk.com/api-catalogue/Ocean%20Invoices](https://developer.maersk.com/api-catalogue/Ocean%20Invoices)

Nota: el dominio `delivers.maersk.com/developer` corresponde a Maersk en EE.UU. para LTL doméstico (Pilot/Maersk E-Commerce); no aplica al flujo ocean de SSB.

### 2.2 Autenticación, formato y límites

- **Auth**: OAuth 2.0 client credentials flow. Documentación en [developer.maersk.com/support/authorisation](https://developer.maersk.com/support/authorisation). Algunos endpoints (p. ej. Offers API) también aceptan `Consumer-key` header directo.
- **Formato**: REST + JSON, conforme DCSA.
- **Rate limits**: configurados por consumer key a nivel de cada API Product; exceso devuelve HTTP 429 ("spike arrest"). Máximo 10 apps por developer, hasta 10 API keys por app.
- **Customer APIs**: requieren al menos 1 Customer Code de Maersk asociado al consumer key. Hasta 5 customer codes por key por self-service; más requiere escalar por contacto.

### 2.3 Onboarding — pasos concretos

1. Registrarse en [accounts.maersk.com/developer-maeu/user/register](https://accounts.maersk.com/developer-maeu/user/register) con email corporativo (los emails gratuitos no pueden consumir Customer APIs).
2. Crear una app en el portal.
3. Obtener Consumer Keys (API credentials).
4. Suscribir productos de API a la app.
5. Ingresar al menos 1 Maersk Customer Code válido — para SSB sería el código de cuenta A136 de PBB/Dow; si no se encuentra, se pide a la oficina local Maersk Argentina.

Particularidades:
- Algunas APIs comerciales (Spot, Offers) tienen onboarding manual restringido: hay que escribir a [spotapisupport@maersk.com](mailto:spotapisupport@maersk.com) y pasar aprobación.
- El uso indebido congela la API key.

### 2.4 Compatibilidad DCSA BL 3.0 / Booking 2.0

- Maersk es miembro fundador de DCSA.
- DCSA finalizó Booking 2.0 y Bill of Lading 3.0 en febrero 2025. BL 3.0 incluye módulos de Shipping Instructions, Transport Document, eBL Issuance y eBL Surrender, y el nuevo "lightweight notifications pattern" para eventos.
- Los productos Maersk con sufijo `[DCSA]` son implementaciones directas de estos estándares.
- El spec OAS base se puede descargar de [github.com/dcsaorg/DCSA-OpenAPI](https://github.com/dcsaorg/DCSA-OpenAPI) y de SwaggerHub; útil para prototipar contra un mock antes de obtener Customer Code.

### 2.5 INTTRA / e2open como alternativa

INTTRA (propiedad de e2open desde 2018) fue co-fundada por Maersk, CMA-CGM, Hapag-Lloyd, MSC y Hamburg Süd. Es un canal productivo estándar para SI hacia Maersk vía EDIFACT IFTMINb. Dato oficial Maersk (marzo 2025): "For customers submitting shipping instructions via INTTRA/EDI, the process remains unchanged" — confirma que SI vía INTTRA entra sin intervención manual. Onboarding a INTTRA es separado (cuenta e2open + activación carrier).

### 2.6 Maersk Visibility Studio

Documentación técnica en [testapidocapp.westeurope.dev.maersk.io](https://testapidocapp.westeurope.dev.maersk.io/):

- REST principles, JSON.
- Subscription endpoint que recibe una tracking request con `bookingNumber` / `billOfLadingNumber` / `containerNumber` + SCAC. Retorna `201` en alta, `409` si ya existe subscription con los mismos identificadores.
- Publica webhooks outbound al endpoint del cliente en formato DCSA (con "wrapper" Maersk que agrega reference info).
- Onboarding específico: mail a [MVSAPISupport@maersk.com](mailto:MVSAPISupport@maersk.com) con URL de webhook de prod + staging, Customer Code, cURL sample y credenciales (OAuth 2.0 o Basic Auth). El endpoint del cliente debe devolver 200/202 a un POST válido.

### 2.7 Descarga de Draft BL / Verify Copy / BL final

- **API**: Ocean Carrier Bill of Lading [DCSA] cubre el ciclo Shipping Instruction → Transport Document (draft y final) del estándar BL 3.0.
- **Web / notificación**: al enviar SI por la "New Shipping Instruction Experience", el Verify Copy se emite automáticamente y puede llegar por mail como PDF adjunto si el usuario se suscribe a la notificación "Documentation (Bill of Lading)".
- **Cambio operacional crítico**: desde 15-sept-2025 Maersk implementó "Hardstop on requests for Draft BL (verify) copies & Arrival Notice" — ya no responde pedidos manuales por mail; obliga a usar notificación o descarga desde el sitio. Esto refuerza el caso de automatizar vía notificación/API.

### 2.8 EDI directo

- Existe. Maersk publica el MIG (Message Implementation Guide) de EDIFACT **IFTMIN D99B** para Shipping Instructions (Ocean) en su developer portal.
- Canales tradicionales: SFTP, AS2, VAN. El equivalente ANSI X12 es **EDI 304** (SI) — el mismo que SSB recibe desde SAP. Dato no encontrado: volumen mínimo oficial para aprobar onboarding EDI; inferencia razonable: Maersk acepta EDI bilateral para cuentas con volumen sostenido, pero recomienda API como primera opción.

### 2.9 Implementaciones reales de terceros

- **Microsoft Power Automate**: conector "Maersk (Independent Publisher)" publicado por Dan Romano (no oficial), expone schedules, vessels, locations, shipment deadlines — muestra que la API de Schedules y Location se puede consumir sin fricción.
- **Nordic APIs**: case study 2020 de Maersk describiendo su migración de EDI 315 a APIs JSON.
- **Coneksion / Youredi (RAPIDS Ocean)**: middleware productivo que encapsula el stack de Maersk (bookings + T&T) para terceros que no quieren gestionar credenciales.
- **JSONCargo**, **ShipsGo**, **Beacon**: agregadores que ya consumen Maersk T&T.

### 2.10 Implicancia para R1 (Maersk)

- Podés diseñar R1 con llamadas REST nativas contra Ocean Booking v2 + Carrier Bill of Lading DCSA + suscribir webhook de Ocean Booking Status + Visibility Studio. Es el único carrier donde el dashboard puede ser end-to-end sin RPA.
- El mensaje SAP 304 que recibís del cliente mapea casi 1:1 al payload DCSA Shipping Instructions — requiere capa de transformación pero no reingeniería.
- Para arrancar rápido (semanas), INTTRA es válido como fallback; para arrancar más rápido todavía sin customer code disponible, prototipar contra mocks DCSA de SwaggerHub.

---

## 3. Hapag-Lloyd

### 3.1 Developer Portal — catálogo

Portal oficial: [api-portal.hlag.com](https://api-portal.hlag.com/). Documentación: [doc.api-portal.hlag.com](https://doc.api-portal.hlag.com/).

Lista de APIs en el portal público:

- **Quick Quotes / Quick Quotes Spot API** — precios y cotizaciones.
- **Specifications API** — rutas, tipos de contenedor, tipos de carga cubiertos.
- **Routing API** — opciones end-to-end pre-booking.
- **Track & Trace API (DCSA 2.2)** — eventos de shipment/equipment/transport. Hoy BETA pública.
- **Live Position API** — tracking detallado con ETA por contenedor.
- **Reefer Monitoring API** — data live de reefers.
- **Commercial Schedules API (DCSA)** — expuesta hoy en producción vía partner Coneksion; también directa en el portal.

**Hallazgo crítico para R1**: No hay en el catálogo público una API de "Shipping Instructions submit" ni una de "Bill of Lading / Transport Document". Los searches repetidos contra dominios hlag.com y dcsa.org no devuelven evidencia de tal producto en el portal público a abril 2026. Inferencia razonable: existe el product roadmap, pero la implementación pública todavía no está expuesta o está en bilateral.

### 3.2 Track & Trace — detalles técnicos

- Endpoint base: `https://api.hlag.com/hlag/external/v2/events/`
- Métodos GET con query params: `?equipmentReference=HLCU1234567`, `?carrierBookingReference=912345678`, `?transportDocumentReference=HLCUDE1234567890`.
- Auth: OAuth 2.0 Authorization Code.
- Formato: REST + JSON conforme DCSA OpenAPI 3.0 2.2.4.
- **Polling, no push**: respuesta oficial en el FAQ del portal: "Do you offer a notification service for the DCSA Track & Trace events that pushes data to my system? Not yet".
- Estado: BETA pública. Live desde 25-enero-2024.

### 3.3 Onboarding

1. Registrarse en [api-portal.hlag.com](https://api-portal.hlag.com/) (name, company, address, phone, email + verification code).
2. Crear una aplicación tipo "Authorization Code" (Web Application o SPA). **La aprobación puede tardar semanas** — es manual.
3. Cuando aprueban, aparece `Client-ID`. Generar `Client-Secret` con "Assign client secret" (se muestra una sola vez; guardar seguro).
4. Crear subscription al producto de API elegido + usage plan / rate limit. También pasa por review manual de Hapag-Lloyd.
5. Consumir con credenciales OAuth2.

Hay opción comercial paga para integración asistida con el equipo IT de Hapag-Lloyd (ej. USD 5.000 para Live Position API con setup custom).

### 3.4 DCSA BL 3.0 / Booking 2.0 — estado

- Hapag-Lloyd es miembro fundador DCSA.
- DCSA BL 3.0 y Booking 2.0 están finalizados en febrero-2025 pero la **adopción operativa pública por Hapag-Lloyd está en T&T 2.2 + Commercial Schedules**, no en Booking ni en Bill of Lading.
- Booking API de Hapag-Lloyd: productiva en canal bilateral (caso Coneksion) pero no listada como producto en el portal público.
- Shipping Instructions / Transport Document DCSA: no encontrado en el portal público.

### 3.5 eaSI (electronic advanced Shipping Instructions)

- Dos variantes: **eaSI online** (formulario web dentro del Online Business Suite) y **eaSI mail** (PDF editable pre-rellenado que se baja/envía por mail).
- No tiene variante con API pública documentada.
- Desde enero-2025 Hapag-Lloyd endureció requisitos de campos mínimos y rechazará SIs incompletas.
- Draft BL se gestiona con la herramienta **BL Draft Approval** dentro de Hapag-Lloyd Navigator (aprobación/corrección del draft en web).

### 3.6 eBL vía IQAX / WaveBL

- Hapag-Lloyd emite eBL en dos plataformas socias: **IQAX eBL** (sobre GSBN blockchain) y **WaveBL**. Comprometido a 100% eBL para 2030.
- Para emitir eBL, el cliente debe estar registrado en IQAX o WaveBL y mencionar eBL + plataforma en la SI.
- API para descarga del eBL: IQAX y WaveBL son plataformas con sus propias APIs a clientes, pero no hay una API Hapag-Lloyd directa para "get eBL" sin pasar por esas plataformas.

### 3.7 Canal INTTRA

Productivo. INTTRA acepta bookings + SI hacia Hapag-Lloyd desde hace años. Es la vía estándar pre-API para bulk SI submission.

### 3.8 EDI bilateral

Hapag-Lloyd confirma textualmente: "Carriers like we as Hapag-Lloyd offer bilateral EDI setups that automate the flow of information for the entire shipping process". Formatos: EDIFACT IFTMBF / IFTMIN / IFTSTA estándar. Canal: bilateral, normalmente para clientes enterprise con volumen.

### 3.9 Implicancia para R1 (Hapag-Lloyd)

- **No podés** armar submit de SI por API pública hoy. Las opciones prácticas son: (a) INTTRA/e2open (productiva, bulk), (b) EDI bilateral si el volumen lo justifica, (c) automatización web (RPA) sobre eaSI online / Hapag-Lloyd Navigator, (d) modo asistido (dashboard muestra package pre-llenado, documental copy-paste en web).
- Para obtener draft BL, también no hay API: queda la aprobación vía BL Draft Approval del Navigator (manual o RPA) o suscripción a email notifications con PDF.
- Lo único que sí podés integrar nativo ya es T&T DCSA + Schedules + Quick Quotes, pero eso pertenece a R4 (tracking) y R2 (pricing), no a R1.
- **Decisión estratégica SSB** (23/04): Hapag-Lloyd es 3er volumen (bajo) — INTTRA queda como **plan B**. R1 puede arrancar con Hapag en modo asistido sin perder mucho valor. Si Hapag sube volumen o publica SI API, se reevalúa.

---

## 4. Log-In Logística Intermodal

### 4.1 Developer portal / API pública

**No existe.** Todos los canales consultados dan negativo:

- Sitio principal [loginlogistica.com.br](https://www.loginlogistica.com.br/en/) no lista developer portal, API reference, ni OpenAPI specs.
- Subdominios activos detectados: [logai.loginlogistica.com.br](https://logai.loginlogistica.com.br) (plataforma cliente de navegación) y [logaitvv.loginlogistica.com.br](https://logaitvv.loginlogistica.com.br) (terminal Vila Velha). Ambos son UIs web con login/password, no devuelven documentación de API cuando se los fetchea.
- LinkedIn, Gupy, Facebook, Instagram, YouTube: no publican referencia técnica.
- GitHub: no hay repos oficiales de Log-In ni SDKs comunitarios detectados.
- DCSA API Portal no lista a Log-In — confirmación de que Log-In **no es miembro DCSA** (DCSA actualmente tiene 10 miembros: MSC, Maersk, CMA CGM, Hapag-Lloyd, ONE, Evergreen, Yang Ming, HMM, ZIM y PIL).

### 4.2 Log-Aí — qué ofrece

Dato oficial (prensa Log-In + Mercado & Consumo, feb-2021):

- Lanzada en 2021, dos versiones: navegación (clientes de cabotagem/Mercosul) y TVV (terminal).
- Funcionalidades: booking online, tracking de carga, envío y descarga de documentación.
- Acceso: web tradicional, login + password. No se menciona API en ninguna comunicación oficial de Log-In.

### 4.3 Integración con hubs (INTTRA, CargoSmart, portMaps)

- **No encontrado** en búsquedas específicas. Log-In no aparece en los listados de carriers soportados por INTTRA (fundadores: CMA-CGM, Hamburg Süd, Hapag-Lloyd, Maersk Line, MSC, UASC).
- CargoSmart, PortConnect, Beacon: no hay evidencia de integración directa, aunque Log-In sí aparece en Routescanner, pero eso es schedule aggregation de solo lectura, no booking/SI.

### 4.4 DCSA

No es miembro. Esperable ya que DCSA se enfoca en carriers deep-sea globales. Inferencia razonable: en el corto plazo no va a adoptar DCSA BL 3.0 / Booking 2.0.

### 4.5 Alternativas para automatizar Log-In

Dato no encontrado (no hay confirmación oficial):
- EDI bilateral para clientes grandes: probable pero no documentado públicamente.
- Integración custom SAP→Log-In para cuentas enterprise: no se encontró prensa, case study ni testimonio.

Inferencia razonable para R1: el camino realista es **RPA o headless browser automation sobre Log-Aí**, o mantener flujo por email humano. Log-In tiene hoy relación accionaria con MSC/SAS Shipping Agencies (desde 2022) — a futuro podría heredar estándares MSC, pero no hay anuncio público.

**Respuesta oficial pendiente**: Jona envió mail el 24/04 a Log-In preguntando por API directa, EDI, hub alternativo. Sin respuesta al 24/04 — marcada como Q34 en `preguntas.md`.

### 4.6 Comunidad de developers

No se encontraron foros, grupos de Telegram/WhatsApp, Stack Overflow tags, ni repos comunitarios que mencionen integración con Log-Aí.

### 4.7 Competidores en cabotagem brasileño (contexto)

- **Aliança Navegação e Logística** (100% A.P. Moller-Maersk): tiene el "Portal Cabotagem" web, pero al estar en el grupo Maersk **usa la misma stack de APIs Maersk** para los clientes que estén registrados con customer code. Desde Uruguay/Argentina a Brasil, Maersk deriva cargas a la bandera Aliança. Implicación: parte de los flujos que hoy se enrutan por Log-In podrían atenderse vía Maersk→Aliança con el mismo stack técnico API.
- **Mercosul Line** (CMA CGM): tiene portal CMA CGM ([api-portal.cma-cgm.com](https://api-portal.cma-cgm.com/products/visibility)) que expone DCSA T&T 2.2. CMA CGM también expone Booking y otras DCSA APIs — cobertura similar a Maersk aunque más limitada.
- **Grimaldi Lines**: no tiene developer portal público detectado; enfoque RoRo/Mediterráneo, no cabotagem Brasil-Argentina en contenedores.
- **Norsul**: dato no encontrado.

### 4.8 Implicancia para R1 (Log-In)

- Asumí que Log-In se automatiza **afuera del flujo API** hasta que llegue la respuesta oficial. El dashboard debe tratarlo como "carga asistida": generar el formulario SI pre-rellenado desde SAP y o bien (a) que el usuario lo cargue en Log-Aí a mano, (b) RPA sobre Log-Aí (Selenium/Playwright) si el volumen justifica, o (c) email automatizado a la cuenta de customer service con PDF estructurado.
- Como Log-In es el carrier principal por volumen de PBB, conviene abrir conversación bilateral con Log-In IT pidiendo cualquiera de: endpoint REST privado, EDI IFTMIN, o un flujo CSV/XML por SFTP. El mail enviado el 24/04 hace exactamente eso.
- Diseñar R1 con extensibilidad: el módulo de "envío de SI" debe tener un adapter interface donde el backend elige entre {API nativa, INTTRA, EDI, Web RPA, Email} por carrier — sin hardcodear que todos sean iguales.

---

## 5. Decisiones de diseño que este research habilita

Las 5 decisiones quedan **enumeradas, no tomadas**. Se analizan al inicio de la próxima sesión con cabeza fresca (ver `preguntas.md` Q38).

### Decisión 1 — Arquitectura de adapters por carrier, no monolito

Tres adapters mínimos con interface común:

```
MaerskAdapter      → REST + OAuth2 client credentials + webhook receiver (Maersk API nativa)
HapagLloydAdapter  → Modo asistido (dashboard muestra package pre-llenado, documental copy-paste en web)
                    INTTRA como plan B solo si Hapag sube volumen
LogInAdapter       → Depende de respuesta Log-In (API / EDI / SFTP / RPA / Email estructurado)
```

Interface común:
- `submitSI(booking, cargo) → siReference`
- `onDraftBLReady(siReference) → Document`

El resto del sistema (dashboard, orquestador, DB) no sabe cómo se envía cada SI internamente. Desacopla al producto de la heterogeneidad de carriers.

### Decisión 2 — INTTRA: plan B, no plan A

Contratar INTTRA/e2open resolvería Hapag-Lloyd y daría canal redundante para Maersk. **No resolvería Log-In** (Log-In no está en INTTRA).

Dado que Hapag es bajo volumen, queda como **plan B** — a contratar solo si (a) Hapag sube volumen, (b) aparece un segundo cliente SSB que opera con Hapag/otros carriers INTTRA-conectados, o (c) el research revela que Hapag publica su SI API pública.

### Decisión 3 — Orden de arranque de R1

Paradoja: Log-In es mayor volumen pero menor madurez técnica; Maersk es menor volumen pero mayor madurez.

Propuesta:
- **Eje técnico** → arrancar por Maersk. API madura, feedback rápido, menor riesgo, sirve de referencia para el modelo de datos DCSA.
- **Eje de proceso/UX** → arrancar por Log-In. Ahí está el volumen, ahí está el dolor manual. Mientras Claude Code integra Maersk, el documental ya usa el dashboard en modo asistido con Log-In.

Anti-patrón a evitar: arrancar los 3 carriers en paralelo.

### Decisión 4 — DCSA BL 3.0 como contrato interno (canonical model)

Adoptar el modelo de datos DCSA como el canonical interno del producto. Traducción 304 → DCSA una vez, en el borde de la ingesta.

Ventajas:
- Maersk ya habla DCSA nativo.
- Hapag publicará DCSA BL 3.0 en algún momento — el día que pase, la integración es menor.
- Para Log-In sirve como contrato estable aunque nunca adopte DCSA.
- Todas las tablas, reportes, dashboards, releases siguientes (R2, R3, R4) se construyen sobre un único contrato de datos.

Costo: mayor el día 1 (hay que mapear 304 → DCSA). Menor todos los días siguientes.

Repos de referencia:
- [github.com/dcsaorg/DCSA-OpenAPI](https://github.com/dcsaorg/DCSA-OpenAPI)
- [github.com/dcsaorg/DCSA-EBL](https://github.com/dcsaorg/DCSA-EBL)

### Decisión 5 — Orden de onboarding Maersk

Secuencia concreta:

1. **Hoy (10 min)**: registrarse en [accounts.maersk.com/developer-maeu/user/register](https://accounts.maersk.com/developer-maeu/user/register) con mail @ssbint.com.
2. **Hoy (5 min)**: crear una app y generar Consumer Key + Secret. Guardar en `.env` local, no en git.
3. **Hoy (15 min)**: suscribir la app a los 6 productos mínimos para R1 y R4:
   - Ocean Booking v2 [DCSA]
   - Ocean Booking Status Webhook [DCSA]
   - Carrier Bill of Lading [DCSA] ← cubre SI + Draft BL + BL final
   - Ocean Commercial Schedules [DCSA]
   - Track and Trace Plus
   - Maersk Visibility Studio
4. **Esta semana — oficina local Maersk AR**: pedir Customer Code vinculado a cuenta A136 PBBPolisur/Dow. Con copia al comercial de SSB que tenga relación con Maersk local. Sin esto, las APIs responden 403 en lo que toca datos reales. **Bloqueante de R1 Maersk**.
5. **Esta semana — [MVSAPISupport@maersk.com](mailto:MVSAPISupport@maersk.com)**: pedir acceso a Visibility Studio. Puede mandarse en paralelo sin Customer Code.
6. **Mientras espera Customer Code**: Claude Code desarrolla contra mock services del portal + schemas DCSA de GitHub. No traba nada.

Testing de validación cuando llegue Customer Code: primer request real contra Commercial Schedules — producto de baja fricción, devuelve datos sin efectos laterales, confirma que el flow OAuth2 + header con Customer Code funciona end-to-end. Recién después pasar a Booking.

---

## 6. Referencias clave

**Maersk**: [Developer Portal catálogo](https://developer.maersk.com/api-catalogue) · [FAQ](https://developer.maersk.com/support/faqs) · [OAuth guide](https://developer.maersk.com/support/authorisation) · [Visibility Studio docs](https://testapidocapp.westeurope.dev.maersk.io/) · [How to start with API](https://www.maersk.com/support/faqs/how-to-start-with-api) · [Hardstop Draft BL sept-2025](https://www.maersk.com/news/articles/2025/07/17/hardstop-on-requests-for-draft-bl-verify-copies-arrival-notice)

**Hapag-Lloyd**: [API Portal](https://api-portal.hlag.com/) · [Developer docs](https://doc.api-portal.hlag.com/) · [Getting Started](https://doc.api-portal.hlag.com/01.basic-knowledge/getting-started.html) · [T&T API 2.2.4](https://api-portal.hlag.com/products/portfolio/events-tracing-for-web-api-product-d73213?version=2) · [eaSI](https://www.hapag-lloyd.com/en/online-business/documentation/shipping-instructions/shipping-instructions.html) · [eBL IQAX/WaveBL](https://www.hapag-lloyd.com/en/online-business/documentation/electronic-bill-of-lading.html)

**Log-In**: [Sitio en inglés](https://www.loginlogistica.com.br/en/) · [Log-Aí plataforma](https://logai.loginlogistica.com.br) · [Documentación para Embarque](https://www.loginlogistica.com.br/documentacao)

**DCSA**: [Standards home](https://dcsa.org/standards) · [Booking 2.0 docs](https://dcsa.org/standards/booking/documentation-booking-2) · [Bill of Lading 3.0 docs](https://dcsa.org/standards/bill-of-lading/documentation-bill-of-lading-3) · [Track & Trace 2.2](https://dcsa.org/standards/track-and-trace/standard-documentation-track-and-trace) · [API Portal de carriers](https://dcsa.org/api-portal/) · [Final versions 2025](https://dcsa.org/newsroom/final-versions-of-booking-bill-of-lading-standards-released) · [GitHub OpenAPI](https://github.com/dcsaorg/DCSA-OpenAPI) · [GitHub EBL reference impl](https://github.com/dcsaorg/DCSA-EBL)

**Otros**: [INTTRA/e2open](https://www.inttra.com/shipper-solutions/ocean_trade_platform/) · [Aliança (Maersk Brasil)](https://www.alianca.com.br/home-en) · [CMA CGM API Portal (Mercosul Line)](https://api-portal.cma-cgm.com/)

---

## 7. Límites del research

Todos los links a páginas detrás del login (detalle de endpoints Maersk, specs YAML completas Hapag-Lloyd, versiones internas de Log-Aí) no fueron accesibles sin credenciales. Los datos técnicos profundos de request/response concretos van a surgir del onboarding real, no del research. Lo que sí quedó confirmado con fuentes oficiales: la existencia, el estado (producción/beta), los endpoints base de cada producto, las vías alternativas productivas.

---

*Este archivo se mantiene como referencia técnica. Se actualiza solo si aparece información nueva de los carriers (ej. Log-In publica API, Hapag expone SI API, Maersk cambia estructura del portal). No va al proyecto Claude.ai — vive solo en el repo WSL.*
