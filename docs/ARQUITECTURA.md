# Documentación Técnica - Export Control Automation

## 📐 Arquitectura del Sistema

### Componentes Principales

```
┌─────────────────────────────────────────────────────────────┐
│                    GOOGLE DRIVE                              │
│  (BL DRAFT, COD ZIP, COD PDF, BOOKING, PLANILLA ADUANA)     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              GOOGLE DRIVE MONITOR (Skill)                    │
│  - Detecta archivos nuevos                                  │
│  - Descarga automáticamente                                 │
│  - Organiza por tipo de documento                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│          DOCUMENT READER & EXTRACTOR                         │
│  - Extrae datos de PDFs, Excel, ZIP                         │
│  - Usa Skills: PDF, PDF-READING, XLSX, FILE-READING        │
│  - Produce datos estructurados                              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│          EXPORT DOCUMENT VALIDATOR (Skill)                  │
│  - Valida campos críticos por documento                     │
│  - Valida consistencia entre documentos                     │
│  - Genera reporte de errores                                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│          EXPORT VALIDATION RULES (Skill)                    │
│  - Define reglas de negocio                                 │
│  - Mantiene checklists                                      │
│  - Auditoría de cambios                                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│         REPORT GENERATOR & EXCEL UPDATER                    │
│  - Genera reportes de revisión                              │
│  - Actualiza Excel de seguimiento en OneDrive               │
│  - Notifica al equipo de documentación                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│            ONEDRIVE EXCEL TRACKING                           │
│  (PROGRAMA MARITIMO NW SSB 2026 - Solapa Reservas)          │
└─────────────────────────────────────────────────────────────┘
```

## 🔄 Flujo de Procesamiento

### Fase 1: Monitoreo y Descarga
1. Sistema monitorea carpetas en Google Drive
2. Detecta nuevos archivos en BL DRAFT, COD ZIP, etc
3. Descarga archivos automáticamente a storage local
4. Organiza por tipo de documento

### Fase 2: Extracción de Datos
1. Lee documento según formato (PDF, Excel, ZIP)
2. Extrae campos críticos usando patrones y OCR si necesario
3. Estructura datos en modelo DocumentData
4. Genera metadata de extracción

### Fase 3: Validación Individual
1. Valida campos críticos no estén vacíos
2. Valida formatos correctos (números, fechas)
3. Valida rangos válidos (positivos, sensatos)
4. Registra errores encontrados

### Fase 4: Validación Transversal
1. Compara datos entre documentos
2. Busca inconsistencias (ej: consignee no coincide)
3. Verifica suma de contenedores, precintos
4. Genera lista de discrepancias

### Fase 5: Reporte y Actualización
1. Genera reporte de revisión
2. Actualiza Excel de seguimiento con resultados
3. Notifica al equipo de documentación
4. Archiva documentos validados

## 📦 Estructura de Datos

### DocumentData
```python
class DocumentData:
    doc_type: DocumentType           # BL, COD, BOOKING, ADUANA, FACTURA
    file_name: str                   # nombre del archivo
    file_path: str                   # ruta local
    drive_id: Optional[str]          # ID en Google Drive
    extracted_data: Dict             # datos extraídos del documento
    validation_errors: List[...]     # errores encontrados
    extraction_date: datetime        # cuándo se extrajo
    processed: bool                  # si fue procesado
```

### ExportOrder
```python
class ExportOrder:
    order_number: str                # número de orden (de Excel)
    bl_document: DocumentData        # BL asociado
    cod_document: DocumentData       # COD asociado
    booking_document: DocumentData   # Booking Advice
    aduana_document: DocumentData    # Planilla Aduana
    factura_document: DocumentData   # Factura Comercial
    all_validations_passed: bool     # validación exitosa
    validation_timestamp: datetime   # cuándo se validó
```

## 🔍 Validaciones Críticas

### Nivel 1: Validación Individual
- **BL**: producto, cantidad, pesos, contenedores, precintos, consignee, notify
- **COD**: producto, valor_declarado
- **BOOKING**: consignee, notify
- **ADUANA**: contenedores, precintos, pesos, permisos, cantidad_contenedores
- **FACTURA**: descripción, cantidad, valor_unitario, total

### Nivel 2: Validaciones Transversales
- `BL.consignee == BOOKING.consignee` (CRÍTICA)
- `BL.notify == BOOKING.notify` (CRÍTICA)
- `BL.contenedores == ADUANA.contenedores` (CRÍTICA)
- `BL.precintos == ADUANA.precintos` (CRÍTICA)
- `BL.pesos == ADUANA.pesos` (ALTA)

### Nivel 3: Validaciones de Negocio
- Cantidad > 0
- Pesos > 0
- Valor declarado > 0
- Total = Cantidad × Valor Unitario (tolerancia 1%)
- Consignee ≠ Notify

## 📊 Reportes Generados

### Reporte por Documento
- Tipo de documento
- Datos extraídos
- Errores encontrados (por severidad)
- Marca de tiempo

### Reporte de Orden Completa
- Número de orden
- Documentos presentes/faltantes
- Total de errores
- Errores críticos
- Recomendación: APROBADO / RECHAZADO / PENDIENTE CORRECCIÓN

### Reporte de Auditoría
- Cambios realizados
- Quién revisó
- Cuándo
- Estado anterior/nuevo

## 🛠️ Tecnologías Utilizadas

- **Lenguaje**: Python 3.9+
- **APIs**: Google Drive API v3, Microsoft Graph (OneDrive)
- **Skills de Anthropic**: PDF, XLSX, PDF-READING, FILE-READING, FRONTEND-DESIGN
- **Librerías**: 
  - google-auth-oauthlib (Google Drive)
  - openpyxl (Excel)
  - pypdf (PDF)
  - requests (HTTP)

## 📝 Próximas Fases de Implementación

1. **Fase 1** (ACTUAL): Estructura base y modelos de datos ✅
2. **Fase 2**: Integración con Google Drive API
3. **Fase 3**: Implementar extractores específicos por documento
4. **Fase 4**: Crear skills personalizados
5. **Fase 5**: Integración con Excel OneDrive
6. **Fase 6**: Testing y ajustes
7. **Fase 7**: Deployment y monitoreo

## 🔐 Seguridad y Credenciales

- Credentials.json: Guardar en `config/credentials.json` (NO commitear)
- Token.pickle: Guardar en `config/token.pickle` (NO commitear)
- Variables de entorno para rutas sensibles
- Logs encriptados para datos sensibles

## 📈 Métricas y KPIs

- Tiempo promedio de revisión por documento
- Errores detectados automáticamente vs manuales
- Tasa de consistencia entre documentos
- Documentos procesados por día
- Tiempo de respuesta del sistema
