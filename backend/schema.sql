-- ============================================================
-- Schema completo: Inventario IMC
-- PostgreSQL — Migración desde Supabase al homelab
-- ============================================================

-- ENUMS
CREATE TYPE role_enum AS ENUM ('admin', 'supervisor', 'contador', 'guest');
CREATE TYPE cliente_estado AS ENUM ('activo', 'inactivo', 'suspendido');

-- ============================================================
-- TABLA: clientes
-- ============================================================
CREATE TABLE IF NOT EXISTS clientes (
  id                  BIGSERIAL PRIMARY KEY,
  nombre              VARCHAR NOT NULL,
  nombre_comercial    VARCHAR,
  ruc                 VARCHAR,
  telefono            VARCHAR,
  email               VARCHAR,
  direccion           TEXT,
  contacto_principal  VARCHAR,
  telefono_contacto   VARCHAR,
  estado              cliente_estado NOT NULL DEFAULT 'activo',
  notas               TEXT,
  fecha_creado        TIMESTAMPTZ DEFAULT NOW(),
  fecha_actualizado   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: usuarios_imc
-- ============================================================
CREATE TABLE IF NOT EXISTS usuarios_imc (
  id              BIGSERIAL PRIMARY KEY,
  nombre          TEXT NOT NULL,
  correo          TEXT NOT NULL UNIQUE,
  cedula          TEXT UNIQUE,
  pass_hash       TEXT NOT NULL,
  telefono        TEXT,
  role            role_enum NOT NULL DEFAULT 'contador',
  fecha_registro  TIMESTAMPTZ DEFAULT NOW(),
  activo          BOOLEAN DEFAULT TRUE,
  ultimo_acceso   TIMESTAMPTZ,
  user_type       TEXT,
  cliente_id      BIGINT REFERENCES clientes(id)
);

-- ============================================================
-- TABLA: audit_log
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id            BIGSERIAL PRIMARY KEY,
  actor_id      TEXT,
  actor_name    TEXT NOT NULL DEFAULT 'Sistema',
  actor_role    TEXT NOT NULL DEFAULT 'system',
  action        TEXT NOT NULL,
  module        TEXT NOT NULL,
  target_id     TEXT,
  target_label  TEXT,
  details       JSONB DEFAULT '{}',
  ip_address    TEXT DEFAULT 'unknown',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: inventarios_cliente_part  (inventario maestro)
-- ============================================================
CREATE TABLE IF NOT EXISTS inventarios_cliente_part (
  id               BIGSERIAL PRIMARY KEY,
  id_cliente       BIGINT NOT NULL REFERENCES clientes(id),
  codigo_producto  TEXT NOT NULL,
  descripcion      TEXT DEFAULT 'Sin descripción',
  cantidad         NUMERIC DEFAULT 0,
  area             TEXT,
  ubicacion        TEXT,
  marbete          TEXT,
  barcode          TEXT,
  costo            NUMERIC DEFAULT 0,
  unidad_medida    TEXT DEFAULT 'UN',
  categoria        TEXT,
  fecha_cargado    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: conteos_part  (conteos offline sincronizados)
-- ============================================================
CREATE TABLE IF NOT EXISTS conteos_part (
  id                    BIGSERIAL PRIMARY KEY,
  cliente_id            BIGINT NOT NULL REFERENCES clientes(id),
  area                  TEXT,
  ubicacion             TEXT,
  marbete               TEXT DEFAULT 'S/M',
  codigo_producto       TEXT,
  cantidad              NUMERIC DEFAULT 0,
  cantidad_sistema      NUMERIC,
  descripcion           TEXT,
  diferencia            NUMERIC,
  fecha_escaneo         TIMESTAMPTZ DEFAULT NOW(),
  contador_id           BIGINT REFERENCES usuarios_imc(id),
  nombre_contador       TEXT DEFAULT 'Desconocido',
  fecha_inicio_marbete  TIMESTAMPTZ,
  fecha_fin_marbete     TIMESTAMPTZ,
  es_recuento           BOOLEAN DEFAULT FALSE,
  estado                TEXT DEFAULT 'pendiente',
  fecha_sincronizado    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NOTA: inventario_verificado_part ELIMINADA
-- El rol verificador fue absorbido por contador.
-- Los reportes de diferencias se generan cruzando
-- conteos_part vs inventarios_cliente_part directamente.
-- ============================================================
-- TABLA: employee_session_stats  (sesión diaria por empleado)
-- ============================================================
CREATE TABLE IF NOT EXISTS employee_session_stats (
  id                 BIGSERIAL PRIMARY KEY,
  usuario_id         BIGINT NOT NULL REFERENCES usuarios_imc(id),
  cliente_id         BIGINT REFERENCES clientes(id),
  rol_asumido        TEXT NOT NULL,
  piezas_sesion      INT DEFAULT 0,
  skus_sesion        INT DEFAULT 0,
  velocidad_sesion   INT DEFAULT 0,
  tiempo_activo      INTERVAL DEFAULT '0 hours',
  hora_inicio        TIMESTAMPTZ DEFAULT NOW(),
  hora_fin           TIMESTAMPTZ
);

-- ============================================================
-- TABLA: employee_stats  (perfil global lifetime por empleado)
-- ============================================================
CREATE TABLE IF NOT EXISTS employee_stats (
  id                        BIGSERIAL PRIMARY KEY,
  usuario_id                BIGINT NOT NULL UNIQUE REFERENCES usuarios_imc(id),
  piezas_totales_contadas   INT DEFAULT 0,
  skus_totales_procesados   INT DEFAULT 0,
  horas_totales_trabajadas  INTERVAL DEFAULT '0 hours',
  inventarios_trabajados    INT DEFAULT 0,
  fecha_creado              TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: guest_links  (enlaces temporales para clientes)
-- ============================================================
CREATE TABLE IF NOT EXISTS guest_links (
  id                BIGSERIAL PRIMARY KEY,
  cliente_id        BIGINT NOT NULL REFERENCES clientes(id),
  token             UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  activo            BOOLEAN DEFAULT TRUE,
  expires_at        TIMESTAMPTZ NOT NULL,
  alias_auditoria   TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
