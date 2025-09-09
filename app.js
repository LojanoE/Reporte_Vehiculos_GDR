{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://ecsa-gdr.ec/reporte-rdv.schema.json",
  "title": "Reporte Diario de Vehículos (RDV) - ECSA | GDR",
  "type": "object",
  "required": ["codificacion", "metadata", "sistemas", "estado_general", "apto_servicio", "fotos"],
  "properties": {
    "version": { "type": "string", "const": "1.0.0" },
    "codificacion": { "type": "string", "pattern": "^[0-9]{4}-RDV-[A-Z0-9]+-[0-9]{2}$" },
    "metadata": {
      "type": "object",
      "required": ["codigo_vehiculo", "kilometraje", "fecha_hora", "conductor", "inspector", "ubicacion"],
      "properties": {
        "codigo_vehiculo": { "type": "string", "minLength": 1 },
        "placa": { "type": "string" },
        "kilometraje": { "type": "number", "minimum": 0 },
        "fecha_hora": {
          "type": "string",
          "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}$"
        },
        "conductor": { "type": "string", "minLength": 1 },
        "inspector": { "type": "string", "minLength": 1 },
        "ubicacion": { "type": "string", "minLength": 1 }
      }
    },
    "estado_general": { "type": "string", "enum": ["OK", "Observado", "Crítico"] },
    "apto_servicio": { "type": "boolean" },
    "observaciones": { "type": "string" },
    "acciones_correctivas": { "type": "string" },
    "sistemas": {
      "type": "object",
      "properties": {
        "sistema_direccion": { "$ref": "#/$defs/estadoComentario" },
        "sistema_electrico": { "$ref": "#/$defs/estadoComentario" },
        "revision_fluidos": { "$ref": "#/$defs/estadoComentario" },
        "frenos": { "$ref": "#/$defs/estadoComentario" },
        "suspension": { "$ref": "#/$defs/estadoComentario" },
        "neumaticos": { "$ref": "#/$defs/estadoComentario" },
        "iluminacion_senalizacion": { "$ref": "#/$defs/estadoComentario" },
        "instrumentos_tablero": { "$ref": "#/$defs/estadoComentario" },
        "motor_transmision": { "$ref": "#/$defs/estadoComentario" },
        "carroceria_vidrios": { "$ref": "#/$defs/estadoComentario" },
        "ac_calefaccion": { "$ref": "#/$defs/estadoComentario" },
        "seguridad": { "$ref": "#/$defs/estadoComentario" },
        "documentacion": { "$ref": "#/$defs/estadoComentario" }
      },
      "required": [
        "sistema_direccion",
        "sistema_electrico",
        "revision_fluidos",
        "frenos",
        "suspension",
        "neumaticos",
        "iluminacion_senalizacion",
        "instrumentos_tablero",
        "motor_transmision",
        "carroceria_vidrios",
        "ac_calefaccion",
        "seguridad",
        "documentacion"
      ]
    },
    "fotos": {
      "type": "array",
      "items": { "$ref": "#/$defs/foto" },
      "minItems": 2,
      "maxItems": 2
    },
    "emision": {
      "type": "object",
      "properties": {
        "emitido_en": { "type": "string" },
        "folio": { "type": "string" }
      }
    }
  },
  "$defs": {
    "estadoComentario": {
      "type": "object",
      "required": ["estado"],
      "properties": {
        "estado": { "type": "string", "enum": ["OK", "Observado", "Crítico"] },
        "comentarios": { "type": "string" }
      }
    },
    "foto": {
      "type": "object",
      "required": ["data_url"],
      "properties": {
        "data_url": { "type": "string", "contentEncoding": "base64", "contentMediaType": "image/*" },
        "nombre_archivo": { "type": "string" },
        "descripcion": { "type": "string" }
      }
    }
  },
  "example": {
    "version": "1.0.0",
    "codificacion": "2509-RDV-ECO62-09",
    "metadata": {
      "codigo_vehiculo": "ECO62",
      "placa": "PQR-1234",
      "kilometraje": 126540,
      "fecha_hora": "2025-09-09T08:30",
      "conductor": "María López",
      "inspector": "Ing. Carlos Pérez (GDR)",
      "ubicacion": "Quito – Patio Norte"
    },
    "estado_general": "OK",
    "apto_servicio": true,
    "observaciones": "Pequeño desgaste en neumático delantero derecho; programar rotación.",
    "acciones_correctivas": "Rotación de neumáticos y verificación de alineación.",
    "sistemas": {
      "sistema_direccion": { "estado": "OK" },
      "sistema_electrico": { "estado": "Observado" },
      "revision_fluidos": { "estado": "OK" },
      "frenos": { "estado": "OK" },
      "suspension": { "estado": "OK" },
      "neumaticos": { "estado": "Observado" },
      "iluminacion_senalizacion": { "estado": "OK" },
      "instrumentos_tablero": { "estado": "OK" },
      "motor_transmision": { "estado": "OK" },
      "carroceria_vidrios": { "estado": "OK" },
      "ac_calefaccion": { "estado": "OK" },
      "seguridad": { "estado": "OK" },
      "documentacion": { "estado": "OK" }
    },
    "fotos": [
      { "data_url": "data:image/jpeg;base64,..." },
      { "data_url": "data:image/jpeg;base64,..." }
    ],
    "emision": {
      "emitido_en": "2025-09-09 09:00",
      "folio": "2509-RDV-ECO62-09"
    }
  }
}
