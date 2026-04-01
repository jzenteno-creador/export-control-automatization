"""
setup_drive.py - Setup simplificado para Google Drive
Genera token.pickle sin abrir navegador (usa código de autorización manual)
"""

from google_auth_oauthlib.flow import InstalledAppFlow
from pathlib import Path
import pickle

SCOPES = ['https://www.googleapis.com/auth/drive']

def setup():
    """Genera token.pickle"""
    
    credentials_path = Path('config/credentials.json')
    token_path = Path('config/token.pickle')
    
    if not credentials_path.exists():
        print(f"❌ ERROR: {credentials_path} no encontrado")
        return False
    
    try:
        flow = InstalledAppFlow.from_client_secrets_file(
            str(credentials_path),
            SCOPES
        )
        
        # run_local_server abre navegador automáticamente
        # Si no funciona, usamos run_console()
        try:
            creds = flow.run_local_server(port=8080, open_browser=False)
        except:
            creds = flow.run_console()
        
        # Guardar token
        with open(token_path, 'wb') as token:
            pickle.dump(creds, token)
        
        print(f"✅ Token guardado en: {token_path}")
        return True
    
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False

if __name__ == '__main__':
    setup()