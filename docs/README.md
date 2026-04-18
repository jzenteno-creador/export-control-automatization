# Export Control Automation

Sistema automatizado para control de documentación de exportaciones marítimas.

## 📋 Objetivo

Automatizar la validación de documentación crítica en exportaciones:
- **Bill of Lading (BL)** - PDF
- **Certificado de Origen (COD)** - ZIP → XML → PDF
- **Factura Comercial** - PDF
- **Planilla de Aduana** - Excel + PDF
- **Booking Advice** - PDF (SAP)

## 🎯 Validaciones Críticas

### Por Documento:
- **BL**: producto, cantidad, pesos, contenedores, precintos, consignee, notify
- **COD**: producto, valor declarado
- **Booking Advice**: consignee, notify (debe coincidir con BL)
- **Planilla Aduana**: contenedores, precintos, pesos, permisos, cantidad de contenedores
- **Factura**: información general y consistencia

### Validaciones Transversales:
- Datos críticos deben coincidir entre documentos
- No falten campos obligatorios
- Datos no sean erróneos
- Información del producto sea correcta

## 📁 Estructura del Proyecto

```
export-control-automation/
├── config/              # Configuraciones (credenciales, rutas)
├── skills/              # Skills personalizados
│   ├── export-document-validator/
│   ├── google-drive-monitor/
│   └── export-validation-rules/
├── data/                # Datos de prueba, logs
├── scripts/             # Scripts Python para automatización
├── docs/                # Documentación del proyecto
├── tests/               # Tests unitarios
└── README.md
```

## 🔧 Skills Disponibles

### Ya Existentes (Anthropic):
- **PDF** - Extracción de datos de PDFs
- **XLSX** - Manipulación de Excel
- **DOCX** - Creación de reportes
- **PDF-READING** - Lectura avanzada de PDFs
- **FILE-READING** - Detección automática de archivos
- **FRONTEND-DESIGN** - Dashboard visual (opcional)

### Personalizados:
1. **export-document-validator** - Valida documentos y busca inconsistencias
2. **google-drive-monitor** - Monitorea Drive y sincroniza con Excel
3. **export-validation-rules** - Define reglas de validación

## 🚀 Próximos Pasos

1. Configurar credenciales de Google Drive
2. Crear skills personalizados
3. Implementar validadores
4. Crear scripts de monitoreo
5. Integrar con Excel de seguimiento (OneDriver)

## 📊 Flujo de Trabajo

1. Documento llega a carpeta DRAFT en Google Drive
2. Sistema detecta y descarga automáticamente
3. Valida contra reglas de negocio
4. Genera reporte de inconsistencias
5. Actualiza Excel de seguimiento en OneDriver
6. Notifica al equipo de documentación

---

**Lenguaje**: Python 3.9+  
**Storage**: Google Drive  
**Tracking**: Excel OneDrive  
**Objetivo**: Reducir tiempos de revisión y errores manuales
