-- Schema SQLite Local pour l'application Offline-First
-- Ce fichier est exécuté au démarrage pour initialiser la base locale

-- ==============================
-- FILE D'ATTENTE DES MUTATIONS
-- ==============================
CREATE TABLE IF NOT EXISTS mutations_queue (
    id TEXT PRIMARY KEY,
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    payload TEXT NOT NULL, -- JSON string
    created_at TEXT NOT NULL,
    retry_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' -- 'pending', 'processing', 'error'
);

-- Métadonnées de synchronisation (horodatage dernier sync, etc.)
CREATE TABLE IF NOT EXISTS sync_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- ==============================
-- JOURNAL DES CONFLITS
-- ==============================
CREATE TABLE IF NOT EXISTS conflicts_log (
    id TEXT PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    local_payload TEXT NOT NULL,   -- JSON : version locale au moment du conflit
    remote_payload TEXT NOT NULL,  -- JSON : version distante (Supabase)
    resolution TEXT NOT NULL,      -- 'auto_lww' | 'kept_local' | 'pending_manual'
    is_critical INTEGER NOT NULL DEFAULT 0, -- 1 si table critique (payment, grade...)
    resolved_at TEXT,              -- NULL si en attente de résolution manuelle
    created_at TEXT NOT NULL
);

-- ==============================
-- JOURNAL D'AUDIT (LOCAL BUFFER)
-- ==============================
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    device_id TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    details TEXT,
    created_at TEXT NOT NULL
);

-- ==============================
-- LICENCES (VALIDATION HORS-LIGNE)
-- ==============================
CREATE TABLE IF NOT EXISTS license_cache (
    school_id TEXT PRIMARY KEY,
    license_key TEXT,
    status TEXT NOT NULL,
    activated_at TEXT,
    expires_at TEXT,
    max_devices INTEGER,
    last_checked_at TEXT
);

-- ==============================
-- ANNÉES SCOLAIRES & PERIODES
-- ==============================
CREATE TABLE IF NOT EXISTS academic_years (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL,
    name TEXT NOT NULL,
    start_date TEXT,
    end_date TEXT,
    is_active INTEGER NOT NULL DEFAULT 0,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    updated_by TEXT,
    device_id TEXT,
    deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS periods (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL,
    academic_year_id TEXT NOT NULL,
    name TEXT NOT NULL,
    start_date TEXT,
    end_date TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    updated_by TEXT,
    device_id TEXT,
    deleted_at TEXT
);

-- ==============================
-- STRUCTURE SCOLAIRE
-- ==============================
CREATE TABLE IF NOT EXISTS sections (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL,
    name TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    updated_by TEXT,
    device_id TEXT,
    deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS levels (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL,
    section_id TEXT NOT NULL,
    name TEXT NOT NULL,
    level_order INTEGER NOT NULL DEFAULT 0,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    updated_by TEXT,
    device_id TEXT,
    deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS series (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL,
    level_id TEXT NOT NULL,
    name TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    updated_by TEXT,
    device_id TEXT,
    deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS classes (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL,
    level_id TEXT NOT NULL,
    academic_year_id TEXT NOT NULL,
    series_id TEXT,
    name TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    updated_by TEXT,
    device_id TEXT,
    deleted_at TEXT
);

-- ==============================
-- ÉLÈVES & ENSEIGNANTS
-- ==============================
CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL,
    matricule TEXT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    gender TEXT,
    birth_date TEXT,
    birth_place TEXT,
    address TEXT,
    contact_phone TEXT,
    contact_email TEXT,
    parent_name TEXT,
    parent_contact TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    updated_by TEXT,
    device_id TEXT,
    deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS teachers (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL,
    profile_id TEXT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    contact_phone TEXT,
    contact_email TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    updated_by TEXT,
    device_id TEXT,
    deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS enrollments (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    class_id TEXT NOT NULL,
    academic_year_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    enrollment_date TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    updated_by TEXT,
    device_id TEXT,
    deleted_at TEXT
);

-- ==============================
-- MATIÈRES & AFFECTATIONS
-- ==============================
CREATE TABLE IF NOT EXISTS subjects (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL,
    name TEXT NOT NULL,
    code TEXT,
    description TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    updated_by TEXT,
    device_id TEXT,
    deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS teacher_assignments (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL,
    teacher_id TEXT NOT NULL,
    subject_id TEXT NOT NULL,
    class_id TEXT NOT NULL,
    academic_year_id TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    updated_by TEXT,
    device_id TEXT,
    deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS schedules (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL,
    academic_year_id TEXT NOT NULL,
    class_id TEXT NOT NULL,
    subject_id TEXT NOT NULL,
    teacher_id TEXT NOT NULL,
    day_of_week INTEGER NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    room TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    updated_by TEXT,
    device_id TEXT,
    deleted_at TEXT
);

-- ==============================
-- ÉVALUATIONS & NOTES
-- ==============================
CREATE TABLE IF NOT EXISTS assessments (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL,
    class_id TEXT NOT NULL,
    subject_id TEXT NOT NULL,
    period_id TEXT NOT NULL,
    teacher_id TEXT,
    title TEXT NOT NULL,
    assessment_date TEXT NOT NULL,
    total_score REAL NOT NULL DEFAULT 20,
    weight REAL NOT NULL DEFAULT 1,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    updated_by TEXT,
    device_id TEXT,
    deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS grades (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL,
    assessment_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    score REAL,
    is_absent INTEGER NOT NULL DEFAULT 0,
    comments TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    updated_by TEXT,
    device_id TEXT,
    deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS averages (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    period_id TEXT NOT NULL,
    class_id TEXT NOT NULL,
    subject_id TEXT,
    average REAL NOT NULL,
    rank INTEGER,
    appreciation TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    updated_by TEXT,
    device_id TEXT,
    deleted_at TEXT
);

-- ==============================
-- PRÉSENCES
-- ==============================
CREATE TABLE IF NOT EXISTS attendance (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    class_id TEXT NOT NULL,
    period_id TEXT,
    date TEXT NOT NULL,
    status TEXT NOT NULL,
    justification TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    updated_by TEXT,
    device_id TEXT,
    deleted_at TEXT
);

-- ==============================
-- FINANCES
-- ==============================
CREATE TABLE IF NOT EXISTS fee_definitions (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL,
    academic_year_id TEXT NOT NULL,
    name TEXT NOT NULL,
    amount REAL NOT NULL,
    description TEXT,
    is_mandatory INTEGER NOT NULL DEFAULT 1,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    updated_by TEXT,
    device_id TEXT,
    deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    academic_year_id TEXT NOT NULL,
    fee_definition_id TEXT,
    amount REAL NOT NULL,
    payment_date TEXT NOT NULL,
    payment_method TEXT,
    reference_number TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    updated_by TEXT,
    device_id TEXT,
    deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS receipts (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL,
    payment_id TEXT NOT NULL,
    receipt_number TEXT NOT NULL,
    issued_by TEXT,
    issue_date TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    updated_by TEXT,
    device_id TEXT,
    deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL,
    academic_year_id TEXT NOT NULL,
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    expense_date TEXT NOT NULL,
    description TEXT,
    recorded_by TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    updated_by TEXT,
    device_id TEXT,
    deleted_at TEXT
);

-- ==============================
-- SAUVEGARDES (PHASE 27)
-- ==============================
-- Historique des sauvegardes locales et/ou cloud.
-- `data` contient le snapshot JSON (table -> lignes) lorsque disponible,
-- `filename` pointe vers le fichier SQLite physique (VACUUM INTO) lorsqu'il existe.
CREATE TABLE IF NOT EXISTS backups (
    id TEXT PRIMARY KEY,
    school_id TEXT,
    scope TEXT NOT NULL DEFAULT 'local',   -- 'local' | 'cloud'
    kind TEXT NOT NULL DEFAULT 'logical',  -- 'logical' | 'physical' | 'both'
    filename TEXT,
    note TEXT,
    checksum TEXT,
    data TEXT,
    row_counts TEXT,
    size_bytes INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'ok',     -- 'ok' | 'error'
    error_message TEXT,
    created_by TEXT,
    created_at TEXT NOT NULL,
    restored_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_backups_school_id ON backups(school_id);
CREATE INDEX IF NOT EXISTS idx_backups_created_at ON backups(created_at);

-- ==============================
-- CACHE DE LICENCE (PHASE 28)
-- ==============================
-- Copie locale de la licence de l'établissement pour permettre la validation
-- hors ligne (offline-first) entre deux vérifications en ligne.
CREATE TABLE IF NOT EXISTS license_cache (
    school_id TEXT PRIMARY KEY,
    license_key TEXT,
    status TEXT NOT NULL DEFAULT 'none',   -- 'active' | 'expired' | 'cancelled' | 'pending' | 'none'
    activated_at TEXT,
    expires_at TEXT,
    max_devices INTEGER,
    last_checked_at TEXT
);
