# BUSINESS_CONTEXT.md — SSB International × PBB Polisur (Dow)

## Documento Maestro de Contexto Operativo

Este documento describe el proceso completo de operaciones de comercio exterior que gestiona SSB International para PBB Polisur (Dow). Sirve como fuente de verdad para entender el negocio, los actores, los sistemas, los documentos, los flujos de trabajo y las oportunidades de automatización.

> **Autor:** Generado colaborativamente entre el supervisor de operaciones y Claude.
> **Uso:** Contexto base para cualquier desarrollo, automatización o mejora del proceso operativo. Debe mantenerse actualizado a medida que el proceso evolucione.

---

## 1. LAS EMPRESAS

### 1.1 SSB International
- **Rol:** Empresa de comercio exterior que gestiona la operación completa de exportación para PBB Polisur.
- **Servicios:** Oferta de la orden, coordinación logística, tramitación de documentos, tramitación de permiso de embarque, comunicación con clientes finales, envío de documentación, seguimiento del proceso desde planta hasta destino final.
- **No es exportador ni despachante.** Es el intermediario que coordina y controla todo el proceso.

### 1.2 PBB Polisur (Dow)
- **Rol:** Cliente. Productor y exportador de resinas de polietileno.
- **Producto principal:** Resinas de polietileno en bolsas (bags). Algún volumen de carga bulk (a granel, principalmente gasolina de pirólisis).
- **Plantas:**
  - **Bahía Blanca (C103 - Polisur Site Log):** Planta principal de producción. Ubicada al lado del puerto de Bahía Blanca. Habilitada como aduana domiciliaria (despacho y precintado en planta).
  - **Abbott (C212):** Planta de embolsado, más chica. También habilitada como aduana domiciliaria.
- **Sistema del cliente:** SAP. Las fechas de tracking se actualizan desde Metric hacia SAP.

### 1.3 Interlog (con G al final)
- **Rol:** Despachante de aduana externo. Uno solo para todas las operaciones de PBB Polisur.
- **Relación:** Tiene contrato directo con PBB Polisur, no con SSB.
- **Función:** Tramita los permisos de exportación a partir de la instrucción de exportación que le envía SSB. Envía por mail los permisos documentados al final de cada día.
- **Futuro:** Se está desarrollando una API entre Metric e Interlog para enviar instrucciones vía JSON en lugar de mail+PDF. Lo desarrolla un equipo de programadores ajeno a SSB.

---

## 2. EL EQUIPO

### 2.1 Composición (7-8 personas)
| Rol | Persona/Cantidad | Responsabilidad principal |
|-----|-------------------|--------------------------|
| Supervisor | 1 (autor de este doc) | Mejoras de automatización con Claude. Licenciado en Comercio Internacional, 7 años en la cuenta. |
| Líder de equipo | 1 | Apoyo general, el más experimentado. Interviene donde se necesita. |
| Coordinador marítimo | 1 | Todas las operaciones marítimas. Trabaja con el Excel SEGUIMIENTO MPC. |
| Coordinador terrestre | 1 | Operaciones terrestres generales (Brasil, Chile, Perú, etc.). Trabaja con NUEVO SEGUIMIENTO TERRESTRE. |
| Coordinador terrestre Río Chico | 1 | Solo operaciones terrestres a Tierra del Fuego (cliente Río Chico). Trabaja con Planilla terrestre RC. |
| Documentales | 2 | Se dividen por tipo de tarea: certificados de origen, declaraciones VLE, envío de documentación, envío de VGM, seguimiento del tablero de control documental. Trabajan con Control de cargas V2 MPC. |

### 2.2 Comunicación
- **Mail grupal:** expo.rpbb@scbint.com — todos reciben toda la documentación.
- **Mails individuales:** Cada miembro tiene su casilla propia.
- **Canales:** Gmail y WhatsApp para comunicación interna.
- **Toda la documentación llega por Gmail** (planillas, facturas, booking advice, reportes de planta, CRT, permisos, etc.).

---

## 3. VOLUMEN OPERATIVO

- **Aproximadamente 300-400 contenedores y/o camiones por mes.**
- **Destinos principales:**
  - Brasil (el más fuerte, mayoría del volumen)
  - Chile (Petroquímica Chile / Dow)
  - Perú (Dow Perú)
  - Tierra del Fuego (área aduanera especial — cliente Río Chico)
  - Estados Unidos (Dow Chemical Company — bajo volumen)
  - China (Dow Chemical Pacific — volumen mínimo)
  - Región andina (volumen puntual)

### 3.1 Tipos de órdenes
- **STO (Stock Transfer Order / Intercompany):** Dow a Dow. Más estandarizado. Clientes fijos:
  - Dow Brasil Ind e Com (Navegantes, Itajaí, Santos, Manaus, Paranaguá, Rio de Janeiro)
  - Dow Perú
  - Petroquímica Chile (Dow)
  - Dow Chemical Company (Estados Unidos — Houston)
  - Dow Chemical Pacific (China — Dalian)
- **Trade (terceros):** A clientes externos. ~30-40 clientes recurrentes, no rotan mucho. Requiere instrucciones específicas del exportador sobre qué mails enviar y a quién. Cada cliente tiene sus propias instrucciones de envío de documentación que llegan vía booking advice.

### 3.2 Modos de transporte (MOT)
- **Marítimo:** El grueso del volumen.
  - Puerto de Bahía Blanca — directo desde planta.
  - Puerto de Buenos Aires — mercadería llega por tren desde Bahía Blanca (vía Abbott en algunos casos).
  - Terminales: TRP (Buenos Aires), PTN (Bahía Blanca/Puerto Nuevo), EXOLGAN (Buenos Aires).
- **Terrestre:**
  - Sale directo de las plantas (aduanas domiciliarias, contenedor precintado en planta).
  - Paso principal: Paso de los Libres (hacia Brasil).
  - Paso secundario: Iguazú (menor volumen).
  - Transportistas: Don Pedro, Petrolera Alvear, Expreso El Aguilucho, Moggia, Siltrans, Loddin, Celsur, entre otros.
- **Tierra del Fuego:** Se tramita como exportación con permiso de exportación por ser área aduanera especial. Cliente retira en planta.

### 3.3 Navieras
- **Log-In:** 60-70% del volumen. Fuerte en Brasil. Contratos: 162140 (Navegantes), 162141 (Santos), 172741 (demás destinos).
- **Maersk:** Segundo volumen. Contrato: 299593739/299593740. Tiene portal web para carga de BL y VGM manual.
- **Hapag-Lloyd:** Tercer volumen. Fuerte en APAC y destinos lejanos.
- **Otras:** Pueden aparecer CMA CGM u otras según período de licitación.
- **Licitación:** Las navieras se ofrecen y ganan diferentes destinos por período.

---

## 4. SISTEMAS Y HERRAMIENTAS

### 4.1 Metric (Sistema de Gestión Principal)
- **Tipo:** Sistema web desarrollado por programadores externos.
- **Función:**
  - Recibe la oferta de la orden vía JSON desde SAP del cliente.
  - El coordinador carga manualmente la información logística: booking, cortes, buque, flete, aduana, transporte.
  - Genera el PDF de instrucción de exportación para Interlog.
  - Permite actualizar fechas de tracking (embarque, salida, llegada, etc.).
  - Tiene integración API con SAP para disparar actualizaciones de fechas (eventos 315).
- **Eventos 315 que se envían a SAP:**
  - Sailing Date (VD)
  - Confirmed on Board (AE)
  - Customs Cleared Date (CT)
  - B/L Received Date (BR)
  - Document Packet Sent
  - Vessel Arrival
  - Deliver to Destination Port
  - Arrived at Destination Port
  - Documentation Cut-Off
  - Cut-off date at departure
- **Exportación de datos:** Puede descargar reportes en Excel con el detalle de todas las operaciones (no 100% confiable, hay errores del servicio).
- **Estados de orden en Metric:** New Offer → Accepted → In Transit → Arrive. También: Cancelada.
  - "In Transit" = despachada. En marítimo es la confirmación de puesta a bordo. En terrestre es la salida de planta.
- **Limitaciones:** La carga de datos es manual. Hay duplicación de trabajo entre Metric y los Excel de seguimiento.

### 4.2 Excel Online en OneDrive
- **Función:** Herramienta operativa del día a día. Complementa a Metric por la complejidad de la operación.
- **Motivo de existencia:** Metric es la cara al cliente (SAP). Los Excel son la herramienta interna del equipo para coordinar bookings, pendientes, validaciones, facturación, documentación.
- **Acceso:** Cada coordinador trabaja en su Excel, pero todos tienen acceso de lectura/escritura a los demás porque se complementan.
- **Problema principal:** Duplicación de carga entre Metric y Excel.

### 4.3 Google Drive Compartido
- **Carpeta maestra:** "Team Exportación" (carpeta compartida en Google Drive, no OneDrive).
- **Estructura:** Subcarpetas por tipo de documento:
  - Factura de Exportación
  - Packing List Marítimo
  - Packing List Terrestre
  - Bill of Lading Draft
  - Bill of Lading Final
  - CRT
  - Certificado de Origen (ZIP comprimido)
  - Certificado de Origen (PDF)
  - Booking Advice
  - Otros
- **Naming convention:** Número de orden + detalle adicional. Ejemplo: `117602991_FC_0110-00054905.pdf`, `117602991_BL_246769913.pdf`. Estandarizado.
- **Búsqueda:** Si se busca por número de orden en el Drive, lista todos los documentos de esa orden de todas las carpetas.
- **Automatización existente:** n8n toma documentos que llegan por Gmail y los guarda automáticamente en la carpeta correspondiente del Drive con el naming correcto (booking advice, packing list, factura de exportación).

### 4.4 Gmail
- **Casilla funcional:** expo.rpbb@scbint.com (todos reciben todo).
- **Uso:** Toda la documentación externa llega por Gmail. Envío de documentación al cliente es manual por Gmail. Comunicación con Interlog por Gmail.
- **Portal de navieras:** Log-In, Maersk y Hapag-Lloyd tienen portales web con usuario y contraseña. En Log-In es usuario individual. En Maersk y otros, el usuario está conectado a la casilla funcional expo.rpbb.

### 4.5 n8n (Automatización)
- **Hosting:** n8n Cloud.
- **Flujos activos:** 1 flujo principal — reconocimiento de documentación por mail y descarga al Drive en la carpeta correspondiente.
- **Documentos automatizados:** Booking Advice, Packing List, Factura de Exportación.
- **Pendiente:** CRT escaneados (problema con OCR).
- **Documentos no automatizados (manuales):** BL Draft y Final (se descargan de portales de navieras), Certificado de Origen (se genera en la Cámara Argentina de Comercio).

### 4.6 Proyectos de automatización existentes (VS Code)
- **Validador Aduanal:** Web app para validar planillas de aduana. Supabase + HTML. Funcional.
- **Tarifa Schedule:** HTML con dos solapas — tarifas de flete por destino/naviera y schedule de servicios marítimos. Se comparte con el cliente y lo usa el coordinador.
- **Export Control:** Proyecto central futuro para automatizar todo el proceso de control documental. Fase 1 de 6. Core de extracción y validación implementado, integración con Google Drive pendiente.

---

## 5. LOS DOCUMENTOS

### 5.1 Booking Advice
- **Origen:** Llega del cliente por dos vías simultáneas: JSON a Metric y PDF por correo.
- **Contenido:** Información de la orden al momento del ofrecimiento. Producto, destino, cliente, incoterm, instrucciones de envío (a quién enviar la documentación final, especialmente para trade).
- **Automatización:** n8n lo captura del mail y lo guarda en Drive.

### 5.2 Instrucción de Exportación (IE)
- **Origen:** Se genera en Metric como PDF después de que el coordinador carga toda la información logística (booking, cortes, buque, flete, aduana, transporte, producto).
- **Destino:** Se envía por mail a Interlog para que tramite el permiso de exportación.
- **Envío actual:** Manual (coordinador arma el mail en Gmail y adjunta el PDF).
- **Envío futuro:** Vía API JSON de Metric a Interlog (en desarrollo por programadores externos).
- **Error crítico:** Si el coordinador cargó mal el valor del flete (tomado de las tarifas), la instrucción sale con el dato incorrecto y el permiso se tramita mal. Corrección tiene costo (registrado en hoja COSTO CORRECCION del programa marítimo).

### 5.3 Permiso de Exportación
- **Origen:** Tramitado por Interlog a partir de la instrucción de exportación.
- **Notificación:** Interlog envía mail al final del día con los permisos documentados.
- **Importancia:** Sin permiso, la orden NO puede ser despachada de planta.
- **Seguimiento:** Crítico. El coordinador debe hacer seguimiento ante cualquier evento o demora.
- **Formato del permiso:** Ejemplo: `25003EC03002997S`, `26003EC01001808H`.

### 5.4 Excel de Planta (Informe de Despacho)
- **Origen:** Personal de planta envía por mail cuando se despacha mercadería.
- **Contenido:** Detalle del despacho — pesada, producto, contenedores, terminal de destino.
- **Variantes:** Puede ser despacho vía tren (a Buenos Aires), vía camión (terrestre), o remisión a puerto de Bahía Blanca.
- **Formato:** Excel.

### 5.5 Planilla de Aduana
- **Origen:** Despachante (Interlog) envía por mail al momento del despacho.
- **Contenido:** Detalle del despacho con visión aduanera — DDT, PO, buque, destino, terminal, canal, contenedores, precintos, bultos, peso.
- **Formato:** Excel.
- **Uso crítico:** La información de la planilla se usa para declarar en el Bill of Lading. El Validador Aduanal fue creado para facilitar el acceso a esta información.
- **Variantes:** Buenos Aires (estándar) y Bahía Blanca (filename contiene "REMISION", terminal PTN).

### 5.6 Reporte de Balanza (VGM / BGM)
- **Origen:** Persona en planta descarga el reporte de la balanza y lo comparte.
- **Contenido:** Excel con todas las pesadas que tuvo la balanza (muchos movimientos por contenedor).
- **Proceso:** Se arma tabla dinámica para extraer la última pesada de cada contenedor. Se cruza contra la planilla del tren/despacho para verificar que los contenedores y pesadas coincidan.
- **Envío:** Se envía la VGM a la terminal y a la línea marítima.
  - A la terminal y a Log-In/Hapag: por correo.
  - A Maersk: carga manual en su portal web.
- **Nombre interno:** BGM (con B de "balanza", peso verificado del contenedor precintado).

### 5.7 Factura de Exportación
- **Origen:** Se emite al día siguiente del despacho.
- **Formato:** PDF.
- **Automatización:** n8n la captura del mail y la guarda en Drive.
- **Uso:** Se envía al cliente. Se cruza contra el BL para validación. Se usa para facturación interna (hoja FACTURAS PBB).
- **Error posible:** Valor FOB, flete o seguro incorrectos. Se cruza contra datos de SAP y del permiso de exportación.

### 5.8 Bill of Lading (BL)
- **BL Draft:** Se genera en el portal web de cada naviera. El documental carga la declaración de embarque manualmente en el portal usando los datos de la planilla de aduana. Después descarga el draft para control.
- **Control del BL (CRÍTICO):** Se cruza contra factura, planilla de aduana, y otros documentos. Se verifica: datos del consignatario, nombre del producto, peso, número de contenedor, permisos, precintos. Errores comunes: tipeo, producto desactualizado, permiso mal escrito, dato mal ingresado en el portal. **Todo ingreso es manual, casi toda la información se puede validar contra otro documento disponible.**
- **BL Final:** Una vez corregido y aprobado, se descarga manualmente del portal en otra carpeta del Drive.
- **Cada naviera tiene su propio portal:** Log-In, Maersk, Hapag-Lloyd. Cada uno con interfaz diferente.
- **Plazo:** Hay un límite horario para hacer correcciones al BL, diferente por naviera.

### 5.9 CRT (Carta de Porte Internacional)
- **Equivalente terrestre del BL.**
- **Origen:** Enviado por el ATA (Agente de Transporte Aduanero) por correo.
- **Formato:** Puede ser PDF digital o escaneado.
- **Automatización:** n8n lo captura, pero hay problemas con los escaneados (OCR pendiente de desarrollar).

### 5.10 Certificado de Origen (COO)
- **Tramitación:** En la Cámara Argentina de Comercio (plataforma web propia).
- **Proceso:** Se sube documentación firmada, se carga información, se ingresa la solicitud, se espera aprobación, se descarga.
- **Formato:** Archivo ZIP (digital) que se convierte a PDF para envío.
- **Aplica:** Al 95% de las exportaciones (producto de origen argentino).
- **Tracking:** Número de COO tipo `AR004A18250003162300`.

### 5.11 Packing List
- **Variantes:** Marítimo y Terrestre (carpetas separadas en Drive).
- **Automatización:** n8n lo captura del mail y lo guarda en Drive.

---

## 6. FLUJO OPERATIVO COMPLETO

### Fase 1: Oferta y Aceptación
1. La orden llega vía JSON desde SAP a Metric (automático).
2. En paralelo, llega el Booking Advice como PDF por correo.
3. n8n captura el Booking Advice y lo guarda en Drive.
4. El coordinador carga la orden en su Excel de seguimiento (manual).
5. Estado en Metric: **New Offer → Accepted**.

### Fase 2: Coordinación e Instrucción
6. El coordinador carga en Metric la info logística: booking, cortes documentales, buque, flete (consultando tarifas), aduana, transporte, producto.
7. Metric genera el PDF de instrucción de exportación.
8. El coordinador envía la instrucción a Interlog por mail (manual, futuro vía API).
9. Interlog tramita el permiso de exportación.
10. Interlog envía los permisos por mail al final del día.
11. El coordinador hace seguimiento si hay eventos o demoras con el permiso.
12. **Sin permiso = la orden NO puede despacharse.**

### Fase 3: Despacho
13. Con el permiso OK, planta despacha la mercadería (consolidación del contenedor, precintado, despacho aduanero — todo en planta por ser aduana domiciliaria).
14. Planta envía por mail:
    - Excel de despacho (detalle de pesada, producto, contenedores, terminal destino).
    - Reporte de balanza (pesadas de todos los contenedores).
15. Interlog envía la planilla de aduana por mail.
16. n8n captura la planilla y factura si corresponde.
17. Estado en Metric: **Accepted → In Transit** (se confirma despacho).

### Fase 4: Post-Despacho (Documentación)
18. **Factura de exportación:** Se emite al día siguiente. n8n la captura y guarda en Drive.
19. **VGM (BGM):**
    - Se toma el reporte de balanza, se arma tabla dinámica con última pesada por contenedor.
    - Se cruza contra planilla de despacho para verificar.
    - Se envía a terminal y naviera (mail o portal web según naviera).
20. **Declaración de embarque / BL:**
    - El documental carga la declaración en el portal de la naviera usando datos de la planilla de aduana.
    - Se descarga el BL Draft.
    - **Control del BL:** Se cruza contra factura, planilla de aduana y otros. Se verifican todos los campos.
    - Si hay errores → se corrige en el portal (hay deadline por naviera).
    - Se aprueba → se descarga el BL Final.
21. **Certificado de Origen:**
    - Se tramita en la Cámara Argentina de Comercio (web).
    - Se sube documentación, se ingresa solicitud, se espera aprobación.
    - Se descarga ZIP → se convierte a PDF.
22. **CRT (terrestre):** Llega del ATA por correo. n8n lo captura (problemas con escaneados).

### Fase 5: Envío de Documentación al Cliente
23. A medida que los documentos están disponibles, el documental:
    - Busca en el Drive por número de orden (carpeta maestra Team Exportación).
    - Arma un correo en Gmail con estructura fija:
      - **Asunto:** "Envío de documentación - [Nombre cliente]"
      - **Cuerpo:** "Estimados, enviamos documentación de la orden [número], embarcada con [naviera/transporte], con fecha estimada [fecha]. Adjuntamos [documentos disponibles]."
      - **Adjuntos:** Documentos disponibles (factura, packing list, COO, BL/CRT).
    - Puede haber 2-3 envíos por orden porque no toda la documentación está lista al mismo tiempo.
24. **Instrucciones de envío:**
    - Intercompany: Destinatarios fijos por filial (Dow Brasil, Dow Perú, Petroquímica Chile, etc.).
    - Trade: Instrucciones específicas por cliente, disponibles en el Booking Advice.
25. **Paquete documental final completo:** Factura + Packing List + Certificado de Origen + BL (marítimo) o CRT (terrestre).

### Fase 6: Tracking y Cierre
26. Se actualizan fechas en Metric para enviar eventos 315 a SAP:
    - Sailing Date, Confirmed on Board, Customs Cleared, BL Received, Document Packet Sent, Vessel Arrival, Deliver to Destination Port, Arrived at Destination Port.
27. Existe una función en Metric para cargar varias órdenes a la vez con las fechas.
28. **Seguimiento que NO se hace hoy:** Alertas de arribo al cliente. No hay seguimiento post-envío de documentación.
29. Estado final en Metric: **In Transit → Arrive**.

---

## 7. LOS EXCEL DE SEGUIMIENTO — DETALLE

### 7.1 PROGRAMA MARITIMO NW SSB 2026
- **Quién lo usa:** Todo el equipo. Es el programa maestro marítimo.
- **Hojas principales:**
  - **DTD (intercompany):** SAP, SHP, Buque, Destino, Agencia, Línea, Terminal, Incoterm, Cut Off Doc, Cut Off, ETD, ETA, Cliente, EQ (cantidad de contenedores), GMID, Producto, Bolsas, Planta, Booking. Continúa con más columnas para contenedores, precintos, permisos, factura, etc.
  - **TRADE ORDERS:** Misma estructura que DTD pero para órdenes de terceros.
  - **BULK:** Carga a granel (gasolina de pirólisis a Houston). Formato simplificado.
  - **APAC:** Órdenes a Asia-Pacífico (principalmente Dalian, China).
  - **Reservas:** Seguimiento documental marítimo. Order, Naviera, SHP, Booking, Buque, Cliente, Producto, Destino, Incoterm, Cut Off Doc, VGM, Declaración, Status, Confección (quién confeccionó), Revisión (quién revisó), Nro de BL, BL Received, ETD, BL Sent.
  - **BL:** Cruce de órdenes D2D y Trade con sus números de BL. Tiene fórmulas de búsqueda.
  - **315:** Mapeo de eventos 315 para SAP (Sailing Date=VD, Confirmed on Board=AE, etc.) con fechas de envío SSB vs. poblado en SAP.
  - **COSTO CORRECCION:** Registro de costos por correcciones. Orden, costo, motivo. Ejemplo: "permiso mal informado por Interlog", "precinto mal informado", "CNPJ mal informado en el BK ADV".
  - **RETORNOS:** Órdenes con retornos. Orden, Cliente, CSR, Permiso, Motivo, Finalizado, Coordinador.
  - **Canceladas:** Órdenes marítimas canceladas. Misma estructura que DTD/Trade.
  - **EBS - MAERSK:** Recargos de Maersk (Emergency Bunker Surcharge) para órdenes despachadas antes de cierta fecha.
- **Se comparte como reporte al cliente** porque planta lo usa para coordinar despachos.

### 7.2 SEGUIMIENTO MPC - coordinación 2.0
- **Quién lo usa:** Coordinador marítimo.
- **Hojas principales:**
  - **COORDINACIÓN:** Órdenes enviadas a Interlog. NW (fecha new), Aceptada, Naviera, Contrato N°, Flete Unitario, QTY, Flete Total, Incoterm, FILE (número interno SSB), PO, SHP, Buque, Delivering Dow Plant ID, Booking, Cliente, GMID, Material, TXT Cargados?, Destination, Inv Value.
  - **COORDINACIÓN ANT:** Historial de coordinación anterior (mismo formato sin algunas columnas).
  - **TARIFAS - FLETES:** Dos tablas lado a lado. Puerto Embarque, Puerto Destino, Carrier, Equipo (40'HC), Tarifa Q1 2026, Aplica a partir de. Una tabla para Bahía Blanca, otra para Buenos Aires. Incluye EFA/EBS y Tarifa Total. **Fuente de verdad para el valor de flete que se declara en el permiso de exportación.**
  - **TURNOS ARAÑA:** Turnos de ingreso a terminal en Buenos Aires. Carga, Orden, Barco, Reserva, Terminal, EQ, Turno, Horario, Cut Off, Transporte, Pases, Permiso, Ingreso, Comentarios.
  - **CONTRATOS:** Números de contrato por naviera. Incluye nombres de BID y referencias.
  - **COST SAVING:** Registro de ahorros. Cambios de buque a tiempo, etc.
  - **Desvíos:** Registro de desvíos operativos con orden, origen, motivo, responsable, acción correctiva.
  - **Vencimiento balanza:** Fechas de vencimiento de la balanza de planta, RENPRE, balanza fiscal. Con fechas de preaviso y límite de presentación.
  - **DC:** Órdenes con envío de Delivery Confirmation. Misma estructura que programa marítimo.
  - **PE:** Permisos anulados por Dow y permisos mal documentados.
  - **RC PRECIOS:** Precios de Río Chico (terrestre Tierra del Fuego). Orden, OC cliente, Producto, Planta, Código Material, Cantidad, Fecha, Precio, Precio/bolsa, Precio Neto.
  - **ORDEN RUSH:** Órdenes urgentes. File, PO, SHP.
  - **BORRADOR:** Zona de trabajo para armar envíos de instrucciones y solicitudes de SITA/anulación.
  - **Canceladas:** Órdenes canceladas.

### 7.3 NUEVO SEGUIMIENTO TERRESTRE 2026
- **Quién lo usa:** Coordinador terrestre.
- **Hojas principales:**
  - **NW TERRESTRE:** Órdenes despachadas. NW, AC, IE Enviada?, Shipping Point, Plant Name, Start Loading, File SSB, Order, Delivery, Ship, GMID, Material, PA (posición arancelaria), Ship To, Carrier, ATA (agente de transporte), Incoterm, Inc. Destino, Invoice, Req. COO.
  - **FACTURACION 2.0:** Cruce de facturación trade. Invoice Number, Order, Delivery, Shipment, Permiso, FOB, Freight, Insurance, Total Invoice. Tabla paralela con datos SAP y Reporte Interlog para cruce.
  - **CONSULTAS:** Clientes consultados sobre instrucciones de envío de documentación. Cliente, Consultado?, Respuesta (ej: "DOS CORREOS - AM CON MIC CRT Y PM CON FC COO"), Responsable de armar la cadena.
  - **BORRADOR:** Zona para armar envíos de instrucciones y solicitudes.
  - **PE INTERLOG:** Cruce de permisos con Interlog.
  - **CANCELADAS:** Órdenes terrestres canceladas.
  - **Fletes - ADUANA:** Tarifas de flete terrestre por ciudad de origen, país destino, ciudad destino, carrier, rate (ARS & USD). Ejemplo: Bahía Blanca → Santiago por Don Pedro = USD 3200.
  - **CORRECCIONES:** Irregularidades por parte de ATA, irregularidades por parte de Dow, despachos sin EGI.
  - **DOCS:** Seguimiento documental terrestre. Aduana, Order, DN, Shipment, GMID, Material, Ship To, Invoice, Transporte, Fecha de carga, Destino-Aduana de salida, Status, Asignación, Req COO, COO, COO Date, Doc Sent, DHL, Observaciones, PO Retorno.
  - **NCM - NORMAS:** Tabla de posiciones arancelarias por producto. GMID, Material, NCM Mercosur, Norma de Origen, NCM 2022, NALADISA, NALADI, DJO. Referencia para certificados de origen y permisos.
  - **NCM:** Tabla simplificada GMID → Material → PA.
  - **DIRECCION DE ENVIO:** Direcciones de envío por cliente terrestre y modelo de envío.
  - **DC:** Delivery Confirmation terrestre (vacía actualmente).

### 7.4 Planilla terrestre RC - 2025
- **Quién lo usa:** Coordinador terrestre Río Chico.
- **Específico para:** Operaciones a Tierra del Fuego (cliente Río Chico SA y Plásticos de la Isla Grande).
- **Hojas principales:**
  - **NW RC:** Aceptación Parcial, Aceptación Total, EGI (fecha), Shipping Point (C103), Plant Name, Start Loading, File SSB, PO, Delivery, Ship, GMID, Material, PA, Ship To, Carrier (siempre Cliente Retira), ATA (Moggia), Incoterm (FCA), Inc. Destino (Bahía Blanca), Inv. Value, Inv. Number.
  - **PE INTERLOG:** Cruce órdenes vs permisos Interlog.
  - **PRECIOS RC:** Precios por producto para Río Chico. Orden, OC Cliente, Producto, Planta, Código Material, Cantidad, Fecha, Precio, Precio/bolsa, Precio Neto.
  - **SAP:** Cruce orden vs valor SAP.
  - **FORMULA FACTURA:** Cruce orden vs factura con fechas.
  - **FACTURACIÓN:** Orden, Delivery, Shipment, Ship To, PE Value, SAP Value, OK? (validación de cruce).
  - **INTERLOG:** Detalle de órdenes para Interlog. Start Loading, File SSB, Order, Delivery, Shipment, GMID, Material, PA, Ship To, Carrier, ATA, Incoterm, Inc. Destino, FOB Total USD, QTY, Pallets.
  - **CANCELADOS:** Órdenes canceladas.
  - **NCM:** Tabla de posiciones arancelarias.
  - **CARGADO HASTA JUL 25 / CARGADO 24:** Historial de órdenes ya procesadas.

### 7.5 Control de cargas V2 - MPC
- **Quién lo usa:** Documentales (Gastón, Agus, Naara, Jorge).
- **Función:** Seguimiento documental marítimo.
- **Hojas principales:**
  - **Seguimiento FC y docs:** GI Date, Origen, Vessel, POD, PO, SHP, Customer, Fecha Asignación, Invoice, COD (certificado origen), ETD, ATD, Status, FC-COO-Sent, BL Sent, POL, ETA, Comentarios al equipo, Asignación COO, Buque.
  - **Docs:** Order, Cliente, ETD, Invoice, Embarca, COO #, Status (PENDIENTE/ENVIADO/etc.), Docs Sent, BL Sent, Asignado a, Fecha de asignación, Límite envío 48hs, Comentarios, Control COO, Trigger n8n. Columnas de conteo por documental (Gastón, Agus, Naara).
  - **Modelo de envío:** Template para armar los correos. Orden, Invoice, COD, Customer, Vessel, ETD, ETA, Booking.
  - **Asignación:** Tabla simple de orden → documental asignado.

### 7.6 FACTURAS PBB V2
- **Quién lo usa:** Facturación.
- **Hojas principales:**
  - **HOY:** Cruce de facturación del día. SHP, DN, Orden, Cod País, Incoterm, PE (permiso), FOB USD, Freight USD, Insurance USD, Total Invoice USD. Tabla paralela con datos del permiso para validar que coincidan.
  - **PE:** Datos de permisos de exportación de Interlog. Ref. Secundaria, Destinación SIM, FOB, Flete, Seguro, Cantidad Declarada, Interfaz, PA, Oficialización, Vencimiento.
  - **DESVIOS FACTURACION:** Registro de desvíos. MOT, Orden, Cliente, Precio al NW, Precio (GI), Pedido, Resolución.

---

## 8. CAMPOS CLAVE Y NOMENCLATURA

### 8.1 Identificadores de orden
| Campo | Descripción | Ejemplo |
|-------|-------------|---------|
| SAP / PO / Order | Número de orden SAP de Dow | 4009684189, 117673953, 118187927 |
| SHP / Ship / Shipment | Número de embarque | 46674302, 47420433 |
| Delivery / DN | Número de entrega | 830024256, 831366784 |
| FILE / File SSB | Número interno de SSB International | 37693, 38081 |
| Booking | Número de reserva de la naviera | LA0434884, 257215188, 246168557 |
| Permiso / PE | Número de permiso de exportación | 25003EC03002997S, 26003EC01001808H |
| BL / BL Number | Número de Bill of Lading | BHI099351RCN, 068N902808414 |
| Invoice | Número de factura de exportación | 0110-00054905 |
| COO / COD | Número de certificado de origen | AR004A18250003162300 |
| GMID | Código de material de Dow | 374366, 99066480, 11094969 |
| NW | Fecha de New (ofrecimiento) | Fecha |
| AC | Fecha de Aceptación | Fecha |

### 8.2 Campos de producto
| Campo | Descripción | Ejemplo |
|-------|-------------|---------|
| Material / Producto | Nombre del producto | PE DOWLEX NG2045B BG6025 KG |
| PA / Posición Arancelaria | NCM / código arancelario | 39014000000K, 39012029900U |
| GMID | Código global de material | 374366 |
| Bolsas / QTY | Cantidad de bolsas | 4320 (= 4 contenedores × 1080 bolsas) |
| EQ | Cantidad de contenedores | 4, 5 |

### 8.3 Campos logísticos
| Campo | Descripción | Ejemplo |
|-------|-------------|---------|
| Buque / Vessel | Nombre del buque | LOG-IN DISCOVERY 045, MAERSK MONTE ALEGRE 531N |
| Terminal | Terminal portuaria | TRP, PTN, EXOLGAN |
| Planta / SH Point | Planta de origen | C103 (Bahía Blanca), C212 (Abbott) |
| INC / Incoterm | Condición de venta | FOB, CPT, CFR, CIP, FCA |
| Cut Off Doc | Fecha límite documentación | Fecha |
| Cut Off | Fecha límite ingreso a terminal | Fecha |
| ETD | Estimated Time of Departure | Fecha |
| ETA | Estimated Time of Arrival | Fecha |
| ATD | Actual Time of Departure | Fecha |
| POL | Port of Loading | BS AS, PTN |
| POD | Port of Discharge / Destino | NAVEGANTES, PARANAGUA, SANTOS |
| ATA | Agente de Transporte Aduanero (terrestre) | Moggia, Siltrans, Don Pedro |
| Carrier | Transportista terrestre | Expreso El Aguilucho, Petrolera Alvear |

### 8.4 Códigos de planta
| Código | Planta | Nota |
|--------|--------|------|
| C103 | Polisur Site Log (Bahía Blanca) | Planta principal |
| C106 | Ferrocarril directo / TRP | Envío por tren a Buenos Aires |
| C212 | Abbott | Planta de embolsado |

### 8.5 Delivering Dow Plant ID (rutas de despacho)
- **FERROCARIL DIRECTO / TRP:** Mercadería va por tren a terminal TRP (Buenos Aires).
- **FERROCARRIL DIRECTO VIA ABBOTT:** Va por tren vía Abbott.
- **ABBOTT:** Sale de planta Abbott.
- **BAHIA / [DESTINO]:** Remisión desde Bahía Blanca por camión al puerto.

---

## 9. PUNTOS DE DOLOR Y OPORTUNIDADES DE AUTOMATIZACIÓN

### 9.1 Prioridad 1: Acceso fácil a información para declarar
- **Problema:** Los documentales necesitan datos de la planilla de aduana para cargar la declaración del BL en los portales de navieras. Hoy buscan manualmente.
- **En progreso:** Validador Aduanal (parsea planillas y las presenta de forma accesible).
- **Oportunidad:** Que la información parseada esté disponible de forma inmediata y estructurada para copiar/pegar en los portales.

### 9.2 Prioridad 2: Control del BL (CRÍTICO)
- **Problema:** El control del BL draft contra factura, planilla de aduana y otros documentos es manual, campo por campo. Errores de tipeo, productos desactualizados, permisos mal escritos, pesos incorrectos.
- **Oportunidad:** Automatizar el cruce. Al descargar el BL, compararlo automáticamente contra la planilla de aduana y la factura. Resaltar discrepancias. Reducir errores y tiempo de revisión.
- **Datos a cruzar:** Consignatario, producto, peso, contenedores, precintos, permiso, datos del buque/booking.

### 9.3 Prioridad 3: Mailing y seguimiento de documentación (CRÍTICO)
- **Problema:** El envío de documentación al cliente es 100% manual. El documental busca documentos en el Drive, arma el mail, adjunta, envía. Puede haber 2-3 envíos por orden. No hay seguimiento posterior ni alertas de arribo.
- **Oportunidad:**
  - Detectar automáticamente qué documentos están disponibles en el Drive para cada orden.
  - Pre-armar el correo con la estructura fija + datos de la orden + adjuntos correctos.
  - Instrucciones de envío (destinatarios) tomadas del Booking Advice (trade) o fijas (intercompany).
  - Tablero de seguimiento: qué órdenes tienen documentación pendiente de envío.
  - Alertas de arribo al cliente (no se hace hoy).

### 9.4 Otras oportunidades identificadas
- **Cruce VGM:** Automatizar el cruce del reporte de balanza contra la planilla de despacho para obtener la pesada correcta por contenedor sin tabla dinámica manual.
- **Valor de flete:** Validar que el flete cargado en la instrucción de exportación coincida con la tarifa vigente (hoja TARIFAS-FLETES) antes de enviar a Interlog. Prevenir correcciones costosas.
- **Doble carga Metric/Excel:** A largo plazo, reducir la duplicación usando datos de Metric como fuente y los Excel como vista.
- **CRT escaneados:** Resolver el OCR en n8n para completar la automatización del archivado.
- **Deadlines y alertas:** Monitorear cortes documentales, VGM, plazos de corrección de BL. Hoy una persona los monitorea mirando el programa marítimo.
- **Actualización de Metric:** Automatizar la actualización de fechas en Metric a partir de confirmaciones que llegan por mail (despacho terrestre, puesta a bordo marítima).

---

## 10. ESTRUCTURA DE DRIVE

### Google Drive compartido
```
Team Exportación/
├── Booking Advice/
├── Factura de Exportación/
├── Packing List Marítimo/
├── Packing List Terrestre/
├── Bill of Lading Draft/
├── Bill of Lading Final/
├── CRT/
├── Certificado de Origen (ZIP)/
├── Certificado de Origen (PDF)/
├── DDJJ 2026 - COLOMBIA/
├── DDJJ 2025 - CHILE/
├── APPLICATIVOS EXPO/        ← Herramientas internas (n8n las usa)
├── DOCUMENTOS EXPORTACION - MAIL/
└── OTROS - DOCS DE EXPO/
```

### Naming convention de archivos
- **Formato:** `[Número de orden]_[Código tipo doc]_[Detalle adicional].[extensión]`
- El número de orden siempre va primero para facilitar búsqueda.
- Estandarizado y respetado por n8n en el guardado automático.

### OneDrive (Excel de seguimiento)
- PROGRAMA MARITIMO NW SSB 2026.xlsx
- SEGUIMIENTO MPC - coordinación 2.0.xlsx
- NUEVO SEGUIMIENTO TERRESTRE - 2026.xlsx
- Planilla terrestre RC - 2025.xlsx
- Control de cargas V2 - MPC.xlsx
- FACTURAS PBB V2.xlsx

---

## 11. INTEGRACIONES EXISTENTES Y FUTURAS

### Existentes
| Integración | Tipo | Estado |
|-------------|------|--------|
| SAP → Metric | JSON (oferta de orden) | Funcionando |
| Metric → SAP | API (eventos 315 / fechas) | Funcionando |
| Gmail → Drive (n8n) | Automatizado (Booking, PL, FC) | Funcionando |
| Metric → PDF (Instrucción) | Generación interna | Funcionando |

### En desarrollo
| Integración | Tipo | Estado |
|-------------|------|--------|
| Metric → Interlog | API JSON (instrucciones) | En desarrollo (programadores externos) |

### Oportunidades de integración futura
| Integración | Tipo | Prioridad |
|-------------|------|-----------|
| Drive → Validación BL | Lectura + cruce automático | Alta |
| Drive → Mailing automático | Detección de docs + armado de mail | Alta |
| Planilla aduana → Info para BL | Parser + vista accesible | En progreso (Validador Aduanal) |
| Reporte balanza → VGM | Cruce automático | Media |
| Tarifas → Validación flete | Cruce preventivo | Media |
| Metric reporte → Excel update | Sincronización | Baja (depende de confiabilidad Metric) |

---

## 12. GLOSARIO

| Término | Significado |
|---------|-------------|
| ATA | Agente de Transporte Aduanero (terrestre) |
| BL | Bill of Lading (conocimiento de embarque marítimo) |
| BL Draft | Borrador del BL para revisión antes de emisión final |
| Booking / BK | Reserva de espacio en buque |
| Booking Advice | Documento con información de la orden al momento del ofrecimiento |
| COO / COD | Certificate of Origin / Certificado de Origen |
| CRT | Carta de Porte Internacional (equivalente terrestre del BL) |
| Cut Off | Fecha límite de ingreso de contenedores a terminal |
| Cut Off Doc | Fecha límite de presentación de documentación |
| DC | Delivery Confirmation |
| DDT | Documento de Transporte (en planilla de aduana) |
| DJO | Declaración Jurada de Origen |
| DN | Delivery Number |
| EGI | Envío de instrucción (terrestre) |
| ETA | Estimated Time of Arrival |
| ETD | Estimated Time of Departure |
| FOB | Free on Board (incoterm) |
| GMID | Global Material ID (código de producto Dow) |
| IE | Instrucción de Exportación |
| MOT | Mode of Transport (marítimo/terrestre) |
| NCM | Nomenclatura Común del Mercosur (código arancelario) |
| NW | New (fecha de ofrecimiento) |
| PA | Posición Arancelaria |
| PE | Permiso de Exportación |
| PO | Purchase Order |
| POD | Port of Discharge |
| POL | Port of Loading |
| SHP | Shipment Number |
| SITA | Solicitud de anulación de permiso |
| STO | Stock Transfer Order (intercompany Dow) |
| TRP | Terminal Río de la Plata (Buenos Aires) |
| PTN | Puerto Nuevo (Bahía Blanca) |
| VGM / BGM | Verified Gross Mass / peso verificado del contenedor |
| 315 | Evento de tracking en SAP |

---

## 13. ESTADO ACTUAL DEL SISTEMA DE AUTOMATIZACIÓN

> Última actualización: Abril 2026

### 13.1 Setup de Desarrollo

| Herramienta | Estado | Detalle |
|-------------|--------|---------|
| Claude Code | ✅ Instalado | Windows nativo, integrado con VS Code |
| MCP Supabase | ✅ Conectado | `https://mcp.supabase.com/mcp` |
| MCP n8n | ✅ Conectado | `https://jzenteno.app.n8n.cloud/mcp-server/http` |
| MCP Gmail | ✅ Conectado | `https://gmail.mcp.claude.com/mcp` |
| MCP Google Drive | ⚠️ Parcial | Conectado en Claude.ai, pendiente en Claude Code |
| WSL | ⏳ Pendiente | Recomendado para mejor compatibilidad en Windows |

### 13.2 Proyectos en VS Code

| Proyecto | Ruta | Estado |
|----------|------|--------|
| `validador-aduanal` | `Claude code VS/validador-aduanal` | ✅ Producción |
| `export-control-automatization` | `Claude code VS/export-control-automatization` | 🔄 Fase 1/6 |
| `tarifa-schedule` | `Claude code VS/tarifa-schedule` | ✅ Producción (simple) |

### 13.3 Workflows Activos en n8n

| Nombre | ID | Estado | MCP | Función |
|--------|-----|--------|-----|---------|
| Control de bill of lading | `WVt6gvghL2nFVbt6` | ✅ Activo | ✅ Habilitado | Vigila BL DRAFT, parsea, cruza y envía mail |
| Descarga pdf y subida a Drive | `pBN4Wd1lcTSHNkFg` | ✅ Activo | ✅ Habilitado | Clasifica docs de Gmail al Drive |
| Mailling SSB | `Ww5kFgcVob6WhHVS` | ⏸️ Inactivo | ❌ | Envío de documentación (en desarrollo) |
| REMITOS DOW | `u9AcvC2yqDB3iTdz1sL2b` | ⏸️ Inactivo | ❌ | Procesamiento de remitos |
| REMITOS DOW con Claude | `sgP6BESzQS3ekYut` | ⏸️ Inactivo | ❌ | Versión con IA |

### 13.4 Base de Datos Supabase (proyecto: xkppkzfxgtfsmfooozsm)

| Tabla | Registros actuales | Función |
|-------|-------------------|---------|
| `operaciones` | 18 | Planillas aduana parseadas |
| `contenedores` | 66 | Detalle de contenedores por operación |
| `bl_controls` | 0 | Registro de controles BL con IA (nueva, sin uso aún) |
| `patrones_aprendidos` | — | Patrones de validación aprendidos |
| `configuracion` | — | Configuración del sistema |

### 13.5 Problemas Conocidos del Workflow BL Control

- Parsers frágiles — extrae mal datos en formatos no estándar (CNPJ, Notify)
- Solo funciona para Log-In — Maersk y Hapag-Lloyd no cubiertos
- Comparador genera falsos positivos — pendiente revisión
- Sin registro online de controles ni dashboard

### 13.6 Roadmap de Automatización

| Fase | Descripción | Estado |
|------|-------------|--------|
| 1 | Validador Aduanal operativo | ✅ Completo |
| 2 | BL Control básico (Log-In) | ✅ Funcionando con bugs |
| 3 | BL Control con IA como extractor universal | 🔄 En desarrollo |
| 4 | Comparador inteligente con IA | ⏳ Pendiente |
| 5 | Persistencia en Supabase + costos por BL | ⏳ Pendiente |
| 6 | Mail con resumen inteligente | ⏳ Pendiente |
| 7 | Dashboard HTML | ⏳ Pendiente |
| 8 | Mailing automático de documentación al cliente | ⏳ Pendiente |
| 9 | Supabase Realtime en Validador Aduanal | ⏳ Pendiente |
| 10 | Plataforma unificada SSB Export Platform | 🔮 Futuro |

### 13.7 Convención de Actualización

Este documento se actualiza:
- **Al terminar cada sesión** — usando la palabra clave `break` en Claude Code
- **Al completar una fase** — actualizando el estado en el roadmap
- **Una vez por mes** — revisión completa con Claude.ai
