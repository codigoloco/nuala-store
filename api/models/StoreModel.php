<?php
require_once __DIR__ . '/../config/Database.php';

/**
 * Modelo para gestionar las tiendas físicas y sus direcciones/imágenes (stores).
 * Sigue el principio de Responsabilidad Única (SRP).
 */
class StoreModel {
    private $db_connection;

    public function __construct() {
        $this->db_connection = Database::get_instance()->get_connection();
    }

    /**
     * Obtiene todas las tiendas.
     */
    public function get_all_stores() {
        $stmt_query = $this->db_connection->query("SELECT * FROM stores ORDER BY id ASC");
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
     * Agrega una nueva tienda física con su dirección, imagen, whatsapp e instagram y sus estados activos.
     */
    public function add_store($data_store) {
        $stmt_insert = $this->db_connection->prepare("
            INSERT INTO stores (name, city, state, address, phone, schedule, image, whatsapp, whatsapp_active, instagram, instagram_active)
            VALUES (:name, :city, :state, :address, :phone, :schedule, :image, :whatsapp, :whatsapp_active, :instagram, :instagram_active)
        ");
        $stmt_insert->execute([
            ':name' => trim($data_store['name']),
            ':city' => trim($data_store['city']),
            ':state' => isset($data_store['state']) && !empty($data_store['state']) ? trim($data_store['state']) : 'Distrito Capital',
            ':address' => trim($data_store['address']),
            ':phone' => trim($data_store['phone']),
            ':schedule' => isset($data_store['schedule']) && !empty($data_store['schedule']) ? trim($data_store['schedule']) : 'Lunes a Sábado: 9:00 AM - 7:00 PM',
            ':image' => isset($data_store['image']) && !empty($data_store['image']) ? trim($data_store['image']) : 'assets/images/tienda-nuala.jpg',
            ':whatsapp' => isset($data_store['whatsapp']) ? trim($data_store['whatsapp']) : '',
            ':whatsapp_active' => isset($data_store['whatsapp_active']) ? (int)$data_store['whatsapp_active'] : 1,
            ':instagram' => isset($data_store['instagram']) ? trim($data_store['instagram']) : '',
            ':instagram_active' => isset($data_store['instagram_active']) ? (int)$data_store['instagram_active'] : 1
        ]);
        $new_id = (int) $this->db_connection->lastInsertId();
        return $this->get_store_by_id($new_id);
    }

    /**
     * Actualiza la información de una tienda física (incluyendo dirección, imagen, whatsapp e instagram y sus estados activos).
     */
    public function update_store($store_id, $data_store) {
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
                instagram_active = :instagram_active
            WHERE id = :id
        ");
        $stmt_update->execute([
            ':id' => (int) $store_id,
            ':name' => trim($data_store['name']),
            ':city' => trim($data_store['city']),
            ':state' => isset($data_store['state']) && !empty($data_store['state']) ? trim($data_store['state']) : 'Distrito Capital',
            ':address' => trim($data_store['address']),
            ':phone' => trim($data_store['phone']),
            ':schedule' => isset($data_store['schedule']) && !empty($data_store['schedule']) ? trim($data_store['schedule']) : 'Lunes a Sábado: 9:00 AM - 7:00 PM',
            ':image' => isset($data_store['image']) && !empty($data_store['image']) ? trim($data_store['image']) : 'assets/images/tienda-nuala.jpg',
            ':whatsapp' => isset($data_store['whatsapp']) ? trim($data_store['whatsapp']) : '',
            ':whatsapp_active' => isset($data_store['whatsapp_active']) ? (int)$data_store['whatsapp_active'] : 1,
            ':instagram' => isset($data_store['instagram']) ? trim($data_store['instagram']) : '',
            ':instagram_active' => isset($data_store['instagram_active']) ? (int)$data_store['instagram_active'] : 1
        ]);
        return $this->get_store_by_id($store_id);
    }

    /**
     * Elimina una tienda física por su ID y borra físicamente el archivo de imagen del disco.
     */
    public function delete_store($store_id) {
        $store = $this->get_store_by_id($store_id);
        if (!$store) return false;

        $image_url = $store['image'];

        // Eliminar registro de la BD SQLite3
        $stmt_delete = $this->db_connection->prepare("DELETE FROM stores WHERE id = :id");
        $result = $stmt_delete->execute([':id' => (int) $store_id]);

        // Verificar si la imagen está en la carpeta assets/images/ y si ningún otro elemento la usa
        if ($result && !empty($image_url) && strpos($image_url, 'assets/images/') === 0) {
            $stmt_check_carousel = $this->db_connection->prepare("SELECT COUNT(*) AS total FROM carousel_items WHERE LOWER(image) = LOWER(:image)");
            $stmt_check_carousel->execute([':image' => $image_url]);
            $count_carousel = (int) $stmt_check_carousel->fetch()['total'];

            $stmt_check_stores = $this->db_connection->prepare("SELECT COUNT(*) AS total FROM stores WHERE LOWER(image) = LOWER(:image)");
            $stmt_check_stores->execute([':image' => $image_url]);
            $count_stores = (int) $stmt_check_stores->fetch()['total'];

            // Si nadie más usa el archivo, se borra físicamente del disco
            if ($count_carousel === 0 && $count_stores === 0) {
                $full_file_path = __DIR__ . '/../../' . $image_url;
                if (file_exists($full_file_path) && is_file($full_file_path)) {
                    @unlink($full_file_path);
                }
            }
        }

        return $result;
    }
}
