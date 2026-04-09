"""
test_auth.py - Test de autenticación con output visible
"""

import sys
import os
from pathlib import Path

print("="*60)
print("TEST: Google Drive Authentication")
print("="*60)

# Verificar archivos
print("\n1. Verificando archivos...")
creds_path = Path('config/credentials.json')
token_path = Path('config/token.pickle')

if creds_path.exists():
    print(f"✅ credentials.json encontrado: {creds_path}")
else:
    print(f"❌ credentials.json NO encontrado: {creds_path}")
    sys.exit(1)

print(f"Token será guardado en: {token_path}")

# Intentar importar bibliotecas
print("\n2. Importando bibliotecas...")
try:
    from google_auth_oauthlib.flow import InstalledAppFlow
    print("✅ google_auth_oauthlib importado")
except ImportError as e:
    print(f"❌ Error importando google_auth_oauthlib: {e}")
    sys.exit(1)

try:
    import pickle
    print("✅ pickle importado")
except ImportError as e:
    print(f"❌ Error importando pickle: {e}")
    sys.exit(1)

# Intentar crear flujo
print("\n3. Creando flujo de autenticación...")
try:
    SCOPES = ['https://www.googleapis.com/auth/drive']
    flow = InstalledAppFlow.from_client_secrets_file(
        str(creds_path),
        SCOPES
    )
    print("✅ Flujo creado correctamente")
except Exception as e:
    print(f"❌ Error creando flujo: {e}")
    sys.exit(1)

# Intentar obtener credenciales
print("\n4. Obteniendo credenciales...")
print("   (Intenta abrir navegador...)")

try:
    # Intentar con navegador local
    creds = flow.run_local_server(port=8080, open_browser=False)
    print("✅ Credenciales obtenidas con run_local_server")
except Exception as e:
    print(f"⚠️  run_local_server falló: {e}")
    print("   Intentando con run_console()...")
    try:
        creds = flow.run_console()
        print("✅ Credenciales obtenidas con run_console")
    except Exception as e2:
        print(f"❌ Error obteniendo credenciales: {e2}")
        sys.exit(1)

# Guardar token
print("\n5. Guardando token...")
try:
    with open(token_path, 'wb') as token:
        pickle.dump(creds, token)
    print(f"✅ Token guardado en: {token_path}")
except Exception as e:
    print(f"❌ Error guardando token: {e}")
    sys.exit(1)

print("\n" + "="*60)
print("✅ AUTENTICACIÓN COMPLETADA EXITOSAMENTE")
print("="*60)