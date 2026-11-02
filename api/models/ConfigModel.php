<?php
require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/../helpers/AuditHelper.php';
require_once __DIR__ . '/../helpers/SecurityHelper.php';

/**
 * Modelo para la gestión de configuraciones del sitio (site_config).
 * Sigue el principio de Responsabilidad Única (SRP - SOLID) y variables en snake_case.
 */
class ConfigModel {
    private $db_connection;

    /** Claves internas sensibles que jamás deben exponerse al cliente público */
    private $private_keys = [
        'admin_pin',
        'is_db_seeded',
        'stores_official_v2_synced'
    ];

    public function __construct() {
        $this->db_connection = Database::get_instance()->get_connection();
    }

    /**
     * Obtiene las configuraciones públicas seguras para el frontend (excluyendo credenciales y hashes).
     */
    public function get_all_config() {
        $stmt_query = $this->db_connection->query("SELECT config_key, config_value FROM site_config");
        $results = $stmt_query->fetchAll();

        $config_data = [];
        foreach ($results as $row) {
            $key_lower = strtolower(trim((string) $row['config_key']));
            if (in_array($key_lower, $this->private_keys, true)) {
                continue;
            }
            $config_data[$key_lower] = $row['config_value'];
        }
        return $config_data;
    }

    /**
     * Obtiene una configuración por su clave (comparación normalizada en minúsculas).
     */
    public function get_config_by_key($config_key) {
        $key_normalized = strtolower(trim((string) $config_key));
        $stmt_query = $this->db_connection->prepare("SELECT config_value FROM site_config WHERE LOWER(config_key) = :config_key");
        $stmt_query->execute([':config_key' => $key_normalized]);
        $row = $stmt_query->fetch();
        return $row ? $row['config_value'] : null;
    }

    /**
     * Guarda o actualiza múltiples configuraciones clave-valor encriptando el PIN si está presente
     * y registrando la operación en auditoría.
     */
    public function save_configs($configs_array) {
        $previous_config = $this->get_all_config();
        $old_bg_image = $previous_config['stats_bg_image'] ?? '';

        $stmt_upsert = $this->db_connection->prepare("
            INSERT INTO site_config (config_key, config_value, updated_at)
            VALUES (:config_key, :config_value, CURRENT_TIMESTAMP)
            ON CONFLICT(config_key) DO UPDATE SET
                config_value = excluded.config_value,
                updated_at = CURRENT_TIMESTAMP
        ");

        $updated_keys = [];
        foreach ($configs_array as $key => $value) {
            $clean_key = strtolower(trim((string) $key));
            if ($clean_key === 'is_db_seeded' || $clean_key === 'stores_official_v2_synced') {
                continue;
            }

            $clean_value = trim((string) $value);
            if ($clean_key === 'admin_pin') {
                if (strlen($clean_value) < 4) {
                    continue;
                }
                $clean_value = password_hash($clean_value, PASSWORD_DEFAULT);
            }

            $stmt_upsert->execute([
                ':config_key' => $clean_key,
                ':config_value' => $clean_value
            ]);
            $updated_keys[$clean_key] = ($clean_key === 'admin_pin') ? '[PIN_ACTUALIZADO]' : $clean_value;
        }

        // Limpiar imagen de fondo anterior si fue reemplazada y quedó huérfana
        if (!empty($old_bg_image) && isset($configs_array['stats_bg_image']) && strtolower($old_bg_image) !== strtolower(trim((string) $configs_array['stats_bg_image']))) {
            cleanup_orphan_image($this->db_connection, $old_bg_image);
        }

        registrar_auditoria(
            'ACTUALIZAR_CONFIGURACION',
            'configuracion',
            'site_config',
            $previous_config,
            $updated_keys,
            'EXITOSO'
        );

        return true;
    }

    /**
     * Valida el PIN administrativo contra su hash Bcrypt almacenado.
     */
    public function verify_pin($pin_input) {
        $stored_pin = $this->get_config_by_key('admin_pin');
        $clean_input = trim((string) $pin_input);

        if ($clean_input === '') {
            return false;
        }

        if ($stored_pin === null) {
            return hash_equals('1234', $clean_input);
        }

        $hash_info = password_get_info($stored_pin);
        if (!empty($hash_info['algo'])) {
            return password_verify($clean_input, $stored_pin);
        }

        // Respaldo por si existiese valor plano previo a migración
        return hash_equals(trim($stored_pin), $clean_input);
    }
}
