"""
models.py - Modelos de datos para documentos y validaciones
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional
from datetime import datetime
from enum import Enum


class DocumentType(Enum):
    """Tipos de documentos"""
    BL = "Bill of Lading"
    COD = "Certificado de Origen"
    BOOKING = "Booking Advice"
    ADUANA = "Planilla de Aduana"
    FACTURA = "Factura Comercial"


class ValidationSeverity(Enum):
    """Niveles de severidad de validación"""
    CRITICAL = "CRÍTICA"
    HIGH = "ALTA"
    MEDIUM = "MEDIA"
    LOW = "BAJA"
    INFO = "INFORMACIÓN"


@dataclass
class ValidationError:
    """Representa un error de validación"""
    document_type: DocumentType
    field: str
    message: str
    severity: ValidationSeverity
    expected_value: Optional[str] = None
    actual_value: Optional[str] = None
    timestamp: datetime = field(default_factory=datetime.now)

    def to_dict(self):
        return {
            "documento": self.document_type.value,
            "campo": self.field,
            "mensaje": self.message,
            "severidad": self.severity.value,
            "valor_esperado": self.expected_value,
            "valor_actual": self.actual_value,
            "fecha": self.timestamp.isoformat()
        }


@dataclass
class DocumentData:
    """Datos extraídos de un documento"""
    doc_type: DocumentType
    file_name: str
    file_path: str
    drive_id: Optional[str] = None
    extracted_data: Dict = field(default_factory=dict)
    validation_errors: List[ValidationError] = field(default_factory=list)
    extraction_date: datetime = field(default_factory=datetime.now)
    processed: bool = False

    def add_error(self, error: ValidationError):
        """Agregar error de validación"""
        self.validation_errors.append(error)

    def get_critical_errors(self) -> List[ValidationError]:
        """Obtener solo errores críticos"""
        return [e for e in self.validation_errors if e.severity == ValidationSeverity.CRITICAL]

    def has_critical_errors(self) -> bool:
        """¿Tiene errores críticos?"""
        return len(self.get_critical_errors()) > 0

    def to_dict(self):
        return {
            "tipo": self.doc_type.value,
            "archivo": self.file_name,
            "datos_extraidos": self.extracted_data,
            "errores": [e.to_dict() for e in self.validation_errors],
            "criticos": len(self.get_critical_errors()),
            "total_errores": len(self.validation_errors),
            "procesado": self.processed,
        }


@dataclass
class ExportOrder:
    """Representa una orden de exportación con todos sus documentos"""
    order_number: str
    bl_document: Optional[DocumentData] = None
    cod_document: Optional[DocumentData] = None
    booking_document: Optional[DocumentData] = None
    aduana_document: Optional[DocumentData] = None
    factura_document: Optional[DocumentData] = None
    created_date: datetime = field(default_factory=datetime.now)
    all_validations_passed: bool = False
    validation_timestamp: Optional[datetime] = None

    def add_document(self, doc: DocumentData):
        """Agregar documento a la orden"""
        if doc.doc_type == DocumentType.BL:
            self.bl_document = doc
        elif doc.doc_type == DocumentType.COD:
            self.cod_document = doc
        elif doc.doc_type == DocumentType.BOOKING:
            self.booking_document = doc
        elif doc.doc_type == DocumentType.ADUANA:
            self.aduana_document = doc
        elif doc.doc_type == DocumentType.FACTURA:
            self.factura_document = doc

    def get_all_documents(self) -> List[DocumentData]:
        """Obtener todos los documentos de la orden"""
        docs = []
        if self.bl_document:
            docs.append(self.bl_document)
        if self.cod_document:
            docs.append(self.cod_document)
        if self.booking_document:
            docs.append(self.booking_document)
        if self.aduana_document:
            docs.append(self.aduana_document)
        if self.factura_document:
            docs.append(self.factura_document)
        return docs

    def get_all_errors(self) -> List[ValidationError]:
        """Obtener todos los errores de la orden"""
        errors = []
        for doc in self.get_all_documents():
            errors.extend(doc.validation_errors)
        return errors

    def get_critical_errors(self) -> List[ValidationError]:
        """Obtener solo errores críticos"""
        return [e for e in self.get_all_errors() if e.severity == ValidationSeverity.CRITICAL]

    def summary(self) -> Dict:
        """Resumen de la validación"""
        all_errors = self.get_all_errors()
        critical = self.get_critical_errors()
        
        return {
            "numero_orden": self.order_number,
            "documentos_totales": len(self.get_all_documents()),
            "documentos_presentes": sum(1 for d in self.get_all_documents() if d is not None),
            "total_errores": len(all_errors),
            "errores_criticos": len(critical),
            "validacion_exitosa": self.all_validations_passed,
            "fecha_validacion": self.validation_timestamp.isoformat() if self.validation_timestamp else None,
            "documentos": {d.doc_type.name: d.to_dict() for d in self.get_all_documents()}
        }