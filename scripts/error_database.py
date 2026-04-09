"""
error_database.py - Base de datos de errores para aprendizaje
Registra y analiza errores para que el sistema aprenda patrones
"""

import json
import logging
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional
from collections import defaultdict

logger = logging.getLogger(__name__)


class ErrorDatabase:
    """
    Base de datos que registra errores y aprende patrones
    """

    def __init__(self, db_path: str = 'data/error_history.json'):
        """
        Inicializar base de datos de errores
        
        Args:
            db_path: Ruta del archivo JSON para guardar errores
        """
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.errors = self._load_errors()
        logger.info(f"ErrorDatabase inicializada con {len(self.errors)} errores históricos")

    def _load_errors(self) -> List[Dict]:
        """Cargar errores desde archivo JSON"""
        if self.db_path.exists():
            try:
                with open(self.db_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Error cargando DB: {e}")
                return []
        return []

    def _save_errors(self):
        """Guardar errores a archivo JSON"""
        try:
            with open(self.db_path, 'w', encoding='utf-8') as f:
                json.dump(self.errors, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Error guardando DB: {e}")

    def record_error(self, 
                    client: str,
                    document_type: str,
                    field: str,
                    error_type: str,
                    expected_value: str = None,
                    actual_value: str = None,
                    severity: str = "MEDIUM") -> Dict:
        """
        Registrar un nuevo error
        
        Args:
            client: Cliente/empresa
            document_type: Tipo de documento (BL, COD, etc)
            field: Campo con error
            error_type: Tipo de error (missing, invalid, mismatch)
            expected_value: Valor esperado
            actual_value: Valor actual
            severity: Severidad (CRITICAL, HIGH, MEDIUM, LOW)
            
        Returns:
            Diccionario del error registrado
        """
        error = {
            "id": len(self.errors) + 1,
            "timestamp": datetime.now().isoformat(),
            "client": client,
            "document_type": document_type,
            "field": field,
            "error_type": error_type,
            "expected_value": expected_value,
            "actual_value": actual_value,
            "severity": severity,
            "corrected": False
        }
        
        self.errors.append(error)
        self._save_errors()
        
        logger.info(f"✅ Error registrado: {client} - {document_type} - {field}")
        return error

    def mark_corrected(self, error_id: int):
        """Marcar un error como corregido"""
        for error in self.errors:
            if error['id'] == error_id:
                error['corrected'] = True
                error['corrected_at'] = datetime.now().isoformat()
                self._save_errors()
                logger.info(f"✅ Error {error_id} marcado como corregido")
                return
        logger.warning(f"Error {error_id} no encontrado")

    def get_client_patterns(self, client: str) -> Dict:
        """
        Obtener patrones de errores de un cliente
        
        Returns:
            {
                'total_errors': 5,
                'most_common_field': 'precintos',
                'common_error_types': ['missing', 'format'],
                'error_count_by_field': {'precintos': 3, 'consignee': 2}
            }
        """
        client_errors = [e for e in self.errors if e['client'] == client]
        
        if not client_errors:
            return {'total_errors': 0}
        
        field_counts = defaultdict(int)
        error_type_counts = defaultdict(int)
        
        for error in client_errors:
            field_counts[error['field']] += 1
            error_type_counts[error['error_type']] += 1
        
        return {
            'total_errors': len(client_errors),
            'most_common_field': max(field_counts, key=field_counts.get) if field_counts else None,
            'error_count_by_field': dict(field_counts),
            'error_types': dict(error_type_counts),
            'uncorrected_errors': len([e for e in client_errors if not e['corrected']])
        }

    def get_document_type_patterns(self, doc_type: str) -> Dict:
        """
        Obtener patrones de errores por tipo de documento
        """
        doc_errors = [e for e in self.errors if e['document_type'] == doc_type]
        
        if not doc_errors:
            return {'total_errors': 0}
        
        field_counts = defaultdict(int)
        client_counts = defaultdict(int)
        
        for error in doc_errors:
            field_counts[error['field']] += 1
            client_counts[error['client']] += 1
        
        return {
            'total_errors': len(doc_errors),
            'most_problematic_field': max(field_counts, key=field_counts.get) if field_counts else None,
            'error_count_by_field': dict(field_counts),
            'clients_with_errors': dict(client_counts),
            'severity_distribution': self._get_severity_distribution(doc_errors)
        }

    def _get_severity_distribution(self, errors: List[Dict]) -> Dict:
        """Contar errores por severidad"""
        severity_counts = defaultdict(int)
        for error in errors:
            severity_counts[error['severity']] += 1
        return dict(severity_counts)

    def get_high_risk_clients(self) -> List[Dict]:
        """
        Obtener clientes con más errores (alto riesgo)
        
        Returns:
            Lista de clientes ordenada por cantidad de errores
        """
        client_error_count = defaultdict(int)
        
        for error in self.errors:
            if not error['corrected']:  # Solo contar errores no corregidos
                client_error_count[error['client']] += 1
        
        # Ordenar por cantidad de errores
        high_risk = sorted(
            client_error_count.items(),
            key=lambda x: x[1],
            reverse=True
        )
        
        return [
            {'client': client, 'uncorrected_errors': count}
            for client, count in high_risk if count > 0
        ]

    def suggest_fix(self, client: str, field: str, document_type: str) -> Optional[str]:
        """
        Sugerir corrección basada en historial
        
        Busca: "La última vez que este cliente tuvo error en este campo,
                ¿cuál fue la solución?"
        """
        # Buscar errores similares del mismo cliente
        similar_errors = [
            e for e in self.errors
            if e['client'] == client and 
               e['field'] == field and
               e['document_type'] == document_type and
               e['corrected']
        ]
        
        if similar_errors:
            # Retornar el valor esperado de la última corrección
            last_corrected = similar_errors[-1]
            return f"Sugerencia: El valor esperado es '{last_corrected['expected_value']}' (basado en correcciones previas)"
        
        return None

    def get_statistics(self) -> Dict:
        """
        Obtener estadísticas generales
        """
        total_errors = len(self.errors)
        corrected = len([e for e in self.errors if e['corrected']])
        
        severity_dist = defaultdict(int)
        for error in self.errors:
            severity_dist[error['severity']] += 1
        
        return {
            'total_errors': total_errors,
            'corrected_errors': corrected,
            'uncorrected_errors': total_errors - corrected,
            'correction_rate': f"{(corrected/total_errors*100):.1f}%" if total_errors > 0 else "0%",
            'severity_distribution': dict(severity_dist),
            'high_risk_clients': self.get_high_risk_clients()[:5]
        }

    def print_summary(self):
        """Imprimir resumen de estadísticas"""
        stats = self.get_statistics()
        
        print("\n" + "="*60)
        print("📊 ESTADÍSTICAS DE ERRORES")
        print("="*60)
        print(f"Total de errores: {stats['total_errors']}")
        print(f"Errores corregidos: {stats['corrected_errors']}")
        print(f"Errores pendientes: {stats['uncorrected_errors']}")
        print(f"Tasa de corrección: {stats['correction_rate']}")
        print(f"\nDistribución por severidad:")
        for severity, count in stats['severity_distribution'].items():
            print(f"  {severity}: {count}")
        print(f"\n⚠️  Clientes de alto riesgo:")
        for client_info in stats['high_risk_clients']:
            print(f"  - {client_info['client']}: {client_info['uncorrected_errors']} errores pendientes")
        print("="*60 + "\n")