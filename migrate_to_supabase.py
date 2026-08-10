"""
Migración de DB_RDV.sqlite a Supabase.
Ejecutar DESPUÉS de crear las tablas con schema.sql en Supabase SQL Editor.

Uso:
  python migrate_to_supabase.py
"""

import sqlite3
import uuid
import requests
import re
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

# Windows stdout robusto
sys.stdout.reconfigure(encoding='utf-8')

# Configuración
DB_PATH = Path(r'D:\Users\LojanoE\Documents\GitHub\Reporte_Vehiculos_GDR\DB_RDV.sqlite')
SUPABASE_URL = 'https://dzmhhlsttqygjvfabdxx.supabase.co'
SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6bWhobHN0dHF5Z2p2ZmFiZHh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTE1MTcwMCwiZXhwIjoyMDkwNzI3NzAwfQ.iVqJpPOzYcM2qaM1fm0bZ4w2OEnQC3BuSrW4rKtHY60'

HEADERS = {
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': f'Bearer {SERVICE_ROLE_KEY}',
    'Content-Type': 'application/json'
}

# Mapeo de nombres de sistemas históricos → nombres actuales en español
SYSTEM_MAP = {
    'Alarmade retroceso': 'Alarma de retroceso',
    'Carrocer�a': 'Carrocería',
    'Direcci�n': 'Dirección',
    'Elevavidrios': 'Elevavidrios',
    'Frenos': 'Frenos',
    'Hidr�ulico': 'Hidráulico',
    'Limpieza': 'Limpieza',
    'Luces': 'Luces',
    'Motor': 'Motor',
    'Neum�ticos': 'Neumáticos',
    'Refrigerante': 'Refrigerante',
    'Seguridad (extintor, conos)': 'Seguridad (extintor, conos)',
    'Sistema El�ctrico': 'Sistema Eléctrico',
    'Sistema de Combustible': 'Sistema de Combustible',
    'Sistema de Transmisi�n': 'Sistema de Transmisión',
    'Sistema deCombustible': 'Sistema de Combustible',
    'Sistema deTransmisi�n': 'Sistema de Transmisión',
    'Suspensi�n': 'Suspensión',
    'Alarma de retroceso': 'Alarma de retroceso',
}

# Sistemas actuales válidos en la app (16 después de quitar duplicado)
VALID_SYSTEMS = {
    'Motor', 'Sistema de Transmisión', 'Dirección', 'Frenos', 'Suspensión', 'Elevavidrios',
    'Neumáticos', 'Sistema Eléctrico', 'Luces', 'Alarma de retroceso', 'Refrigerante',
    'Hidráulico', 'Carrocería', 'Seguridad (extintor, conos)', 'Sistema de Combustible', 'Limpieza'
}


def normalize_status(val):
    """Normaliza estados de evaluaciones a OK/OBS/CRI."""
    v = (val or '').strip().upper()
    if v in ('OK', 'BUENO', 'OPERATIVO'):
        return 'OK'
    if v in ('OBS', 'ATENCION', 'ATENCIÓN', 'WARNING'):
        return 'OBS'
    if v in ('CRI', 'CRITICO', 'CRÍTICO', 'REPARAR', 'MALO', 'CRITICAL'):
        return 'CRI'
    return 'OK'


def parse_date_from_code(cod_reporte):
    """Extrae YY, MM, DD del código de reporte. Devuelve datetime UTC o None."""
    if not cod_reporte:
        return None
    m = re.match(r'(\d{2})(\d{2})-.*-RDV-0(\d+)-V', cod_reporte)
    if not m:
        return None
    yy, mm, dd = m.groups()
    try:
        year = 2000 + int(yy)
        month = int(mm)
        day = int(dd)
        return datetime(year, month, day, 0, 0, 0, tzinfo=timezone.utc)
    except Exception:
        return None


def to_iso(dt_str, cod_reporte):
    """Convierte 'YYYY-MM-DD HH:MM:SS' (hora Ecuador -05:00) a ISO 8601 UTC.
       Si está vacío, intenta extraer la fecha del código de reporte."""
    dt_str = (dt_str or '').strip()
    if dt_str:
        try:
            dt_str_clean = re.sub(r'\.\d+', '', dt_str).replace(' ', 'T')
            local = datetime.strptime(dt_str_clean, '%Y-%m-%dT%H:%M:%S').replace(tzinfo=timezone(-timedelta(hours=5)))
            return local.astimezone(timezone.utc).isoformat().replace('+00:00', 'Z')
        except Exception as e:
            print(f'  ⚠️ Fecha inválida "{dt_str}" en {cod_reporte}: {e}')
    parsed = parse_date_from_code(cod_reporte)
    if parsed:
        return parsed.isoformat().replace('+00:00', 'Z')
    return datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')


def report_uuid(cod_reporte):
    """Genera UUID v5 determinístico a partir del código de reporte."""
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f'reporte:{cod_reporte}'))


def send_batch(endpoint, rows, on_conflict):
    """Envía un lote de filas a Supabase REST API con upsert real."""
    url = f'{SUPABASE_URL}/rest/v1/{endpoint}?on_conflict={on_conflict}'
    res = requests.post(
        url,
        headers={**HEADERS, 'Prefer': 'resolution=merge-duplicates'},
        json=rows,
        timeout=120
    )
    if res.status_code not in (200, 201):
        raise Exception(f'Error {res.status_code} en {endpoint}: {res.text[:500]}')
    return res


def main():
    print('Conectando a SQLite...')
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    # Leer headers
    c.execute('SELECT * FROM headers ORDER BY cod_reporte')
    headers = c.fetchall()
    print(f'Reportes históricos: {len(headers)}')

    # Preparar payloads
    reports = []
    observations_by_report = {}

    c.execute('SELECT * FROM evaluaciones ORDER BY id')
    for row in c.fetchall():
        cod = row['cod_reporte']
        cat = (row['categoria'] or '').strip()
        obs = (row['observacion'] or '').strip()
        tipo = (row['tipo'] or '').strip()
        estado = normalize_status(row['estado'])

        # Observaciones generales van a obs_general
        if tipo == 'GENERAL' or cat == 'Observaciones generales':
            if obs:
                observations_by_report.setdefault(cod, []).append(obs)
            continue

        if not cat:
            continue

        # Saltar sistemas no mapeables (Fluidos/Otros vacíos)
        if cat in ('Fluidos', 'Otros'):
            continue

        nombre_es = SYSTEM_MAP.get(cat, cat)
        if nombre_es not in VALID_SYSTEMS:
            print(f'  ⚠️ Sistema no reconocido "{cat}" en {cod}, se omite.')
            continue

        if cod not in observations_by_report:
            observations_by_report[cod] = []

    for h in headers:
        cod = h['cod_reporte']
        iso = to_iso(h['fecha_hora'], cod)
        obs_list = observations_by_report.get(cod, [])
        obs_general = '\n'.join(obs_list).strip() or None

        reports.append({
            'id': report_uuid(cod),
            'cod_reporte': cod,
            'fecha_hora': iso or datetime.now(timezone.utc).isoformat(),
            'estado_operativo': (h['estado_operativo'] or 'OPERATIVO').strip() or 'OPERATIVO',
            'codigo_vehiculo': (h['codigo_vehiculo'] or '').strip(),
            'placa': (h['placa'] or '').strip() or None,
            'kilometraje': h['kilometraje'] if h['kilometraje'] is not None and -1 < h['kilometraje'] <= 2147483647 else None,
            'conductor': (h['conductor'] or '').strip() or None,
            'inspector': (h['inspector'] or '').strip() or None,
            'ubicacion': None,
            'obs_general': obs_general,
            'archivo': (h['archivo'] or cod).strip(),
            'version': cod.split('-')[-1] if '-' in cod else 'V0',
            'synced_at': datetime.now(timezone.utc).isoformat()
        })

    # Preparar sistemas (solo de reportes que existen en headers)
    valid_codes = {h['cod_reporte'] for h in headers}
    systems = []
    photos = []
    skipped_orphans = 0
    c.execute('SELECT * FROM evaluaciones ORDER BY id')
    for row in c.fetchall():
        cod = row['cod_reporte']
        if cod not in valid_codes:
            skipped_orphans += 1
            continue
        cat = (row['categoria'] or '').strip()
        tipo = (row['tipo'] or '').strip()
        estado = normalize_status(row['estado'])
        obs = (row['observacion'] or '').strip() or None

        if tipo == 'GENERAL' or cat == 'Observaciones generales' or not cat:
            continue
        if cat in ('Fluidos', 'Otros'):
            continue

        nombre_es = SYSTEM_MAP.get(cat, cat)
        if nombre_es not in VALID_SYSTEMS:
            continue

        rid = report_uuid(cod)
        systems.append({
            'report_id': rid,
            'nombre_es': nombre_es,
            'nombre_ui': nombre_es,
            'estado': estado,
            'observacion': obs
        })

    # Fotos: no hay datos históricos
    for r in reports:
        rid = r['id']
        photos.append({'report_id': rid, 'foto_index': 1, 'tiene_foto': False})
        photos.append({'report_id': rid, 'foto_index': 2, 'tiene_foto': False})

    # Deduplicar sistemas por (report_id, nombre_es): PostgreSQL no permite
    # que ON CONFLICT DO UPDATE afecte la misma fila dos veces en un INSERT.
    dedup = {}
    for s in systems:
        dedup[(s['report_id'], s['nombre_es'])] = s
    systems = list(dedup.values())

    print(f'Sistemas a migrar (deduplicados): {len(systems)}')
    print(f'Evaluaciones huérfanas omitidas: {skipped_orphans}')
    print(f'Fotos a migrar (metadatos): {len(photos)}')

    # Enviar a Supabase en lotes
    BATCH_SIZE = 500

    print('\nEnviando reportes...')
    for i in range(0, len(reports), BATCH_SIZE):
        batch = reports[i:i+BATCH_SIZE]
        send_batch('reports', batch, 'cod_reporte')
        print(f'  {min(i+BATCH_SIZE, len(reports))}/{len(reports)}')

    print('\nEnviando evaluaciones por sistema...')
    for i in range(0, len(systems), BATCH_SIZE):
        batch = systems[i:i+BATCH_SIZE]
        send_batch('report_systems', batch, 'report_id,nombre_es')
        print(f'  {min(i+BATCH_SIZE, len(systems))}/{len(systems)}')

    print('\nEnviando metadatos de fotos...')
    for i in range(0, len(photos), BATCH_SIZE):
        batch = photos[i:i+BATCH_SIZE]
        send_batch('report_photos', batch, 'report_id,foto_index')
        print(f'  {min(i+BATCH_SIZE, len(photos))}/{len(photos)}')

    conn.close()
    print('\n✅ Migración completada.')


if __name__ == '__main__':
    main()
