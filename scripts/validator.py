"""
validator.py - Validación de documentos y datos
"""

import logging
from typing import List, Dict
from config.models import DocumentData, ValidationError, ValidationSeverity, DocumentType
from config.config import CRITICAL_FIELDS, CROSS_DOCUMENT_VALIDATIONS

logger = logging.getLogger(__name__)


class DocumentValidator:
    """
    Valida documentos individuales contra reglas de negocio
    """

    def __init__(self):
        self.critical_fields = CRITICAL_FIELDS

    def validate_document(self, doc: DocumentData) -> List[ValidationError]:
        """
        Validar un documento individual
        
        Chequeos:
        1. Campos críticos no estén vacíos
        2. Formatos correctos (fechas, números, etc)
        3. Valores razonables (no negativos, ranges válidos)
        
        Args:
            doc: Documento a validar
            
        Returns:
            Lista de errores encontrados
        """
        errors = []
        
        # Obtener campos críticos para este documento
        critical_for_type = self.critical_fields.get(doc.doc_type.name, [])
        
        logger.info(f"Validando {doc.doc_type.value}: {doc.file_name}")
        
        # Verificar campos críticos no estén vacíos
        for field in critical_for_type:
            value = doc.extracted_data.get(field)
            
            if value is None or value == "":
                error = ValidationError(
                    document_type=doc.doc_type,
                    field=field,
                    message=f"Campo obligatorio vacío: {field}",
                    severity=ValidationSeverity.CRITICAL,
                    expected_value="No vacío",
                    actual_value=str(value)
                )
                errors.append(error)
                logger.warning(f"Campo vacío: {field}")
        
        # Validaciones específicas por tipo de documento
        if doc.doc_type == DocumentType.BL:
            errors.extend(self._validate_bl(doc))
        elif doc.doc_type == DocumentType.COD:
            errors.extend(self._validate_cod(doc))
        elif doc.doc_type == DocumentType.BOOKING:
            errors.extend(self._validate_booking(doc))
        elif doc.doc_type == DocumentType.ADUANA:
            errors.extend(self._validate_aduana(doc))
        elif doc.doc_type == DocumentType.FACTURA:
            errors.extend(self._validate_factura(doc))
        
        doc.validation_errors.extend(errors)
        return errors

    def _validate_bl(self, doc: DocumentData) -> List[ValidationError]:
        """Validaciones específicas para BL"""
        errors = []
        
        # Validar que cantidad sea un número positivo
        cantidad = doc.extracted_data.get("cantidad")
        if cantidad is not None and cantidad != "":
            try:
                if float(cantidad) <= 0:
                    error = ValidationError(
                        document_type=DocumentType.BL,
                        field="cantidad",
                        message="Cantidad debe ser mayor a cero",
                        severity=ValidationSeverity.CRITICAL,
                        expected_value=">0",
                        actual_value=str(cantidad)
                    )
                    errors.append(error)
            except ValueError:
                error = ValidationError(
                    document_type=DocumentType.BL,
                    field="cantidad",
                    message="Cantidad debe ser un número válido",
                    severity=ValidationSeverity.CRITICAL,
                    actual_value=str(cantidad)
                )
                errors.append(error)
        
        # Validar que peso sea un número positivo
        pesos = doc.extracted_data.get("pesos")
        if pesos is not None and pesos != "":
            try:
                if float(pesos) <= 0:
                    error = ValidationError(
                        document_type=DocumentType.BL,
                        field="pesos",
                        message="Peso debe ser mayor a cero",
                        severity=ValidationSeverity.CRITICAL,
                        expected_value=">0",
                        actual_value=str(pesos)
                    )
                    errors.append(error)
            except ValueError:
                error = ValidationError(
                    document_type=DocumentType.BL,
                    field="pesos",
                    message="Peso debe ser un número válido",
                    severity=ValidationSeverity.CRITICAL,
                    actual_value=str(pesos)
                )
                errors.append(error)
        
        # Validar consignee y notify no sean iguales
        consignee = doc.extracted_data.get("consignee", "").strip().upper()
        notify = doc.extracted_data.get("notify", "").strip().upper()
        
        if consignee and notify and consignee == notify:
            error = ValidationError(
                document_type=DocumentType.BL,
                field="notify",
                message="Consignee y Notify no deben ser iguales",
                severity=ValidationSeverity.HIGH,
                actual_value=notify
            )
            errors.append(error)
        
        return errors

    def _validate_cod(self, doc: DocumentData) -> List[ValidationError]:
        """Validaciones específicas para COD"""
        errors = []
        
        # Validar que valor_declarado sea un número positivo
        valor = doc.extracted_data.get("valor_declarado")
        if valor is not None and valor != "":
            try:
                if float(valor) <= 0:
                    error = ValidationError(
                        document_type=DocumentType.COD,
                        field="valor_declarado",
                        message="Valor declarado debe ser mayor a cero",
                        severity=ValidationSeverity.CRITICAL,
                        expected_value=">0",
                        actual_value=str(valor)
                    )
                    errors.append(error)
            except ValueError:
                error = ValidationError(
                    document_type=DocumentType.COD,
                    field="valor_declarado",
                    message="Valor declarado debe ser un número válido",
                    severity=ValidationSeverity.CRITICAL,
                    actual_value=str(valor)
                )
                errors.append(error)
        
        return errors

    def _validate_booking(self, doc: DocumentData) -> List[ValidationError]:
        """Validaciones específicas para Booking Advice"""
        errors = []
        return errors

    def _validate_aduana(self, doc: DocumentData) -> List[ValidationError]:
        """Validaciones específicas para Planilla de Aduana"""
        errors = []
        
        # Validar cantidad de contenedores sea número entero positivo
        cantidad_cont = doc.extracted_data.get("cantidad_contenedores")
        if cantidad_cont is not None and cantidad_cont != "":
            try:
                if int(cantidad_cont) <= 0:
                    error = ValidationError(
                        document_type=DocumentType.ADUANA,
                        field="cantidad_contenedores",
                        message="Cantidad de contenedores debe ser mayor a cero",
                        severity=ValidationSeverity.CRITICAL,
                        expected_value=">0",
                        actual_value=str(cantidad_cont)
                    )
                    errors.append(error)
            except ValueError:
                error = ValidationError(
                    document_type=DocumentType.ADUANA,
                    field="cantidad_contenedores",
                    message="Cantidad de contenedores debe ser un número entero",
                    severity=ValidationSeverity.CRITICAL,
                    actual_value=str(cantidad_cont)
                )
                errors.append(error)
        
        return errors

    def _validate_factura(self, doc: DocumentData) -> List[ValidationError]:
        """Validaciones específicas para Factura"""
        errors = []
        
        # Validar que total sea igual a cantidad × valor_unitario
        cantidad = doc.extracted_data.get("cantidad")
        valor_unitario = doc.extracted_data.get("valor_unitario")
        total = doc.extracted_data.get("total")
        
        if cantidad and valor_unitario and total:
            try:
                cant_num = float(cantidad)
                valor_num = float(valor_unitario)
                total_num = float(total)
                
                expected_total = cant_num * valor_num
                
                # Permitir pequeña tolerancia por redondeo (1%)
                tolerance = expected_total * 0.01
                
                if abs(total_num - expected_total) > tolerance:
                    error = ValidationError(
                        document_type=DocumentType.FACTURA,
                        field="total",
                        message=f"Total no coincide: {total} ≠ {cantidad} × {valor_unitario}",
                        severity=ValidationSeverity.HIGH,
                        expected_value=str(expected_total),
                        actual_value=str(total_num)
                    )
                    errors.append(error)
            except ValueError:
                pass  # Ya fue validado en validación general
        
        return errors


class CrossDocumentValidator:
    """
    Valida consistencia entre documentos
    """

    def __init__(self):
        self.cross_validations = CROSS_DOCUMENT_VALIDATIONS

    def validate_cross_documents(self, documents: Dict[str, DocumentData]) -> List[ValidationError]:
        """
        Validar que datos críticos coincidan entre documentos
        
        Args:
            documents: Dict con documentos {doc_type: DocumentData}
            
        Returns:
            Lista de errores de inconsistencia
        """
        errors = []
        
        logger.info("Validando consistencia entre documentos")
        
        for validation in self.cross_validations:
            doc1_type = validation["doc1"]
            doc2_type = validation["doc2"]
            field1 = validation["field1"]
            field2 = validation["field2"]
            severity = validation["severity"]
            
            doc1 = documents.get(doc1_type)
            doc2 = documents.get(doc2_type)
            
            # Solo validar si ambos documentos existen
            if not (doc1 and doc2):
                continue
            
            value1 = doc1.extracted_data.get(field1, "").strip().upper()
            value2 = doc2.extracted_data.get(field2, "").strip().upper()
            
            # Saltar si alguno está vacío
            if not value1 or not value2:
                continue
            
            if value1 != value2:
                error = ValidationError(
                    document_type=doc1.doc_type,
                    field=f"{field1} vs {doc2_type}.{field2}",
                    message=f"Inconsistencia: {doc1_type}.{field1} no coincide con {doc2_type}.{field2}",
                    severity=ValidationSeverity[severity],
                    expected_value=value2,
                    actual_value=value1
                )
                errors.append(error)
                logger.warning(f"Inconsistencia detectada: {validation['name']}")
        
        return errors