"""
authenticate.py - Autenticación con Google Drive API
Ejecutar UNA SOLA VEZ para generar token.pickle
"""

from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
import pickle
from pathlib import Path

# Scopes necesarios
SCOPES = [
    'https://www.googleapis.com/auth/drive.readonly',  # Leer archivos
    'https://www.googleapis.com/auth/drive.file'       # Escribir en Drive
]

def authenticate():
    """Autentica con Google Drive y genera token.pickle"""
    
    creds = None
    credentials_path = Path('config/credentials.json')
    token_path = Path('config/token.pickle')
    
    # Si existe token.pickle, úsalo
    if token_path.exists():
        with open(token_path, 'rb') as token:
            creds = pickle.load(token)
    
    # Si no hay credenciales válidas, generar nuevas
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            # Crear nuevo flujo de autenticación
            flow = InstalledAppFlow.from_client_secrets_file(
                str(credentials_path),
                SCOPES
            )
            creds = flow.run_local_server(port=0)
        
        # Guardar credenciales para próximo uso
        with open(token_path, 'wb') as token:
            pickle.dump(creds, token)
    
    print("✅ Autenticación exitosa!")
    return creds

if __name__ == '__main__':
    try:
        creds = authenticate()
        print(f"✅ Token guardado en: config/token.pickle")
    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()