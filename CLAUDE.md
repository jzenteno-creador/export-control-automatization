# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Export Control Automation — automates validation of maritime export documents for Argentine commodity exports. Monitors Google Drive folders for 5 document types (BL, Certificate of Origin, Booking Advice, Planilla Aduana, Factura Comercial), extracts data from PDFs/Excel/XML, validates individually and cross-document, then updates a tracking Excel on OneDrive.

## Setup & Dependencies

No requirements.txt exists yet. Required packages (install manually):
```
pip install google-auth-oauthlib google-api-python-client openpyxl pypdf pdfplumber requests
```

Python 3.9+ required. Google OAuth credentials are in `config/credentials.json`.

## Architecture

```
Google Drive (6 folders: BL DRAFT, CO ZIP, CO PDF, BOOKING ADVICE, PLANILLA ADUANA, FACTURA)
  → DataExtractor (scripts/data_extractor.py) — parses PDFs via pdfplumber, Excel via openpyxl, XML via ElementTree
  → DocumentValidator + CrossDocumentValidator (scripts/validator.py) — field-level + cross-document consistency
  → Excel tracking sheet "PROGRAMA MARITIMO NW SSB 2026" on OneDrive (sheet: Reservas)
```

**Core implemented modules:**
- `config/models.py` — dataclasses: `DocumentData`, `ExportOrder`, `ValidationError`; enums: `DocumentType`, `ValidationSeverity`
- `config/config.py` — Drive folder mapping, Excel config, critical fields per doc type, cross-validation rules
- `scripts/validator.py` — individual + cross-document validation returning `ValidationError` lists (never raises exceptions)
- `scripts/data_extractor.py` — `DataExtractor` class with per-doc-type extraction methods returning dicts (returns `{'error': str}` on failure)

**Stub modules (empty, pending implementation):**
- `scripts/google_drive_handler.py`, `scripts/document_reader.py`, `scripts/error_database.py`, `scripts/error_learner.py`
- `skills/` — three empty skill definitions
- Root-level entry points: `authenticate.py`, `setup_drive.py`, `test_*.py`

## Key Conventions

- Errors are accumulated as `ValidationError` objects in lists, never thrown as exceptions
- Data extraction methods return plain dicts with standardized Spanish field names (`consignee`, `contenedores`, `precintos`, `pesos`, etc.)
- Code uses English for class/function names; field names and documentation are in Spanish
- Cross-document validations are defined declaratively in `config.py` `CROSS_VALIDATIONS` list with severity levels
- All modules use `logging.getLogger(__name__)`

## Implementation Status

Currently in Phase 1 (Google Drive Integration) of 6 phases. Core extraction and validation logic is complete. Google Drive API integration, OneDrive/Excel updates, reporting, and automation are not yet implemented.
