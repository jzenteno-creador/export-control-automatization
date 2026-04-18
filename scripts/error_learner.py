"""
error_learner.py - Sistema que aprende de los errores
Predice riesgos y sugiere correcciones basadas en historial
"""

import logging
from typing import Dict, List, Optional
from scripts.error_database import ErrorDatabase
from config.models import ValidationError, DocumentType

logger = logging.getLogger(__name__)


class ErrorLearner:
    """
    Sistema inteligente que aprende de errores anteriores
    """

    def __init__(self, error_db: ErrorDatabase):
        """
        Inicializar learner con base de datos de errores
        
        Args:
            error_db: Instancia de ErrorDatabase
        """
        self.db = error_db
        logger.info("ErrorLearner inicializado")

    def analyze_document(self, document_data: Dict, client: str) -> Dict:
        """
        Analizar un documento y proporcionar predicciones de riesgo
        
        Args:
            document_data: Datos extraídos del documento
            client: Nombre del cliente
            
        Returns:
            {
                'risk_level': 'HIGH/MEDIUM/LOW',
                'alerts': [...],
                'suggestions': [...],
                'high_risk_fields': [...]
            }
        """
        doc_type = document_data.get('document_type', 'UNKNOWN')
        
        # Obtener patrones históricos del cliente
        client_patterns = self.db.get_client_patterns(client)
        
        if client_patterns.get('total_errors') == 0:
            return {
                'risk_level': 'LOW',
                'alerts': [],
                'suggestions': [],
                'high_risk_fields': []
            }
        
        # Identificar campos de riesgo
        high_risk_fields = client_patterns.get('error_count_by_field', {})
        
        # Generar alertas
        alerts = []
        for field, count in high_risk_fields.items():
            if count >= 2:
                alerts.append({
                    'field': field,
                    'message': f"⚠️  Campo problemático: '{field}' ha tenido {count} errores en el pasado",
                    'severity': 'HIGH' if count >= 3 else 'MEDIUM'
                })
        
        # Generar sugerencias
        suggestions = []
        for field in document_data.keys():
            suggestion = self.db.suggest_fix(client, field, doc_type)
            if suggestion:
                suggestions.append({
                    'field': field,
                    'suggestion': suggestion
                })
        
        # Determinar nivel de riesgo
        uncorrected = client_patterns.get('uncorrected_errors', 0)
        risk_level = 'HIGH' if uncorrected >= 3 else 'MEDIUM' if uncorrected >= 1 else 'LOW'
        
        return {
            'risk_level': risk_level,
            'alerts': alerts,
            'suggestions': suggestions,
            'high_risk_fields': list(high_risk_fields.keys())
        }

    def record_validation_error(self,
                               client: str,
                               error: ValidationError):
        """
        Registrar un error de validación en la base de datos
        
        Args:
            client: Cliente que reportó el error
            error: Objeto ValidationError
        """
        self.db.record_error(
            client=client,
            document_type=error.document_type.value,
            field=error.field,
            error_type=self._classify_error_type(error),
            expected_value=error.expected_value,
            actual_value=error.actual_value,
            severity=error.severity.value
        )
        logger.info(f"✅ Error registrado para {client}: {error.field}")

    def _classify_error_type(self, error: ValidationError) -> str:
        """
        Clasificar el tipo de error
        
        Returns: 'missing', 'invalid', 'format', 'mismatch'
        """
        message_lower = error.message.lower()
        
        if 'empty' in message_lower or 'missing' in message_lower:
            return 'missing'
        elif 'mismatch' in message_lower or 'not equal' in message_lower:
            return 'mismatch'
        elif 'format' in message_lower or 'invalid' in message_lower:
            return 'format'
        else:
            return 'invalid'

    def predict_client_risk(self, client: str) -> Dict:
        """
        Predecir el nivel de riesgo de un cliente
        
        Returns:
            {
                'client': 'XYZ Corp',
                'risk_score': 75,  # 0-100
                'risk_level': 'HIGH',
                'main_issues': ['precintos', 'consignee'],
                'recommendation': 'Revisar manualmente antes de procesar'
            }
        """
        patterns = self.db.get_client_patterns(client)
        
        if patterns.get('total_errors') == 0:
            return {
                'client': client,
                'risk_score': 0,
                'risk_level': 'LOW',
                'main_issues': [],
                'recommendation': 'Cliente sin historial de errores'
            }
        
        # Calcular risk_score (0-100)
        total_errors = patterns.get('total_errors', 0)
        uncorrected = patterns.get('uncorrected_errors', 0)
        
        risk_score = min(100, (uncorrected / total_errors * 100) if total_errors > 0 else 0)
        risk_score = int(risk_score * 1.5)  # Multiplicar por factor
        
        # Determinar nivel
        if risk_score >= 70:
            risk_level = 'HIGH'
            recommendation = '🔴 ALTO RIESGO - Revisar manualmente cada documento'
        elif risk_score >= 40:
            risk_level = 'MEDIUM'
            recommendation = '🟡 RIESGO MEDIO - Revisar campos problemáticos'
        else:
            risk_level = 'LOW'
            recommendation = '🟢 BAJO RIESGO - Procesamiento automático OK'
        
        main_issues = list(patterns.get('error_count_by_field', {}).keys())[:3]
        
        return {
            'client': client,
            'risk_score': min(100, risk_score),
            'risk_level': risk_level,
            'main_issues': main_issues,
            'total_errors': total_errors,
            'uncorrected_errors': uncorrected,
            'recommendation': recommendation
        }

    def get_learning_insights(self) -> Dict:
        """
        Obtener insights sobre lo que el sistema ha aprendido
        
        Returns:
            {
                'most_common_errors': [...],
                'highest_risk_clients': [...],
                'most_problematic_documents': [...]
            }
        """
        stats = self.db.get_statistics()
        
        # Clientes de alto riesgo
        high_risk_clients = [
            self.predict_client_risk(client_info['client'])
            for client_info in stats.get('high_risk_clients', [])
        ]
        
        return {
            'total_errors_learned': stats['total_errors'],
            'correction_rate': stats['correction_rate'],
            'high_risk_clients': high_risk_clients,
            'severity_distribution': stats['severity_distribution']
        }

    def print_insights(self):
        """Imprimir insights de aprendizaje"""
        insights = self.get_learning_insights()
        
        print("\n" + "="*60)
        print("🧠 INSIGHTS DEL APRENDIZAJE")
        print("="*60)
        print(f"\n📊 Total de errores aprendidos: {insights['total_errors_learned']}")
        print(f"✅ Tasa de corrección: {insights['correction_rate']}")
        
        print(f"\n🔴 Clientes de alto riesgo:")
        for client_info in insights['high_risk_clients']:
            print(f"  - {client_info['client']}")
            print(f"    Risk Score: {client_info['risk_score']}/100")
            print(f"    Problemas: {', '.join(client_info['main_issues'])}")
            print(f"    {client_info['recommendation']}")
        
        print(f"\n⚠️  Distribución por severidad:")
        for severity, count in insights['severity_distribution'].items():
            print(f"  {severity}: {count} errores")
        
        print("="*60 + "\n")