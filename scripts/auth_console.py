"""
auth_console.py - Autenticación por consola (sin navegador)
"""

from google_auth_oauthlib.flow import InstalledAppFlow
from pathlib import Path
import pickle

SCOPES = ['https://www.googleapis.com/auth/drive']

print("="*60)
print("Autenticación Google Drive - Método Consola")
print("="*60)

credentials_path = Path('config/credentials.json')
token_path = Path('config/token.pickle')

try:
    print("\n1. Creando flujo de autenticación...")
    flow = InstalledAppFlow.from_client_secrets_file(
        str(credentials_path),
        SCOPES
    )
    
    print("\n2. Abriendo navegador para autorización...")
    print("   (Se abrirá una ventana - autoriza el acceso)\n")
    
    creds = flow.run_console()
    
    print("\n3. Guardando token...")
    with open(token_path, 'wb') as token:
        pickle.dump(creds, token)
    
    print(f"✅ Token guardado correctamente en: {token_path}")
    print("\n" + "="*60)
    print("✅ AUTENTICACIÓN COMPLETADA")
    print("="*60)

except Exception as e:
    print(f"\n❌ ERROR: {e}")
    import traceback
    traceback.print_exc()