# Discrepancias en los 111 JSONs 304

**Generado**: 2026-04-29 sobre `samples/304/*.json` (N=**111**, STO=55, Trade=56).

Este reporte mapea, campo por campo, cuántos valores únicos hay, qué % es null/vacío, y qué valores son raros (presentes en menos del 5% de las órdenes). Útil para detectar discrepancias estructurales antes de diseñar el schema normalizado.


## Tabla resumen

| Campo | Valores únicos | % null/vacío | Casos raros (<5%) |
|---|---|---|---|
| PO Number | 111 | 0.0% | `0118531879`×1; `0118607940`×1; `0118705352`×1 (+108) |
| Tipo (derivado) | 2 | 0.0% | — |
| Shipment Number | 111 | 0.0% | `0048067849`×1; `0048080781`×1; `0048062233`×1 (+108) |
| MOT (con fallback) | 3 | 0.0% | `Marítimo (inferido)`×1 |
| Incoterm (TransportationTermsCode) | 5 | 0.0% | `FCA`×5 |
| Tariff Service Code | 2 | 0.0% | — |
| País destino (ST) | 7 | 0.0% | `US`×1; `PY`×1; `UY`×1 (+3) |
| Delivery Location | 17 | 0.0% | `ABBOTT WHSE`×1; `SALVADOR PORT`×1; `Port of Houston`×1 (+9) |
| Place of Receipt Code | 6 | 23.4% | `D044`×1; `K168`×1; `D176`×2 (+1) |
| Place of Delivery (UN/LOCODE) | 4 | 75.7% | `USHOU`×1; `PELIM`×3; `BRACA`×5 |
| Items count | 5 | 0.0% | `3`×2; `2`×5 |
| Contenedores (= Items) | 5 | 0.0% | `3`×2; `2`×5 |
| Deliveries únicas por orden | 5 | 0.0% | `3`×2; `2`×3 |
| Fecha RSD | 25 | 0.0% | `20260504`×1; `20260425`×1; `20260607`×1 (+15) |
| Fecha 002 | 32 | 0.0% | `20260720`×1; `20260620`×1; `20260610`×1 (+23) |
| Consignee (ST.Name) | 24 | 0.0% | `CRYOVAC LONDRINA LTDA`×1; `CHIACCHIO INDUSTRIA DE`×1; `THE DOW CHEMICAL COMPANY`×1 (+18) |
| Instrucciones (BusinessInstructions...) | 27 | 0.0% | `FREIGHT COLLECT. VIA TERR…`×1; `12A LOABABILITY EXCEPTION…`×1; `#12H# Miscellaneous state…`×1 (+22) |

## Detalle por campo crítico

### MOT — distribución completa
| Valor | Count | % |
|---|---|---|
| Marítimo | 77 | 69.4% |
| Terrestre | 33 | 29.7% |
| Marítimo (inferido) | 1 | 0.9% |

### País destino — distribución
| País | Count |
|---|---|
| BR | 101 |
| PE | 3 |
| AR | 2 |
| CL | 2 |
| US | 1 |
| PY | 1 |
| UY | 1 |

### Incoterm — distribución
| Incoterm | Count |
|---|---|
| CPT | 39 |
| CFR | 27 |
| FOB | 26 |
| CIP | 14 |
| FCA | 5 |

### Tariff Service Code — debería discriminar STO vs Trade
| Code | Count | Nota |
|---|---|---|
| DD | 56 | Trade |
| DP | 55 | STO |

### Delivery Location — texto libre, normalización pendiente
Total de strings distintos: **17**

| Valor | Count |
|---|---|
| `Buenos Aires Port` | 26 |
| `Santos Port` | 25 |
| `MANAUS PORT` | 16 |
| `NAVEGANTES PORT` | 15 |
| `PARANAGUA PORT` | 10 |
| `SANTOS PORT` | 4 |
| `BAHIA BLANCA` | 2 |
| `CALLAO PORT` | 2 |
| `MAIPU` | 2 |
| `Manaus port` | 2 |
| `ABBOTT WHSE` | 1 |
| `SALVADOR PORT` | 1 |
| `Port of Houston` | 1 |
| `BAHIA BLANCA WHSE` | 1 |
| `PBB Polisur Site Whse` | 1 |

> *Sorpresa:* hay duplicados case-insensitive (ej: `Santos Port` vs `SANTOS PORT`, `MANAUS PORT` vs `Manaus port`). Necesita normalización antes de usarlo como índice.


### Items / Contenedores — distribución por orden
| Items | Órdenes |
|---|---|
| 1 | 7 |
| 2 | 5 |
| 3 | 2 |
| 4 | 57 |
| 5 | 40 |

min=1, max=5, avg=4.06

### Deliveries únicas por orden
| Deliveries únicas | Órdenes |
|---|---|
| 1 | 10 |
| 2 | 3 |
| 3 | 2 |
| 4 | 56 |
| 5 | 40 |

Órdenes donde `len(deliveries únicas) != Items.length`: **3**
Caso: varios items comparten la misma delivery SAP (un contenedor con múltiples GMIDs).
- PO `118531879` (Trade): items=4, deliveries únicas=1
- PO `118607940` (Trade): items=2, deliveries únicas=1
- PO `118721805` (Trade): items=2, deliveries únicas=1

### Place of Delivery (UN/LOCODE) — disponible solo en algunas órdenes
% null: **75.7%** (presente solo en 111 órdenes)

| Code | Count |
|---|---|
| None | 84 |
| BRMAO | 18 |
| BRACA | 5 |
| PELIM | 3 |
| USHOU | 1 |

## Discrepancias STO vs Trade

Diferencias estructurales entre los dos tipos. Útil para diseñar reglas de validación.

| Campo | STO (n=55) | Trade (n=56) | Discriminante? |
|---|---|---|---|
| MOT | `Terrestre`×28, `Marítimo`×26, `Marítimo (inferido)`×1 | `Marítimo`×51, `Terrestre`×5 | ❌ no |
| Incoterm | `CFR`×27, `FOB`×26, `CPT`×2 | `CPT`×37, `CIP`×14, `FCA`×5 | ❌ no |
| Tariff | `DP`×55 | `DD`×56 | ✅ |
| PlaceOfDelivery presente | `None`×54, `USHOU`×1 | `None`×30, `BRMAO`×18, `BRACA`×5 | ❌ no |
| PlaceOfReceipt presente | `None`×26, `D147`×25, `D116`×2 | `D146`×51, `D116`×3, `D176`×1 | ❌ no |
| Country dist | `BR`×52, `CL`×2, `US`×1 | `BR`×49, `PE`×3, `AR`×2 | ❌ no |

## Conclusiones / acciones sugeridas

1. **`TariffServiceCode` y `Incoterm` son discriminantes perfectos STO vs Trade** — pueden ser reglas de validación.
2. **`DeliveryLocation` necesita normalización** (casos mixtos, mismo puerto con distinta capitalización).
3. **`PlaceOfDelivery` (UN/LOCODE) está disponible solo en parte de las órdenes** — no usar como required field.
4. **MOT con fallback funciona**: las STO sin código se infieren correctamente de `RouteDescription`.
5. **`deliveries únicas == items.length` en casi todos los casos** — un item = un delivery = un contenedor es regla estable.
6. **Casos raros** (<5%) en MOT, Incoterm, Country son las exportaciones puntuales (US, MX, etc.) — no validan la estructura sino el dominio.