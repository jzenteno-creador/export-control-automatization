"""
test_validator.py - Test del validador
"""

from config.models import DocumentData, DocumentType, ValidationSeverity
from scripts.validator import DocumentValidator, CrossDocumentValidator


def test_bl_validation():
    """Test: Validar un BL con datos correctos"""
    print("\n=== TEST 1: BL Válido ===")
    
    bl = DocumentData(
        doc_type=DocumentType.BL,
        file_name="BL_245094344.pdf",
        file_path="/tmp/BL_245094344.pdf",
        extracted_data={
            "producto": "ACEITE VEGETAL",
            "cantidad": "100",
            "pesos": "50000",
            "contenedores": "20FT-001",
            "precintos": "ABC123,DEF456",
            "consignee": "IMPORTADOR USA INC",
            "notify": "BROKER XYZ LLC"
        }
    )
    
    validator = DocumentValidator()
    errors = validator.validate_document(bl)
    
    print(f"Errores encontrados: {len(errors)}")
    if errors:
        for error in errors:
            print(f"  - {error.severity.value}: {error.message}")
    else:
        print("✅ BL VÁLIDO - Sin errores")
    
    return len(errors) == 0


def test_bl_with_errors():
    """Test: Validar un BL con errores"""
    print("\n=== TEST 2: BL con Errores ===")
    
    bl = DocumentData(
        doc_type=DocumentType.BL,
        file_name="BL_MALO.pdf",
        file_path="/tmp/BL_MALO.pdf",
        extracted_data={
            "producto": "",  # FALTA
            "cantidad": "-50",  # NEGATIVO
            "pesos": "ABC",  # NO ES NÚMERO
            "contenedores": "20FT-001",
            "precintos": "ABC123",
            "consignee": "MISMO NOMBRE",  # IGUAL A NOTIFY
            "notify": "MISMO NOMBRE"
        }
    )
    
    validator = DocumentValidator()
    errors = validator.validate_document(bl)
    
    print(f"Errores encontrados: {len(errors)}")
    for error in errors:
        print(f"  - {error.severity.value}: {error.message}")
        print(f"    Campo: {error.field}")
    
    return len(errors) > 0


def test_cross_document_validation():
    """Test: Validar consistencia entre documentos"""
    print("\n=== TEST 3: Validación entre Documentos ===")
    
    bl = DocumentData(
        doc_type=DocumentType.BL,
        file_name="BL_245094344.pdf",
        file_path="/tmp/BL_245094344.pdf",
        extracted_data={
            "producto": "ACEITE",
            "cantidad": "100",
            "pesos": "50000",
            "contenedores": "20FT-001",
            "precintos": "ABC123",
            "consignee": "IMPORTADOR USA",
            "notify": "BROKER XYZ"
        }
    )
    
    booking = DocumentData(
        doc_type=DocumentType.BOOKING,
        file_name="BOOKING_SAP.pdf",
        file_path="/tmp/BOOKING_SAP.pdf",
        extracted_data={
            "consignee": "IMPORTADOR DIFERENTE",  # NO COINCIDE
            "notify": "BROKER XYZ",
            "descripcion_cargo": "Aceite vegetal",
            "contenedores": "20FT-001"
        }
    )
    
    cross_validator = CrossDocumentValidator()
    errors = cross_validator.validate_cross_documents({
        "BL": bl,
        "BOOKING": booking
    })
    
    print(f"Inconsistencias encontradas: {len(errors)}")
    for error in errors:
        print(f"  - {error.severity.value}: {error.message}")
        print(f"    BL tiene: {error.actual_value}")
        print(f"    Se esperaba: {error.expected_value}")
    
    return len(errors) > 0


def test_cod_validation():
    """Test: Validar COD"""
    print("\n=== TEST 4: COD Válido ===")
    
    cod = DocumentData(
        doc_type=DocumentType.COD,
        file_name="COD_ABC123.pdf",
        file_path="/tmp/COD_ABC123.pdf",
        extracted_data={
            "producto": "ACEITE VEGETAL",
            "pais_origen": "ARGENTINA",
            "valor_declarado": "5000",
            "numero_certificado": "AR-2024-001"
        }
    )
    
    validator = DocumentValidator()
    errors = validator.validate_document(cod)
    
    print(f"Errores encontrados: {len(errors)}")
    if errors:
        for error in errors:
            print(f"  - {error.severity.value}: {error.message}")
    else:
        print("✅ COD VÁLIDO - Sin errores")
    
    return len(errors) == 0


if __name__ == "__main__":
    print("\n" + "="*60)
    print("TESTS DEL SISTEMA DE VALIDACIÓN")
    print("="*60)
    
    results = []
    results.append(("BL Válido", test_bl_validation()))
    results.append(("BL con Errores", test_bl_with_errors()))
    results.append(("Validación Cruzada", test_cross_document_validation()))
    results.append(("COD Válido", test_cod_validation()))
    
    print("\n" + "="*60)
    print("RESULTADOS")
    print("="*60)
    for name, passed in results:
        status = "✅ PASÓ" if passed else "❌ FALLÓ"
        print(f"{name}: {status}")
    
    print("\n" + "="*60)