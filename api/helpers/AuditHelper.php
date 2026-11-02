<?php
require_once __DIR__ . '/../config/Database.php';

/**
 * AuditHelper.php - Módulo centralizado de Auditoría del Sistema.
 * Cumple con el principio de Responsabilidad Única (SRP - SOLID) y snake_case.
 */

if (!function_exists('get_audit_ip_hash')) {
    /**
     * Genera un hash anónimo pero consistente de la IP del cliente.
     */
    function get_audit_ip_hash() {
        $raw_ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
        return hash('sha256', 'nuala_audit_salt_' . trim((string) $raw_ip));
    }
}

if (!function_exists('registrar_auditoria')) {
    /**
     * Registra obligatoriamente en SQLite3 cualquier acción de usuario, cambio de estatus
     * u operación transaccional realizada en el sistema.
     *
     * @param string $accion Nombre estandarizado de la acción (ej. CREAR_TIENDA, LOGIN_ADMIN)
     * @param string $modulo Módulo afectado (ej. tiendas, productos, configuracion, seguridad)
     * @param mixed $entidad_id Identificador del registro afectado (opcional)
     * @param mixed $detalle_anterior Estado previo en arreglo o texto (opcional, sanitizado)
     * @param mixed $detalle_nuevo Estado nuevo en arreglo o texto (opcional, sanitizado)
     * @param string $estatus Resultado de la operación (EXITOSO, DENEGADO, ERROR)
     * @return bool
     */
    function registrar_auditoria($accion, $modulo, $entidad_id = null, $detalle_anterior = null, $detalle_nuevo = null, $estatus = 'EXITOSO') {
        try {
            $db_conn = Database::get_instance()->get_connection();

            $sanitize_payload = function ($payload) {
                if ($payload === null) {
                    return null;
                }
                if (is_array($payload)) {
                    $filtered = $payload;
                    if (isset($filtered['admin_pin'])) {
                        $filtered['admin_pin'] = '[PROTEGIDO]';
                    }
                    if (isset($filtered['pin'])) {
                        $filtered['pin'] = '[PROTEGIDO]';
                    }
                    return json_encode($filtered, JSON_UNESCAPED_UNICODE);
                }
                return (string) $payload;
            };

            $user_agent = isset($_SERVER['HTTP_USER_AGENT']) ? substr(trim((string) $_SERVER['HTTP_USER_AGENT']), 0, 255) : 'CLI/Internal';

            $stmt_audit = $db_conn->prepare("
                INSERT INTO auditoria (
                    accion, modulo, entidad_id, detalle_anterior, detalle_nuevo, estatus, ip_hash, user_agent
                ) VALUES (
                    :accion, :modulo, :entidad_id, :detalle_anterior, :detalle_nuevo, :estatus, :ip_hash, :user_agent
                )
            ");

            return $stmt_audit->execute([
                ':accion' => strtoupper(trim((string) $accion)),
                ':modulo' => strtolower(trim((string) $modulo)),
                ':entidad_id' => $entidad_id !== null ? (string) $entidad_id : null,
                ':detalle_anterior' => $sanitize_payload($detalle_anterior),
                ':detalle_nuevo' => $sanitize_payload($detalle_nuevo),
                ':estatus' => strtoupper(trim((string) $estatus)),
                ':ip_hash' => get_audit_ip_hash(),
                ':user_agent' => $user_agent
            ]);
        } catch (Exception $audit_error) {
            error_log('Error en registrar_auditoria: ' . $audit_error->getMessage());
            return false;
        }
    }
}

if (!function_exists('obtener_auditoria_reciente')) {
    /**
     * Obtiene los registros más recientes de auditoría para el panel administrativo.
     */
    function obtener_auditoria_reciente($limite = 40) {
        $db_conn = Database::get_instance()->get_connection();
        $stmt_list = $db_conn->prepare("
            SELECT id, accion, modulo, entidad_id, detalle_nuevo, estatus, created_at
            FROM auditoria
            ORDER BY id DESC
            LIMIT :limite
        ");
        $stmt_list->bindValue(':limite', (int) $limite, PDO::PARAM_INT);
        $stmt_list->execute();
        return $stmt_list->fetchAll();
    }
}
