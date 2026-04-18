---
name: vscode-ssb
description: Configuración y superpoderes de VS Code para SSB International. Usar cuando necesitás recordar shortcuts, extensiones, cómo correr proyectos en local, configurar terminals, o trabajar con el workspace multi-proyecto. Incluye flujo de trabajo óptimo con Claude Code + VS Code.
---

# VS Code — SSB International

Setup completo de VS Code para el workspace de automatización de exportaciones.

## Estructura del Workspace

```
export-control-automation.code-workspace
├── export-control-automatization/   ← Python + n8n — automatización central
├── validador-aduanal/               ← HTML/JS/Supabase — en producción
├── tarifa-schedule/                 ← HTML estático — en producción
└── ssb-context/                     ← Contexto global (BUSINESS_CONTEXT, CLAUDE_GLOBAL)
```

## Cómo correr cada proyecto en local

### Validador Aduanal
```powershell
cd "C:\Users\jzenteno\Claude code VS\validador-aduanal"
python -m http.server 8000
# Abrir: http://localhost:8000/public/index.html
```

### Tarifa Schedule
```powershell
# Usar Live Server en VS Code
# Click derecho en index.html → "Open with Live Server"
# O: puerto 5500 con la extensión Live Server
```

### Export Control (Python)
```powershell
cd "C:\Users\jzenteno\Claude code VS\export-control-automatization"
python scripts/authenticate.py    # primera vez
python scripts/setup_drive.py     # configurar Drive
```

## Terminals en VS Code

Tenés dos tipos de terminal — usá el correcto para cada tarea:

| Terminal | Cuándo usarla |
|----------|---------------|
| **PowerShell** | Comandos de sistema, git, npm, instalar paquetes |
| **Claude Code** | Desarrollar, codear, debuggear, usar MCPs |

Para abrir una terminal nueva: `Ctrl+Shift+\`` o el botón `+` arriba a la derecha del panel de terminales.

Para cambiar entre terminales: click en el nombre en la lista de la derecha.

## Shortcuts Esenciales

| Shortcut | Acción |
|----------|--------|
| `Ctrl+\`` | Abrir/cerrar terminal |
| `Ctrl+Shift+\`` | Nueva terminal |
| `Ctrl+P` | Buscar archivo rápido |
| `Ctrl+Shift+P` | Paleta de comandos |
| `Ctrl+B` | Mostrar/ocultar sidebar |
| `Ctrl+Shift+E` | Ir al explorador de archivos |
| `Ctrl+Shift+G` | Ir a git |
| `Ctrl+F` | Buscar en archivo actual |
| `Ctrl+Shift+F` | Buscar en todos los archivos |
| `Alt+Click` | Múltiples cursores |
| `Ctrl+Z` | Deshacer |
| `Ctrl+S` | Guardar |
| `Ctrl+Shift+S` | Guardar todos |

## Extensiones Instaladas (esenciales)

- **Live Server** — ver cambios HTML en tiempo real sin deploy
- **GitLens** — ver historial de git por línea de código
- **Prettier** — formateo automático de código
- **Error Lens** — ver errores inline en el código
- **REST Client** — testear endpoints de Supabase sin salir de VS Code

## Flujo de Trabajo con Claude Code

### Iniciar sesión de desarrollo
```powershell
# 1. En PowerShell — verificar estado git
cd "C:\Users\jzenteno\Claude code VS\[proyecto]"
git status

# 2. Crear rama para la tarea
git checkout -b feature/nombre-tarea

# 3. Abrir Claude Code en terminal
claude
```

### Durante la sesión
```
# En Claude Code:
# Referenciar archivos directamente
@src/validador.js @CLAUDE.md

# Ver MCPs disponibles
/mcp

# Limpiar contexto si algo falla
/clear
```

### Cerrar sesión
```powershell
# Commit de lo hecho
git add .
git commit -m "feat: descripción del cambio"
git push origin feature/nombre-tarea

# En Claude Code escribir:
break
# → Claude genera resumen automático de la sesión
```

## MCPs Configurados en Claude Code

```
claude.ai Supabase  → tablas operaciones, contenedores, bl_controls
claude.ai n8n       → workflows de BL control y clasificación docs
claude.ai Gmail     → expo.rpbb@scbint.com
google-drive        → Drive ssbintn8n@ssbint.com (en configuración)
```

Verificar estado: `claude mcp list` en PowerShell

## Git — Comandos Frecuentes

```powershell
git status                          # ver qué cambió
git add .                           # preparar todos los cambios
git commit -m "feat: descripción"   # guardar cambio
git push                            # subir a GitHub
git log --oneline                   # ver historial
git reset --hard HEAD               # deshacer todo (cuidado)
git checkout -b feature/nueva       # nueva rama
git checkout main                   # volver a main
git merge feature/nombre            # fusionar rama
```

## Deploy

Todos los proyectos web tienen auto-deploy en Netlify:
```powershell
git push origin main   # → deploy automático en 1-2 minutos
```

Ver estado del deploy: dashboard de Netlify o el badge en el README.

## Archivos de Configuración Importantes

| Archivo | Ubicación | Para qué |
|---------|-----------|---------|
| `claude_desktop_config.json` | `%APPDATA%\Claude\` | MCPs de Claude Desktop |
| `.claude.json` | `C:\Users\jzenteno\` | MCPs de Claude Code (global) |
| `CLAUDE.md` | raíz de cada proyecto | Contexto del proyecto para Claude Code |
| `CLAUDE_GLOBAL.md` | `C:\Users\jzenteno\.claude\` | Contexto global SSB para Claude Code |
| `.env` | raíz de cada proyecto | Variables de entorno (nunca en git) |

## Resolución de Problemas Frecuentes

### "npx no reconocido" en PowerShell
```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Claude Code no encuentra los MCPs
```powershell
claude mcp list   # verificar estado
# Si falla → reiniciar Claude Code: exit → claude
```

### Puerto 8000 ocupado
```powershell
python -m http.server 8080   # usar otro puerto
```

### Git push rechazado
```powershell
git pull origin main --rebase   # sincronizar primero
git push
```
