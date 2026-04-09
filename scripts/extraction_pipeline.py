"""
extraction_pipeline.py - Pipeline completo de extracción y aprendizaje
Integra: lectura de documentos + validación + aprendizaje
"""

import logging
from pathlib import Path
from typing import Dict, List, Optional
from scripts.data_extractor import DataExtractor
from scripts.validator import DocumentValidator, CrossDocumentValidator
from scripts.error_database import ErrorDatabase
from scripts.error_learner import ErrorLearner
from config.models import DocumentData, DocumentType, ExportOrder

logger = logging.getLogger(__name__)


class ExtractionPipeline:
    """
    Pipeline completo: Lectura → Validación → Aprendizaje
    """

    def __init__(self):
        """Inicializar pipeline"""
        self.extractor = DataExtractor()
        self.validator = DocumentValidator()
        self.cross_validator = CrossDocumentValidator()
        self.error_db = ErrorDatabase()
        self.learner = ErrorLearner(self.error_db)
        
        logger.info("✅ ExtractionPipeline inicializado")

    def process_bl(self, pdf_path: str, client: str) -> DocumentData:
        """Procesar Bill of Lading"""
        logger.info(f"📄 Procesando BL: {pdf_path}")
        
        extracted_data = self.extractor.extract_bl_data(pdf_path)
        
        doc = DocumentData(
            doc_type=DocumentType.BL,
            file_name=Path(pdf_path).name,
            file_path=pdf_path,
            extracted_data=extracted_data
        )
        
        # Análisis de riesgo
        risk_analysis = self.learner.analyze_document(extracted_data, client)
        
        if risk_analysis['alerts']:
            print(f"\n⚠️  ALERTAS PREVENTIVAS para {client}:")
            for alert in risk_analysis['alerts']:
                print(f"  🔴 {alert['message']}")
        
        # Validación
        errors = self.validator.validate_document(doc)
        
        # Registrar en base de datos
        for error in errors:
            self.learner.record_validation_error(client, error)
        
        doc.validation_errors = errors
        logger.info(f"✅ BL procesado: {len(errors)} errores")
        return doc

    def process_cod(self, xml_path: str, client: str) -> DocumentData:
        """Procesar Certificado de Origen"""
        logger.info(f"📄 Procesando COD: {xml_path}")
        
        extracted_data = self.extractor.extract_cod_data(xml_path)
        
        doc = DocumentData(
            doc_type=DocumentType.COD,
            file_name=Path(xml_path).name,
            file_path=xml_path,
            extracted_data=extracted_data
        )
        
        errors = self.validator.validate_document(doc)
        
        for error in errors:
            self.learner.record_validation_error(client, error)
        
        doc.validation_errors = errors
        logger.info(f"✅ COD procesado: {len(errors)} errores")
        return doc

    def process_booking(self, pdf_path: str, client: str) -> DocumentData:
        """Procesar Booking Advice"""
        logger.info(f"📄 Procesando Booking: {pdf_path}")
        
        extracted_data = self.extractor.extract_booking_data(pdf_path)
        
        doc = DocumentData(
            doc_type=DocumentType.BOOKING,
            file_name=Path(pdf_path).name,
            file_path=pdf_path,
            extracted_data=extracted_data
        )
        
        errors = self.validator.validate_document(doc)
        
        for error in errors:
            self.learner.record_validation_error(client, error)
        
        doc.validation_errors = errors
        logger.info(f"✅ Booking procesado: {len(errors)} errores")
        return doc

    def process_aduana(self, excel_path: str, client: str) -> DocumentData:
        """Procesar Planilla de Aduana"""
        logger.info(f"📄 Procesando Aduana: {excel_path}")
        
        extracted_data = self.extractor.extract_aduana_data(excel_path)
        
        doc = DocumentData(
            doc_type=DocumentType.ADUANA,
            file_name=Path(excel_path).name,
            file_path=excel_path,
            extracted_data=extracted_data
        )
        
        errors = self.validator.validate_document(doc)
        
        for error in errors:
            self.learner.record_validation_error(client, error)
        
        doc.validation_errors = errors
        logger.info(f"✅ Aduana procesado: {len(errors)} errores")
        return doc

    def process_factura(self, excel_path: str, client: str) -> DocumentData:
        """Procesar Factura Comercial"""
        logger.info(f"📄 Procesando Factura: {excel_path}")
        
        extracted_data = self.extractor.extract_factura_data(excel_path)
        
        doc = DocumentData(
            doc_type=DocumentType.FACTURA,
            file_name=Path(excel_path).name,
            file_path=excel_path,
            extracted_data=extracted_data
        )
        
        errors = self.validator.validate_document(doc)
        
        for error in errors:
            self.learner.record_validation_error(client, error)
        
        doc.validation_errors = errors
        logger.info(f"✅ Factura procesada: {len(errors)} errores")
        return doc

    def print_summary(self, order: ExportOrder, risk_prediction: Dict):
        """Imprimir resumen de resultados"""
        print("\n" + "="*60)
        print("📊 RESUMEN DE VALIDACIÓN")
        print("="*60)
        
        total_errors = 0
        for doc_type, doc in order.documents.items():
            error_count = len(doc.validation_errors)
            total_errors += error_count
            status = "✅ OK" if error_count == 0 else f"❌ {error_count} errores"
            print(f"{doc_type:12} {status}")
        
        cross_errors = len(order.cross_validation_errors)
        if cross_errors > 0:
            print(f"\n⚠️  Errores transversales: {cross_errors}")
        
        print(f"\n🔮 PREDICCIÓN DE RIESGO:")
        print(f"   Cliente: {risk_prediction['client']}")
        print(f"   Risk Score: {risk_prediction['risk_score']}/100")
        print(f"   Nivel: {risk_prediction['risk_level']}")
        print(f"   {risk_prediction['recommendation']}")
        
        print(f"\n📋 RECOMENDACIÓN FINAL:")
        
        if total_errors + cross_errors == 0:
            print("   ✅ APROBADO - Sin errores detectados")
            recommendation = "APPROVED"
        elif risk_prediction['risk_level'] == 'HIGH':
            print("   🔴 RECHAZADO - Cliente de alto riesgo")
            recommendation = "REJECTED"
        else:
            print("   🟡 PENDIENTE REVISIÓN - Hay errores a corregir")
            recommendation = "PENDING_CORRECTION"
        
        order.status = recommendation
        print("="*60 + "\n")

    def get_learning_summary(self):
        """Obtener resumen de lo que el sistema ha aprendido"""
        print("\n" + "="*60)
        print("🧠 RESUMEN DE APRENDIZAJE DEL SISTEMA")
        print("="*60)
        
        self.error_db.print_summary()
        self.learner.print_insights()   