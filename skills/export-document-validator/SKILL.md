---
name: export-document-validator
description: Valida documentos de exportación (BL, COD, Booking, Aduana, Factura) detectando campos faltantes, valores inválidos e inconsistencias entre documentos. Analiza Bills of Lading, Certificados de Origen, Booking Advice, Planillas de Aduana y Facturas Comerciales para garantizar que todos los datos críticos (producto, cantidad, pesos, contenedores, precintos, consignee, notify) sean correctos y consistentes. Genera reportes detallados de errores por severidad (CRÍTICA, ALTA, MEDIA, BAJA). Usa este skill siempre que necesites validar documentación de exportaciones marítimas.
---

# Export Document Validator

Skill especializado en validación de documentación de exportaciones marítimas internacionales.

## ¿Cuándo usar este skill?

- Validar **Bills of Lading (BL)** - Verificar datos críticos: producto, cantidad, pesos, contenedores, precintos, consignee, notify
- Validar **Certificados de Origen (COD)** - Confirmar producto y valor declarado
- Validar **Booking Advice** - Asegurar que consignee y notify coincidan con el BL
- Validar **Planilla de Aduana** - Verificar contenedores, precintos, pesos, permisos
- Validar **Facturas Comerciales** - Confirmar descripciones, cantidades, valores
- Detectar **inconsistencias entre documentos** - Asegurar que datos coincidan entre BL, Booking, Aduana
- Generar **reportes de validación** - Crear informes detallados de errores encontrados

## Validaciones por documento

### Bill of Lading (BL)
Campos obligatorios: producto, cantidad (>0), pesos (>0), contenedores, precintos, consignee, notify
Reglas: Consignee ≠ Notify, cantidades positivas

### Certificado de Origen (COD)
Campos obligatorios: producto, país, valor_declarado (>0), número_certificado
Reglas: Valor positivo, producto coincide con BL

### Booking Advice
Campos obligatorios: consignee, notify, descripción_cargo, contenedores
Reglas: consignee = BL.consignee, notify = BL.notify

### Planilla de Aduana
Campos obligatorios: contenedores, precintos, pesos, permiso_exportacion, cantidad_contenedores
Reglas: contenedores = BL, precintos = BL, pesos ≈ BL (±1%)

### Factura Comercial
Campos obligatorios: descripción, cantidad (>0), valor_unitario (>0), total, moneda
Reglas: total = cantidad × valor_unitario (±1%), producto = BL

## Validaciones transversales

- BL.consignee == BOOKING.consignee (CRÍTICA)
- BL.notify == BOOKING.notify (CRÍTICA)
- BL.contenedores == ADUANA.contenedores (CRÍTICA)
- BL.precintos == ADUANA.precintos (CRÍTICA)
- BL.pesos ≈ ADUANA.pesos (ALTA, ±1%)

## Severidades

- **CRÍTICA**: Error que bloquea exportación
- **ALTA**: Error importante, requiere corrección
- **MEDIA**: Inconsistencia menor
- **BAJA**: Advertencia informativa