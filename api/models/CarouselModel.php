<?php
require_once __DIR__ . '/../config/Database.php';

/**
 * Modelo para gestionar los productos/diapositivas del carrusel (carousel_items).
 * Sigue el principio de Responsabilidad Única (SRP).
 */
class CarouselModel {
    private $db_connection;

    public function __construct() {
        $this->db_connection = Database::get_instance()->get_connection();
    }

    /**
     * Obtiene todos los ítems del carrusel.
     */
    public function get_all_items() {
        $stmt_query = $this->db_connection->query("SELECT * FROM carousel_items ORDER BY id DESC");
        return $stmt_query->fetchAll();
    }

    /**
     * Obtiene un ítem del carrusel por su ID.
     */
    public function get_item_by_id($item_id) {
        $stmt_query = $this->db_connection->prepare("SELECT * FROM carousel_items WHERE id = :id");
        $stmt_query->execute([':id' => (int) $item_id]);
        return $stmt_query->fetch();
    }

    /**
     * Agrega un nuevo producto/diapositiva al carrusel.
     */
    public function add_item($data_item) {
        $stmt_insert = $this->db_connection->prepare("
            INSERT INTO carousel_items (name, category, price, description, image)
            VALUES (:name, :category, :price, :description, :image)
        ");
        $stmt_insert->execute([
            ':name' => trim($data_item['name']),
            ':category' => trim($data_item['category']),
            ':price' => trim($data_item['price']),
            ':description' => isset($data_item['description']) ? trim($data_item['description']) : '',
            ':image' => isset($data_item['image']) && !empty($data_item['image']) ? trim($data_item['image']) : 'assets/images/lenceria-femenina.jpg'
        ]);
        $new_id = (int) $this->db_connection->lastInsertId();
        return $this->get_item_by_id($new_id);
    }

    /**
     * Actualiza un ítem/imagen existente del carrusel.
     */
    public function update_item($item_id, $data_item) {
        $stmt_update = $this->db_connection->prepare("
            UPDATE carousel_items
            SET name = :name,
                category = :category,
                price = :price,
                description = :description,
                image = :image
            WHERE id = :id
        ");
        $stmt_update->execute([
            ':id' => (int) $item_id,
            ':name' => trim($data_item['name']),
            ':category' => trim($data_item['category']),
            ':price' => trim($data_item['price']),
            ':description' => isset($data_item['description']) ? trim($data_item['description']) : '',
            ':image' => isset($data_item['image']) && !empty($data_item['image']) ? trim($data_item['image']) : 'assets/images/lenceria-femenina.jpg'
        ]);
        return $this->get_item_by_id($item_id);
    }

    /**
     * Elimina un ítem del carrusel por su ID y borra físicamente el archivo de imagen del disco.
     */
    public function delete_item($item_id) {
        $item = $this->get_item_by_id($item_id);
        if (!$item) return false;

        $image_url = $item['image'];

        // Eliminar registro de la BD SQLite3
        $stmt_delete = $this->db_connection->prepare("DELETE FROM carousel_items WHERE id = :id");
        $result = $stmt_delete->execute([':id' => (int) $item_id]);

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
