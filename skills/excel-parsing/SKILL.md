---
name: excel-parsing
description: Rules and conventions for parsing Argentine customs export Excel spreadsheets (planillas de aduana) in the Validador Aduanal project. Use this skill whenever working on parseExcelSheet, extractAfterSeparator, handleExcelUpload, or any function related to Excel reading, column detection, header extraction, or data validation from uploaded spreadsheets. Also use when the user mentions parser, parsing, Excel, planilla, columnas, or fixing extraction bugs.
---

# Excel Parsing — Validador Aduanal

## Estructura de las planillas

Las planillas de aduana tienen dos zonas claramente separadas:

### Zona de cabecera (filas 1-8)

Contiene los datos generales del embarque:
- **DDT** — Documento de Transporte
- **ORDEN / PO** — Número de orden (Purchase Order). Es el campo MÁS crítico
- **BUQUE** — Nombre del buque
- **DESTINO** — Puerto de destino
- **TERMINAL** — Terminal portuaria
- **CANAL** — Canal asignado

### Zona de contenedores (fila con headers en adelante)

Empieza en la fila donde aparecen los headers CONTENEDOR y PRECINTO. Cada fila debajo es un contenedor con sus datos.

---

## Reglas de parsing de cabecera

Los valores de cabecera pueden venir en DOS formatos distintos. Siempre hay que contemplar ambos:

### Formato 1 — Celda compartida con separador
El label y el valor están en la misma celda separados por dos puntos:
```
"BUQUE:AS SABINE"
"DDT:24-001-IC04-12345"
"DESTINO:HAMBURGO"
```
Para este caso usar `extractAfterSeparator(cellText, keyword)`.

### Formato 2 — Celdas adyacentes
El label está en una celda y el valor en la celda de al lado:
```
| Celda A  | Celda B     |
|----------|-------------|
| BUQUE    | AS SABINE   |
| DDT      | 24-001-...  |
```

Siempre intentar primero el formato 1, luego el formato 2.

---

## Detección dinámica de columnas

Las columnas de la tabla de contenedores NO están en posiciones fijas. Cada planilla puede tener las columnas en orden diferente.

### Cómo detectar columnas
Buscar la fila que contiene los headers y mapear cada columna por el texto del header:
- "CONTENEDOR" o "CONTAINER" → columna de número de contenedor
- "PRECINTO" → columna de precinto aduanero
- "BULTOS" → columna de cantidad de bultos
- "PESO" → columna de peso
- "PRODUCTO" o "MERCADERÍA" → columna de descripción del producto

### NUNCA hacer esto
- Nunca hardcodear índices de columna (ej: `row[3]` para precinto)
- Nunca asumir que la tabla empieza en una fila fija
- Nunca asumir orden de columnas

---

## Variantes por origen

### Buenos Aires (default)
- Planilla estándar
- Se aplica cuando el filename NO contiene "REMISION"

### Bahía Blanca
- Se detecta cuando el filename contiene "REMISION"
- Terminal se fuerza a "PTN"
- Puede tener ligeras diferencias en la disposición de headers

La detección es por nombre de archivo, no por contenido.

---

## Reglas de validación y tolerancia

El parser es PERMISIVO por diseño. La filosofía es: extraer todo lo posible y avisar, no bloquear.

### Único motivo de rechazo
- **PO/ORDEN faltante** → `{error: 'reason'}`. Sin PO no se puede identificar la orden.

### Warnings (NO rechazan)
- DDT con formato inválido o faltante → `warnings.push('...')`
- Bultos > 250 → warning "posible columna incorrecta leída"
- Múltiples productos en una misma orden → alert amarillo en UI
- Campos de cabecera faltantes (buque, destino, etc.) → warning

### Retorno de parseExcelSheet
SIEMPRE debe devolver uno de estos dos formatos:
```javascript
// Éxito (con o sin warnings):
{ po: '...', ddt: '...', buque: '...', warnings: [] }

// Error:
{ error: 'Motivo del rechazo' }
```
NUNCA devolver `null`, `undefined`, o un objeto sin la propiedad `warnings`.

---

## Datos de contenedores

### Precinto aduanero
- `precinto_aduana` es UNIQUE a nivel GLOBAL en la base de datos
- NO es único por orden, es único entre TODAS las órdenes
- Si se encuentra un precinto duplicado es un error real de datos, no del parser

### Bultos
- Valor numérico entero
- Si es > 250, probablemente se leyó la columna incorrecta → generar warning
- Si no es numérico, intentar limpiar (quitar espacios, puntos de miles)

---

## Multi-archivo y multi-sheet

`handleExcelUpload` procesa múltiples archivos y múltiples hojas por archivo:
- Cada hoja se parsea independientemente con `parseExcelSheet`
- Un error en una hoja NO debe bloquear el resto
- Al final se muestra un modal resumen con éxitos, warnings y errores por hoja

---

## Errores comunes a evitar

1. No romper el parser cuando una celda viene vacía — siempre validar antes de hacer `.toString()` o `.trim()`
2. No asumir que `extractAfterSeparator` siempre encuentra el separador — puede devolver string vacío
3. No perder el array `warnings` durante el flujo — inicializarlo al principio y propagarlo siempre
4. No cambiar la constraint UNIQUE de `precinto_aduana` a per-order — es global por diseño
5. No sugerir migrar a un framework (React, Vue, etc.) — el single-file es intencional
6. No agregar dependencias npm — todo va por CDN
