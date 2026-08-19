<?php
require_once __DIR__ . '/../config/Database.php';

/**
 * Modelo para la gestión de configuraciones del sitio (site_config).
 * Sigue el principio de Responsabilidad Única (SRP).
 */
class ConfigModel {
    private $db_connection;

    public function __construct() {
        $this->db_connection = Database::get_instance()->get_connection();
    }

    /**
     * Obtiene todas las configuraciones guardadas en formato de arreglo asociativo.
     */
    public function get_all_config() {
        $stmt_query = $this->db_connection->query("SELECT config_key, config_value FROM site_config");
        $results = $stmt_query->fetchAll();
        
        $config_data = [];
        foreach ($results as $row) {
            $config_data[$row['config_key']] = $row['config_value'];
        }
        return $config_data;
    }

    /**
     * Obtiene una configuración por su clave.
     */
    public function get_config_by_key($config_key) {
        $key_normalized = strtolower(trim($config_key));
        $stmt_query = $this->db_connection->prepare("SELECT config_value FROM site_config WHERE LOWER(config_key) = :config_key");
        $stmt_query->execute([':config_key' => $key_normalized]);
        $row = $stmt_query->fetch();
        return $row ? $row['config_value'] : null;
    }

    /**
     * Guarda o actualiza múltiples configuraciones clave-valor.
     */
    public function save_configs($configs_array) {
        $stmt_upsert = $this->db_connection->prepare("
            INSERT INTO site_config (config_key, config_value, updated_at)
            VALUES (:config_key, :config_value, CURRENT_TIMESTAMP)
            ON CONFLICT(config_key) DO UPDATE SET
                config_value = excluded.config_value,
                updated_at = CURRENT_TIMESTAMP
        ");

        foreach ($configs_array as $key => $value) {
            $stmt_upsert->execute([
                ':config_key' => strtolower(trim($key)),
                ':config_value' => trim($value)
            ]);
        }
        return true;
    }

    /**
     * Valida el PIN de acceso administrativo.
     */
    public function verify_pin($pin_input) {
        $current_pin = $this->get_config_by_key('admin_pin');
        if ($current_pin === null) {
            $current_pin = '1234';
        }
        return trim($pin_input) === trim($current_pin);
    }
}
