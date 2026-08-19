-- =============================================================
-- ESQUEMA DE BASE DE DATOS SQLITE3: ANALÍTICA WEB (NUALA STORE)
-- =============================================================

-- 1. Tabla para el Contador de Visitas Únicas por Día e IP
CREATE TABLE IF NOT EXISTS contador_visitas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip_hash TEXT NOT NULL,
    page_url TEXT NOT NULL,
    visit_date TEXT NOT NULL,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_visita_dia UNIQUE (ip_hash, visit_date, page_url)
);

CREATE INDEX IF NOT EXISTS idx_visitas_url_fecha ON contador_visitas(page_url, visit_date);

-- 2. Tabla para Captura de Clics del Mapa de Calor (Heatmap)
CREATE TABLE IF NOT EXISTS clics_heatmap (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    click_x INTEGER NOT NULL,
    click_y INTEGER NOT NULL,
    page_url TEXT NOT NULL,
    viewport_width INTEGER NOT NULL,
    viewport_height INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_clics_url ON clics_heatmap(page_url);
