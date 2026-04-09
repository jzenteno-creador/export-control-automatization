---
name: export-validation-rules
description: Define y mantiene las reglas de negocio para validación de exportaciones. Centraliza criterios de validación, checklists de documentos, reglas de consistencia entre archivos, y severidad de errores. Documenta qué campos son obligatorios, qué valores son válidos, y qué datos deben coincidir entre documentos. Proporciona auditoría de cambios en reglas. Usa este skill para entender, modificar, o revisar las reglas de validación que se aplican a toda la documentación de exportaciones.
---

# Export Validation Rules

Skill para gestión centralizada de reglas de negocio de validación de exportaciones.

## ¿Cuándo usar este skill?

- **Entender las reglas** - Conocer qué validaciones se aplican a cada documento
- **Campos obligatorios** - Consultar qué datos DEBEN estar presentes
- **Reglas de validación** - Saber qué formatos y valores son válidos
- **Validaciones cruzadas** - Entender qué datos deben coincidir entre documentos
- **Severidades** - Comprender niveles de error (CRÍTICA, ALTA, MEDIA, BAJA)
- **Modificar reglas** - Agregar nuevas validaciones o cambiar existentes
- **Auditoría** - Revisar qué reglas cambiaron y cuándo

## Campos obligatorios por documento

### Bill of Lading (BL)
```
✓ Producto/Descripción
✓ Cantidad (número > 0)
✓ Pesos Totales (número > 0)
✓ Números de Contenedores (formato: 20FT, 40FT, etc)
✓ Números de Precintos (formato: ABC123)
✓ Consignee - Importador (nombre/empresa)
✓ Notify - Notificar a (nombre/empresa)
✓ Incoterm (CIF, FOB, etc)
✓ Puerto de origen y destino
```

### Certificado de Origen (COD)
```
✓ Producto/Descripción
✓ País de Origen
✓ Valor Declarado (número > 0)
✓ Número de Certificado
✓ Autoridad Emisora
✓ Fecha de emisión
```

### Booking Advice (SAP)
```
✓ Consignee
✓ Notify
✓ Descripción de Cargo
✓ Números de Contenedores
✓ Cantidades
✓ Línea Naviera
✓ Fecha de Corte
```

### Planilla de Aduana
```
✓ Números de Contenedores
✓ Números de Precintos
✓ Pesos Totales
✓ Permiso de Exportación (número)
✓ Cantidad de Contenedores (número > 0)
✓ Clasificación Arancelaria
✓ País de Destino
```

### Factura Comercial
```
✓ Descripción del Producto
✓ Cantidad (número > 0)
✓ Valor Unitario (número > 0)
✓ Total (= Cantidad × Valor Unitario ±1%)
✓ Moneda
✓ Incoterm
✓ Datos del Vendedor y Comprador
```

## Validaciones de formato

### Números
- Cantidad: entero positivo (>0)
- Pesos: decimal positivo (>0)
- Valores: decimal positivo (>0)
- Tolerancia en cálculos: ±1%

### Textos
- Consignee/Notify: mínimo 3 caracteres, máximo 100
- Producto: mínimo 5 caracteres, máximo 200
- No pueden estar vacíos o ser "N/A" genéricos

### Contenedores
- Formato: número + tipo (20FT, 40FT, 40HC, etc)
- Ejemplo válido: MAEU123456, HAPAG234567
- Máximo 11 caracteres alfanuméricos

### Precintos
- Formato: código alfanumérico
- Ejemplo válido: ABC123, PRECINTO-001
- Separados por comas si hay múltiples

## Validaciones transversales

| Validación | Doc1 | Doc2 | Campo | Severidad | Descripción |
|-----------|------|------|-------|-----------|-------------|
| Consignee match | BL | BOOKING | consignee | CRÍTICA | Deben ser iguales exactamente |
| Notify match | BL | BOOKING | notify | CRÍTICA | Deben ser iguales exactamente |
| Contenedores match | BL | ADUANA | contenedores | CRÍTICA | Mismos números, mismo orden |
| Precintos match | BL | ADUANA | precintos | CRÍTICA | Mismos números, mismo orden |
| Pesos match | BL | ADUANA | pesos | ALTA | Diferencia máximo ±1% |
| Producto match | BL | FACTURA | producto | ALTA | Descripción similar/coincidente |
| Total match | FACTURA | - | total | ALTA | Cantidad × Precio ±1% |

## Niveles de severidad

### CRÍTICA (🔴)
- **Bloquea exportación** - No se puede procesar
- **Acción**: Detener, corregir, reenviar
- **Ejemplos**:
  - Campo obligatorio vacío
  - Consignee no coincide entre docs
  - Contenedores no coinciden

### ALTA (🟠)
- **Requiere atención** - Puede procesarse pero con reserva
- **Acción**: Revisar, validar manualmente, corregir
- **Ejemplos**:
  - Pesos con diferencia >1%
  - Valor de factura no cierra
  - Formato incorrecto en campo

### MEDIA (🟡)
- **Inconsistencia menor** - No bloquea pero debe notarse
- **Acción**: Registrar, seguimiento
- **Ejemplos**:
  - Información adicional faltante
  - Formato subóptimo pero legible
  - Datos redundantes

### BAJA (🔵)
- **Advertencia informativa** - Solo notificación
- **Acción**: Registrar para auditoría
- **Ejemplos**:
  - Campos adicionales no estándar
  - Formato alternativo aceptable
  - Notas informativas

## Checklists por documento

### BL Checklist
- [ ] Todos los campos obligatorios presentes
- [ ] Producto descripción clara (no "goods" genérico)
- [ ] Cantidad > 0 y es número
- [ ] Pesos > 0 y es número
- [ ] Contenedores con formato válido
- [ ] Precintos con formato válido
- [ ] Consignee ≠ Notify
- [ ] Puertos válidos (UNLOCODE)
- [ ] Incoterm válido (CIF, FOB, etc)
- [ ] Fechas en formato consistente

### COD Checklist
- [ ] Producto coincide con BL
- [ ] País de origen es válido (código ISO)
- [ ] Valor declarado > 0
- [ ] Certificado tiene número único
- [ ] Autoridad emisora reconocida
- [ ] Fecha vigencia válida

### Booking Checklist
- [ ] Consignee = BL.consignee exactamente
- [ ] Notify = BL.notify exactamente
- [ ] Contenedores coinciden con BL
- [ ] Cantidades coinciden con BL
- [ ] Línea naviera válida
- [ ] Corte de documentación anterior a ETD

### Aduana Checklist
- [ ] Contenedores = BL exactamente
- [ ] Precintos = BL exactamente
- [ ] Pesos ≈ BL (±1%)
- [ ] Permiso exportación presente
- [ ] Cantidad contenedores > 0
- [ ] Códigos arancelarios válidos
- [ ] País destino válido

### Factura Checklist
- [ ] Producto descripción clara
- [ ] Cantidad > 0
- [ ] Valor unitario > 0
- [ ] Total = Cantidad × Unitario ±1%
- [ ] Moneda ISO válida (USD, EUR, etc)
- [ ] Incoterm coincide con BL
- [ ] Datos vendedor/comprador completos

## Reglas de rechazo automático

Un documento es **RECHAZADO AUTOMÁTICAMENTE** si tiene:
1. Consignee vacío o missing
2. Notify vacío o missing
3. Cantidad ≤ 0 o no numérico
4. Pesos ≤ 0 o no numérico
5. Contenedores vacíos
6. Precintos vacíos
7. Consignee == Notify (en BL)
8. Inconsistencia CRÍTICA con otro documento

## Reglas de aprobación

Un documento se **APRUEBA** si:
- ✅ Cero errores CRÍTICOS
- ✅ Máximo 1 error ALTA (requiere revisión manual)
- ✅ Todos los campos obligatorios presentes
- ✅ Todos los valores en rangos válidos
- ✅ Consistencia transversal validada
- ✅ Revisor manual aprueba

Estado: **APROBADO** → Procede a exportación

## Auditoría de cambios

Cada cambio en reglas debe registrar:
- **Qué cambió**: Regla, campo, criterio
- **Cuándo**: Fecha y hora
- **Quién**: Usuario que cambió
- **Por qué**: Razón del cambio
- **Versión**: Número de versión de reglas

## Próximos pasos

1. Implementar motor de validación dinámico
2. Permitir modificación de reglas vía interfaz
3. Generar reportes de cambios
4. Crear tests para cada regla
5. Documentar excepciones y casos especiales