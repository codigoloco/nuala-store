<?php
/**
 * db_config.php - Conexión centralizada PDO a SQLite3 para el sistema de analítica web.
 * Sigue el principio de Responsabilidad Única (SRP) y variables en snake_Case.
 */

declare(strict_types=1);

/**
 * Obtiene o inicializa la instancia PDO de conexión a analitica.db.
 *
 * @return PDO Instancia de conexión PDO configurada
 */
function get_db_connection(): PDO
{
    static $db_instance = null;

    if ($db_instance !== null) {
        return $db_instance;
    }

    $analitica_dir = __DIR__;
    if (!is_dir($analitica_dir)) {
        mkdir($analitica_dir, 0777, true);
    }

    $db_path = $analitica_dir . DIRECTORY_SEPARATOR . 'analitica.db';
    $is_new_db = !file_exists($db_path) || filesize($db_path) === 0;

    $pdo_options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];

    try {
        $db_instance = new PDO('sqlite:' . $db_path, null, null, $pdo_options);

        // Habilitar soporte de claves foráneas y modo WAL para mejor concurrencia
        $db_instance->exec('PRAGMA foreign_keys = ON;');
        $db_instance->exec('PRAGMA journal_mode = WAL;');

        // Si la base de datos es nueva o no tiene tablas, inicializar el esquema
        if ($is_new_db) {
            init_database_schema($db_instance);
        }

        return $db_instance;
    } catch (PDOException $pdo_error) {
        error_log('Error conectando a SQLite analitica.db: ' . $pdo_error->getMessage());
        header('Content-Type: application/json; charset=utf-8', true, 500);
        echo json_encode([
            'success' => false,
            'message' => 'Error de conexión con la base de datos de analítica.'
        ]);
        exit;
    }
}

/**
 * Ejecuta el DDL de creación de tablas en caso de ser una base de datos nueva.
 *
 * @param PDO $db_conn Conexión PDO activa
 */
function init_database_schema(PDO $db_conn): void
{
    $schema_sql = "
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
    ";

    $db_conn->exec($schema_sql);
}
