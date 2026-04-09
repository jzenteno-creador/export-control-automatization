"""
test_drive.py - Test de Google Drive Integration
"""

from scripts.google_drive_handler import GoogleDriveHandler
import logging

logging.basicConfig(level=logging.INFO)

print("\n" + "="*60)
print("TEST: Google Drive Integration")
print("="*60)

try:
    # Inicializar handler
    handler = GoogleDriveHandler('config/token.pickle')
    print("✅ GoogleDriveHandler inicializado")
    
    # Listar archivos en BL DRAFT
    print("\n📂 Buscando archivos en 'BL DRAFT'...")
    bl_files = handler.list_files_in_folder('BL DRAFT')
    print(f"Encontrados: {len(bl_files)} archivos")
    
    if bl_files:
        for file in bl_files[:3]:
            print(f"  - {file['name']}")
    
    print("\n" + "="*60)
    print("✅ TEST COMPLETADO")
    print("="*60)

except Exception as e:
    print(f"\n❌ ERROR: {e}")
    import traceback
    traceback.print_exc()