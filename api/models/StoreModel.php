<?php
require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/../helpers/AuditHelper.php';
require_once __DIR__ . '/../helpers/SecurityHelper.php';

/**
 * Modelo para gestionar las tiendas físicas, redes omnicanal, ubicación GPS, Cashea y modalidad de venta.
 * Sigue el principio de Responsabilidad Única (SRP - SOLID) y utiliza snake_case.
 */
class StoreModel {
    private $db_connection;

    public function __construct() {
        $this->db_connection = Database::get_instance()->get_connection();
    }

    /**
     * Normaliza la modalidad de venta comparando en minúsculas.
     */
    private function normalize_sale_type($raw_sale_type) {
        $val_lower = mb_strtolower(trim((string) $raw_sale_type), 'UTF-8');
        if ($val_lower === 'mayor') {
            return 'Mayor';
        }
        if ($val_lower === 'mayor y detal' || $val_lower === 'myd') {
            return 'Mayor y Detal';
        }
        return 'Detal';
    }

    /**
     * Limpia parámetros innecesarios de seguimiento en enlaces de Google Maps.
     */
    private function sanitize_maps_url($raw_url) {
        $trimmed = trim((string) $raw_url);
        if ($trimmed === '') {
            return '';
        }
        if (!preg_match('/^https?:\/\//i', $trimmed)) {
            return '';
        }
        // Eliminar parámetros de compartido móvil tipo ?g_st=aw o ?g_st=com.google.maps.preview.copy
        $cleaned = preg_replace('/([?&])g_st=[^&]+(&|$)/i', '$1', $trimmed);
        $cleaned = rtrim($cleaned, '?&');
        return $cleaned;
    }

    /**
     * Formatea y estandariza una cuenta de red social (Instagram / TikTok).
     */
    private function sanitize_social_handle($raw_handle) {
        $trimmed = trim((string) $raw_handle);
        $lower_check = mb_strtolower($trimmed, 'UTF-8');
        if ($trimmed === '' || $lower_check === 'no' || $lower_check === 'n/a') {
            return '';
        }
        if (preg_match('/^https?:\/\//i', $trimmed)) {
            return $trimmed;
        }
        return '@' . ltrim($trimmed, '@');
    }

    /**
     * Formatea y limpia el número de WhatsApp de tienda (descartando 'No' o vacíos).
     */
    private function sanitize_whatsapp($raw_wa) {
        $trimmed = trim((string) $raw_wa);
        $lower_check = mb_strtolower($trimmed, 'UTF-8');
        if ($trimmed === '' || $lower_check === 'no' || $lower_check === 'n/a') {
            return '';
        }
        return $trimmed;
    }

    /**
     * Obtiene las tiendas físicas.
     * @param bool $include_inactive Si es true (panel admin), incluye tiendas pausadas y métricas de clics.
     */
    public function get_all_stores($include_inactive = false) {
        if ($include_inactive) {
            $sql = "
                SELECT s.*,
                    COALESCE(SUM(CASE WHEN si.channel = 'whatsapp' THEN 1 ELSE 0 END), 0) AS clicks_whatsapp,
                    COALESCE(SUM(CASE WHEN si.channel = 'maps' THEN 1 ELSE 0 END), 0) AS clicks_maps,
                    COALESCE(SUM(CASE WHEN si.channel = 'instagram' THEN 1 ELSE 0 END), 0) AS clicks_instagram,
                    COALESCE(SUM(CASE WHEN si.channel = 'tiktok' THEN 1 ELSE 0 END), 0) AS clicks_tiktok
                FROM stores s
                LEFT JOIN store_interactions si ON si.store_id = s.id
                GROUP BY s.id
                ORDER BY s.id ASC
            ";
        } else {
            $sql = "SELECT * FROM stores WHERE store_active = 1 ORDER BY id ASC";
        }

        $stmt_query = $this->db_connection->query($sql);
        return $stmt_query->fetchAll();
    }

    /**
     * Obtiene una tienda por su ID.
     */
    public function get_store_by_id($store_id) {
        $stmt_query = $this->db_connection->prepare("SELECT * FROM stores WHERE id = :id");
        $stmt_query->execute([':id' => (int) $store_id]);
        return $stmt_query->fetch();
    }

    /**
     * Prepara el arreglo de parámetros sanitizados para inserción/actualización (DRY).
     */
    private function build_store_params($data_store, $fallback_store = null) {
        $whatsapp_clean = $this->sanitize_whatsapp($data_store['whatsapp'] ?? ($fallback_store['whatsapp'] ?? ''));
        $instagram_clean = $this->sanitize_social_handle($data_store['instagram'] ?? ($fallback_store['instagram'] ?? ''));
        $tiktok_clean = $this->sanitize_social_handle($data_store['tiktok'] ?? ($fallback_store['tiktok'] ?? ''));
        $maps_clean = $this->sanitize_maps_url($data_store['maps_url'] ?? ($fallback_store['maps_url'] ?? ''));

        $wa_active = isset($data_store['whatsapp_active']) ? (int) $data_store['whatsapp_active'] : ($whatsapp_clean !== '' ? 1 : 0);
        if ($whatsapp_clean === '') {
            $wa_active = 0;
        }

        $ig_active = isset($data_store['instagram_active']) ? (int) $data_store['instagram_active'] : ($instagram_clean !== '' ? 1 : 0);
        if ($instagram_clean === '') {
            $ig_active = 0;
        }

        $tk_active = isset($data_store['tiktok_active']) ? (int) $data_store['tiktok_active'] : ($tiktok_clean !== '' ? 1 : 0);
        if ($tiktok_clean === '') {
            $tk_active = 0;
        }

        $maps_active = isset($data_store['maps_active']) ? (int) $data_store['maps_active'] : ($maps_clean !== '' ? 1 : 0);
        if ($maps_clean === '') {
            $maps_active = 0;
        }

        return [
            ':name' => trim((string) ($data_store['name'] ?? ($fallback_store['name'] ?? ''))),
            ':city' => trim((string) ($data_store['city'] ?? ($fallback_store['city'] ?? ''))),
            ':state' => !empty($data_store['state']) ? trim((string) $data_store['state']) : ($fallback_store['state'] ?? 'Distrito Capital'),
            ':address' => trim((string) ($data_store['address'] ?? ($fallback_store['address'] ?? ''))),
            ':phone' => isset($data_store['phone']) ? trim((string) $data_store['phone']) : ($fallback_store['phone'] ?? ''),
            ':schedule' => !empty($data_store['schedule']) ? trim((string) $data_store['schedule']) : ($fallback_store['schedule'] ?? 'Lunes a Sábado: 9:00 AM - 7:00 PM'),
            ':image' => !empty($data_store['image']) ? trim((string) $data_store['image']) : ($fallback_store['image'] ?? 'assets/images/tienda-nuala.webp'),
            ':whatsapp' => $whatsapp_clean,
            ':whatsapp_active' => $wa_active ? 1 : 0,
            ':instagram' => $instagram_clean,
            ':instagram_active' => $ig_active ? 1 : 0,
            ':tiktok' => $tiktok_clean,
            ':tiktok_active' => $tk_active ? 1 : 0,
            ':maps_url' => $maps_clean,
            ':maps_active' => $maps_active ? 1 : 0,
            ':cashea_active' => !empty($data_store['cashea_active']) ? 1 : 0,
            ':sale_type' => $this->normalize_sale_type($data_store['sale_type'] ?? ($fallback_store['sale_type'] ?? 'Detal')),
            ':store_active' => isset($data_store['store_active']) ? ((int) $data_store['store_active'] ? 1 : 0) : 1
        ];
    }

    /**
     * Agrega una nueva tienda física registrando en auditoría.
     */
    public function add_store($data_store) {
        $params = $this->build_store_params($data_store);

        $stmt_insert = $this->db_connection->prepare("
            INSERT INTO stores (
                name, city, state, address, phone, schedule, image,
                whatsapp, whatsapp_active, instagram, instagram_active,
                tiktok, tiktok_active, maps_url, maps_active,
                cashea_active, sale_type, store_active
            ) VALUES (
                :name, :city, :state, :address, :phone, :schedule, :image,
                :whatsapp, :whatsapp_active, :instagram, :instagram_active,
                :tiktok, :tiktok_active, :maps_url, :maps_active,
                :cashea_active, :sale_type, :store_active
            )
        ");
        $stmt_insert->execute($params);

        $new_id = (int) $this->db_connection->lastInsertId();
        $created_store = $this->get_store_by_id($new_id);

        registrar_auditoria('CREAR_TIENDA', 'tiendas', $new_id, null, $created_store, 'EXITOSO');

        return $created_store;
    }

    /**
     * Actualiza la información de una tienda física registrando auditoría.
     */
    public function update_store($store_id, $data_store) {
        $previous_store = $this->get_store_by_id($store_id);
        if (!$previous_store) {
            return null;
        }

        $params = $this->build_store_params($data_store, $previous_store);
        $params[':id'] = (int) $store_id;

        $stmt_update = $this->db_connection->prepare("
            UPDATE stores
            SET name = :name,
                city = :city,
                state = :state,
                address = :address,
                phone = :phone,
                schedule = :schedule,
                image = :image,
                whatsapp = :whatsapp,
                whatsapp_active = :whatsapp_active,
                instagram = :instagram,
                instagram_active = :instagram_active,
                tiktok = :tiktok,
                tiktok_active = :tiktok_active,
                maps_url = :maps_url,
                maps_active = :maps_active,
                cashea_active = :cashea_active,
                sale_type = :sale_type,
                store_active = :store_active
            WHERE id = :id
        ");
        $stmt_update->execute($params);

        if (!empty($previous_store['image']) && strtolower($previous_store['image']) !== strtolower($params[':image'])) {
            cleanup_orphan_image($this->db_connection, $previous_store['image']);
        }

        $updated_store = $this->get_store_by_id($store_id);
        registrar_auditoria('ACTUALIZAR_TIENDA', 'tiendas', $store_id, $previous_store, $updated_store, 'EXITOSO');

        return $updated_store;
    }

    /**
     * Cambia rápidamente el estatus visible/oculto (store_active) de una tienda.
     */
    public function toggle_store_status($store_id, $new_status) {
        $previous_store = $this->get_store_by_id($store_id);
        if (!$previous_store) {
            return null;
        }

        $active_flag = ((int) $new_status === 1) ? 1 : 0;
        $stmt_toggle = $this->db_connection->prepare("UPDATE stores SET store_active = :active WHERE id = :id");
        $stmt_toggle->execute([
            ':active' => $active_flag,
            ':id' => (int) $store_id
        ]);

        $updated_store = $this->get_store_by_id($store_id);
        registrar_auditoria(
            'CAMBIAR_ESTATUS_TIENDA',
            'tiendas',
            $store_id,
            ['store_active' => $previous_store['store_active']],
            ['store_active' => $active_flag],
            'EXITOSO'
        );

        return $updated_store;
    }

    /**
     * Elimina una tienda física por su ID, limpia imagen huérfana y registra en auditoría.
     */
    public function delete_store($store_id) {
        $previous_store = $this->get_store_by_id($store_id);
        if (!$previous_store) {
            return false;
        }

        $stmt_delete = $this->db_connection->prepare("DELETE FROM stores WHERE id = :id");
        $result = $stmt_delete->execute([':id' => (int) $store_id]);

        if ($result) {
            $stmt_del_clicks = $this->db_connection->prepare("DELETE FROM store_interactions WHERE store_id = :id");
            $stmt_del_clicks->execute([':id' => (int) $store_id]);

            cleanup_orphan_image($this->db_connection, $previous_store['image']);
            registrar_auditoria('ELIMINAR_TIENDA', 'tiendas', $store_id, $previous_store, null, 'EXITOSO');
        }

        return $result;
    }

    /**
     * Registra la interacción de un usuario con un canal de contacto de la tienda (WhatsApp, Maps, IG, TikTok).
     */
    public function record_store_interaction($store_id, $channel) {
        $allowed_channels = ['whatsapp', 'maps', 'instagram', 'tiktok'];
        $clean_channel = strtolower(trim((string) $channel));
        if ((int) $store_id <= 0 || !in_array($clean_channel, $allowed_channels, true)) {
            return false;
        }

        $stmt_check = $this->db_connection->prepare("SELECT id, name FROM stores WHERE id = :id");
        $stmt_check->execute([':id' => (int) $store_id]);
        $store_row = $stmt_check->fetch();
        if (!$store_row) {
            return false;
        }

        $stmt_ins = $this->db_connection->prepare("
            INSERT INTO store_interactions (store_id, channel, ip_hash)
            VALUES (:store_id, :channel, :ip_hash)
        ");
        $ok = $stmt_ins->execute([
            ':store_id' => (int) $store_id,
            ':channel' => $clean_channel,
            ':ip_hash' => get_audit_ip_hash()
        ]);

        registrar_auditoria(
            'INTERACCION_TIENDA',
            'analitica_tiendas',
            $store_id,
            null,
            ['tienda' => $store_row['name'], 'canal' => $clean_channel],
            'EXITOSO'
        );

        return $ok;
    }

    /**
     * Sincroniza la base de datos con el catálogo oficial depurado de 30 tiendas,
     * preservando imágenes personalizadas ya existentes mediante comparación normalizada en minúsculas.
     */
    public function sync_official_stores_catalog() {
        $existing_stores = $this->get_all_stores(true);
        $custom_images_map = [];

        foreach ($existing_stores as $old_store) {
            $old_img = trim((string) ($old_store['image'] ?? ''));
            $is_default_img = in_array(strtolower($old_img), [
                '',
                'assets/images/tienda-nuala.webp',
                'assets/images/tienda-nuala.jpg'
            ], true);

            if (!$is_default_img) {
                $old_name_norm = mb_strtolower(trim((string) $old_store['name']), 'UTF-8');
                $custom_images_map[$old_name_norm] = $old_img;
            }
        }

        $official_catalog = Database::get_official_stores_catalog();

        $this->db_connection->beginTransaction();
        try {
            $this->db_connection->exec("DELETE FROM stores");
            $this->db_connection->exec("DELETE FROM sqlite_sequence WHERE LOWER(name) = 'stores'");

            $stmt_insert = $this->db_connection->prepare("
                INSERT INTO stores (
                    name, city, state, address, phone, schedule, image,
                    whatsapp, whatsapp_active, instagram, instagram_active,
                    tiktok, tiktok_active, maps_url, maps_active,
                    cashea_active, sale_type, store_active
                ) VALUES (
                    :name, :city, :state, :address, :phone, :schedule, :image,
                    :whatsapp, :whatsapp_active, :instagram, :instagram_active,
                    :tiktok, :tiktok_active, :maps_url, :maps_active,
                    :cashea_active, :sale_type, :store_active
                )
            ");

            foreach ($official_catalog as $store_item) {
                $target_name_norm = mb_strtolower(trim((string) $store_item['name']), 'UTF-8');

                // Emparejar imágenes previas comparando en minúsculas (ej. "nuala la hoyada" con "nuala la hoyada (detal)")
                foreach ($custom_images_map as $old_norm => $saved_img_path) {
                    if ($old_norm === $target_name_norm || ($old_norm === 'nuala la hoyada' && strpos($target_name_norm, 'nuala la hoyada (detal)') !== false)) {
                        $full_disk_check = __DIR__ . '/../../' . $saved_img_path;
                        if (file_exists($full_disk_check)) {
                            $store_item['image'] = $saved_img_path;
                        }
                    }
                }

                $params = $this->build_store_params($store_item);
                $stmt_insert->execute($params);
            }

            $this->db_connection->commit();

            registrar_auditoria(
                'SINCRONIZAR_CATALOGO_TIENDAS',
                'tiendas',
                'catalogo_30_sedes',
                ['total_anterior' => count($existing_stores)],
                ['total_nuevo' => count($official_catalog)],
                'EXITOSO'
            );

            return count($official_catalog);
        } catch (Exception $sync_err) {
            $this->db_connection->rollBack();
            registrar_auditoria(
                'SINCRONIZAR_CATALOGO_TIENDAS',
                'tiendas',
                'catalogo_30_sedes',
                null,
                ['error' => $sync_err->getMessage()],
                'ERROR'
            );
            throw $sync_err;
        }
    }
}
