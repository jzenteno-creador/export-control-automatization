"""
config.py - Configuración centralizada del proyecto
"""

import os
from pathlib import Path

# ===== DIRECTORIOS =====
PROJECT_ROOT = Path(__file__).parent.parent
CONFIG_DIR = PROJECT_ROOT / "config"
DATA_DIR = PROJECT_ROOT / "data"
SCRIPTS_DIR = PROJECT_ROOT / "scripts"
SKILLS_DIR = PROJECT_ROOT / "skills"
DOCS_DIR = PROJECT_ROOT / "docs"
TESTS_DIR = PROJECT_ROOT / "tests"

# ===== GOOGLE DRIVE =====
GOOGLE_DRIVE_CONFIG = {
    "credentials_file": CONFIG_DIR / "credentials.json",
    "token_file": CONFIG_DIR / "token.pickle",
}

# Carpetas en Drive (por tipo de documento)
DRIVE_FOLDERS = {
    "BL_DRAFT": "BL DRAFT",
    "COD_ZIP": "CO ZIP",
    "COD_PDF": "CO PDF",
    "BOOKING": "BOOKING ADVICE",
    "ADUANA": "PLANILLA ADUANA",
    "FACTURA": "FACTURA",
}

# ===== ONEDRIVER / EXCEL =====
EXCEL_CONFIG = {
    "file_name": "PROGRAMA MARITIMO NW SSB 2026",
    "sheet_name": "Reservas",
    "tracking_columns": {
        "order": "ORDER",
        "bl_number": "NRO DE BL",
        "confection": "CONFECCIÓN",
        "review": "REVISIÓN",
        "status": "STATUS",
        "observations": "OBSERVACIONES",
    }
}

# ===== VALIDACIONES =====
CRITICAL_FIELDS = {
    "BL": ["producto", "cantidad", "pesos", "contenedores", "precintos", "consignee", "notify"],
    "COD": ["producto", "valor_declarado"],
    "BOOKING": ["consignee", "notify"],
    "ADUANA": ["contenedores", "precintos", "pesos", "permisos", "cantidad_contenedores"],
    "FACTURA": ["descripcion", "cantidad", "valor_unitario", "total"],
}

# ===== VALIDACIONES TRANSVERSALES =====
CROSS_DOCUMENT_VALIDATIONS = [
    {
        "name": "BL_CONSIGNEE_MATCHES_BOOKING",
        "doc1": "BL",
        "doc2": "BOOKING",
        "field1": "consignee",
        "field2": "consignee",
        "severity": "CRITICAL"
    },
    {
        "name": "BL_NOTIFY_MATCHES_BOOKING",
        "doc1": "BL",
        "doc2": "BOOKING",
        "field1": "notify",
        "field2": "notify",
        "severity": "CRITICAL"
    },
    {
        "name": "BL_CONTAINERS_MATCHES_ADUANA",
        "doc1": "BL",
        "doc2": "ADUANA",
        "field1": "contenedores",
        "field2": "contenedores",
        "severity": "CRITICAL"
    },
    {
        "name": "BL_PRECINCTS_MATCHES_ADUANA",
        "doc1": "BL",
        "doc2": "ADUANA",
        "field1": "precintos",
        "field2": "precintos",
        "severity": "CRITICAL"
    },
    {
        "name": "BL_WEIGHT_MATCHES_ADUANA",
        "doc1": "BL",
        "doc2": "ADUANA",
        "field1": "pesos",
        "field2": "pesos",
        "severity": "HIGH"
    },
]

# ===== ESTADOS =====
DOCUMENT_STATES = {
    "NEW": "Nuevo",
    "REVIEWING": "En revisión",
    "APPROVED": "Aprobado",
    "REJECTED": "Rechazado",
    "PENDING_FIX": "Pendiente corrección",
}

# ===== LOGS =====
LOG_CONFIG = {
    "log_dir": DATA_DIR / "logs",
    "level": "INFO",
    "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
}