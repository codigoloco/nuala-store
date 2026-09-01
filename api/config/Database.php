<?php
/**
 * Clase Singleton para gestionar la conexión a SQLite3 mediante PDO.
 * Sigue el principio de Responsabilidad Única (SRP) y Patrón Singleton (SOLID).
 */
class Database {
    private static $instance = null;
    private $pdo;

    private function __construct() {
        $db_dir = __DIR__ . '/../../database';
        if (!file_exists($db_dir)) {
            mkdir($db_dir, 0777, true);
        }

        $db_path = $db_dir . '/nuala.db';
        $this->pdo = new PDO('sqlite:' . $db_path);
        $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $this->pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

        $this->init_tables();
    }

    /**
     * Obtiene la instancia única de la base de datos (Singleton).
     */
    public static function get_instance() {
        if (self::$instance === null) {
            self::$instance = new Database();
        }
        return self::$instance;
    }

    /**
     * Retorna la conexión PDO.
     */
    public function get_connection() {
        return $this->pdo;
    }

    /**
     * Inicializa las tablas y migra datos por defecto si la BD es recién creada.
     */
    private function init_tables() {
        // Tabla de configuración general (site_config)
        $this->pdo->exec("
            CREATE TABLE IF NOT EXISTS site_config (
                config_key TEXT PRIMARY KEY,
                config_value TEXT NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ");

        // Tabla de carrusel (carousel_items)
        $this->pdo->exec("
            CREATE TABLE IF NOT EXISTS carousel_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                price TEXT NOT NULL,
                description TEXT,
                image TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ");

        // Tabla de tiendas (stores)
        $this->pdo->exec("
            CREATE TABLE IF NOT EXISTS stores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                city TEXT NOT NULL,
                state TEXT NOT NULL,
                address TEXT NOT NULL,
                phone TEXT NOT NULL,
                schedule TEXT NOT NULL,
                image TEXT NOT NULL,
                whatsapp TEXT DEFAULT '',
                whatsapp_active INTEGER DEFAULT 1,
                instagram TEXT DEFAULT '',
                instagram_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ");

        // Migración automática de columnas whatsapp, instagram, whatsapp_active e instagram_active si no existen
        try {
            $columns_stmt = $this->pdo->query("PRAGMA table_info(stores)");
            $existing_columns = [];
            while ($col = $columns_stmt->fetch()) {
                $existing_columns[] = strtolower($col['name']);
            }
            if (!in_array('whatsapp', $existing_columns)) {
                $this->pdo->exec("ALTER TABLE stores ADD COLUMN whatsapp TEXT DEFAULT ''");
            }
            if (!in_array('whatsapp_active', $existing_columns)) {
                $this->pdo->exec("ALTER TABLE stores ADD COLUMN whatsapp_active INTEGER DEFAULT 1");
            }
            if (!in_array('instagram', $existing_columns)) {
                $this->pdo->exec("ALTER TABLE stores ADD COLUMN instagram TEXT DEFAULT ''");
            }
            if (!in_array('instagram_active', $existing_columns)) {
                $this->pdo->exec("ALTER TABLE stores ADD COLUMN instagram_active INTEGER DEFAULT 1");
            }
        } catch (Exception $e) {
            // Silencioso si falla la verificación
        }

        // Migración de claves de configuración para sección de estadísticas si no existen
        try {
            $default_stats_migration = [
                'stats_tagline' => 'Cerca de ti',
                'stats_number' => '+30',
                'stats_heading' => 'Tiendas en todo el país',
                'stats_description' => 'Llevamos el confort y la elegancia de NUALA a cada rincón de Venezuela. Encuentra tu boutique más cercana y vive una experiencia de compra personalizada.',
                'stats_button_text' => 'Explorar Tiendas',
                'stats_bg_image' => 'assets/images/tienda-nuala.jpg',
                'stats_section_active' => '1',
                'stats_bg_active' => '1',
                'stats_tagline_active' => '1',
                'stats_number_active' => '1',
                'stats_heading_active' => '1',
                'stats_description_active' => '1',
                'stats_button_active' => '1'
            ];
            $stmt_check_key = $this->pdo->prepare("SELECT COUNT(*) as total FROM site_config WHERE LOWER(config_key) = :config_key");
            $stmt_insert_key = $this->pdo->prepare("INSERT INTO site_config (config_key, config_value) VALUES (:config_key, :config_value)");
            foreach ($default_stats_migration as $s_key => $s_val) {
                $stmt_check_key->execute([':config_key' => $s_key]);
                if ((int)$stmt_check_key->fetch()['total'] === 0) {
                    $stmt_insert_key->execute([':config_key' => $s_key, ':config_value' => $s_val]);
                }
            }
        } catch (Exception $e) {
            // Silencioso si falla
        }

        $this->seed_default_data_once();
    }

    /**
     * Siembra datos por defecto UNA SOLA VEZ al crear la BD por primera vez.
     * Si los elementos son eliminados por el usuario, NUNCA se vuelven a sembrar.
     */
    private function seed_default_data_once() {
        // Verificar si la base de datos ya fue sembrada anteriormente
        $stmt_check_seed = $this->pdo->prepare("SELECT config_value FROM site_config WHERE LOWER(config_key) = 'is_db_seeded'");
        $stmt_check_seed->execute();
        $row_seed = $stmt_check_seed->fetch();

        if ($row_seed && $row_seed['config_value'] === '1') {
            return;
        }

        // Marcar inmediatamente como sembrada para evitar duplicaciones
        $stmt_mark_seeded = $this->pdo->prepare("INSERT OR REPLACE INTO site_config (config_key, config_value) VALUES ('is_db_seeded', '1')");
        $stmt_mark_seeded->execute();

        // 1. Configuraciones iniciales
        $default_configs = [
            'hero_title' => 'El arte de la intimidad',
            'hero_subtitle' => 'Colección Exclusiva',
            'hero_description' => 'Siluetas delicadas diseñadas para abrazar tu esencia. Confort y sofisticación en armonía perfecta para dama y caballero.',
            'carousel_height' => '520',
            'carousel_object_fit' => 'cover',
            'stats_tagline' => 'Cerca de ti',
            'stats_number' => '+30',
            'stats_heading' => 'Tiendas en todo el país',
            'stats_description' => 'Llevamos el confort y la elegancia de NUALA a cada rincón de Venezuela. Encuentra tu boutique más cercana y vive una experiencia de compra personalizada.',
            'stats_button_text' => 'Explorar Tiendas',
            'stats_bg_image' => 'assets/images/tienda-nuala.jpg',
            'stats_section_active' => '1',
            'stats_bg_active' => '1',
            'stats_tagline_active' => '1',
            'stats_number_active' => '1',
            'stats_heading_active' => '1',
            'stats_description_active' => '1',
            'stats_button_active' => '1',
            'admin_pin' => '1234',
            'is_db_seeded' => '1'
        ];

        $stmt_insert_config = $this->pdo->prepare("INSERT OR REPLACE INTO site_config (config_key, config_value) VALUES (:config_key, :config_value)");
        foreach ($default_configs as $key => $val) {
            $stmt_insert_config->execute([
                ':config_key' => $key,
                ':config_value' => $val
            ]);
        }

        // 2. Productos de carrusel por defecto (sólo si carousel_items está totalmente vacía en el sembrado inicial)
        $stmt_count_c = $this->pdo->query("SELECT COUNT(*) AS total FROM carousel_items");
        if ((int) $stmt_count_c->fetch()['total'] === 0) {
            $default_products = [
                [
                    'name' => 'Bralette Encaje Rosa',
                    'category' => 'Dama',
                    'price' => '$45.00',
                    'image' => 'assets/images/lenceria-femenina.webp',
                    'description' => 'Encaje francés premium en color rosa empolvado'
                ],
                [
                    'name' => 'Set Boxer Algodón Orgánico',
                    'category' => 'Caballero',
                    'price' => '$35.00',
                    'image' => 'assets/images/lenceria-masculina.webp',
                    'description' => 'Algodón premium ultra suave en color verde salvia y gris'
                ],
                [
                    'name' => 'Bralette Floral Pastel',
                    'category' => 'Dama',
                    'price' => '$42.00',
                    'image' => 'assets/images/lenceria-femenina.webp',
                    'description' => 'Copas suaves de encaje con tirantes ajustables'
                ],
                [
                    'name' => 'Classic Boxer Briefs',
                    'category' => 'Caballero',
                    'price' => '$38.00',
                    'image' => 'assets/images/lenceria-masculina.webp',
                    'description' => 'Ajuste perfecto con banda elástica cepillada'
                ]
            ];

            $stmt_insert_carousel = $this->pdo->prepare("
                INSERT INTO carousel_items (name, category, price, description, image)
                VALUES (:name, :category, :price, :description, :image)
            ");
            foreach ($default_products as $prod) {
                $stmt_insert_carousel->execute([
                    ':name' => $prod['name'],
                    ':category' => $prod['category'],
                    ':price' => $prod['price'],
                    ':description' => $prod['description'],
                    ':image' => $prod['image']
                ]);
            }
        }

        // 3. Tiendas físicas por defecto (sólo si stores está totalmente vacía en el sembrado inicial)
        $stmt_count_s = $this->pdo->query("SELECT COUNT(*) AS total FROM stores");
        if ((int) $stmt_count_s->fetch()['total'] === 0) {
            $default_stores = [
                ['name' => 'Nuala La Hoyada', 'city' => 'Caracas', 'state' => 'Distrito Capital', 'address' => 'Av. Cují, esquina Salvador de León, frente a tienda Wax, Caracas.', 'phone' => '+58 (212) 541-2233', 'schedule' => 'Lunes a Sábado: 9:00 AM - 7:00 PM', 'image' => 'assets/images/tienda-nuala.webp'],
                ['name' => 'Nuala Sabana Grande', 'city' => 'Caracas', 'state' => 'Distrito Capital', 'address' => 'Boulevard de Sabana Grande, frente a Mundo Total, Caracas.', 'phone' => '+58 (212) 762-4455', 'schedule' => 'Lunes a Sábado: 9:00 AM - 7:00 PM', 'image' => 'assets/images/tienda-nuala.webp'],
                ['name' => 'Nuala Catia', 'city' => 'Caracas', 'state' => 'Distrito Capital', 'address' => 'Boulevard de Catia, calle Argentina, frente a Canguro, Caracas.', 'phone' => '+58 (212) 872-9900', 'schedule' => 'Lunes a Sábado: 9:00 AM - 7:00 PM', 'image' => 'assets/images/tienda-nuala.webp'],
                ['name' => 'Nuala Chacao', 'city' => 'Caracas', 'state' => 'Miranda', 'address' => 'Calle Páez, Edif. Nuala, Planta Baja, Chacao.', 'phone' => '+58 (212) 267-1122', 'schedule' => 'Lunes a Sábado: 9:00 AM - 7:00 PM', 'image' => 'assets/images/tienda-nuala.webp'],
                ['name' => 'Nuala Valencia Centro', 'city' => 'Valencia', 'state' => 'Carabobo', 'address' => 'Calle Díaz Moreno, diagonal al Banco Banesco y Banco de Venezuela, Valencia.', 'phone' => '+58 (241) 857-3344', 'schedule' => 'Lunes a Sábado: 9:00 AM - 7:00 PM', 'image' => 'assets/images/tienda-nuala.webp'],
                ['name' => 'Nuala Mercado Guajiro', 'city' => 'Valencia', 'state' => 'Carabobo', 'address' => 'Mercado Guajiro, calle 73, Urb. La Castellana, al lado del Palacio del Blumer, Valencia.', 'phone' => '+58 (241) 859-6677', 'schedule' => 'Lunes a Sábado: 9:00 AM - 7:00 PM', 'image' => 'assets/images/tienda-nuala.webp'],
                ['name' => 'Nuala Maracay Centro', 'city' => 'Maracay', 'state' => 'Aragua', 'address' => 'Av. Bolívar, frente a Mundo Total, Maracay.', 'phone' => '+58 (243) 246-8811', 'schedule' => 'Lunes a Sábado: 9:00 AM - 7:00 PM', 'image' => 'assets/images/tienda-nuala.webp'],
                ['name' => 'Nuala La Victoria', 'city' => 'La Victoria', 'state' => 'Aragua', 'address' => 'Av. Francisco de Loreto, cruce con calle Libertador, La Victoria.', 'phone' => '+58 (243) 412-5566', 'schedule' => 'Lunes a Sábado: 9:00 AM - 7:00 PM', 'image' => 'assets/images/tienda-nuala.webp'],
                ['name' => 'Nuala Barquisimeto', 'city' => 'Barquisimeto', 'state' => 'Lara', 'address' => 'Av. 20 entre calles 27 y 28, zona centro, frente al CC Bequito, Barquisimeto.', 'phone' => '+58 (251) 233-4455', 'schedule' => 'Lunes a Sábado: 9:00 AM - 7:00 PM', 'image' => 'assets/images/tienda-nuala.webp'],
                ['name' => 'Nuala Maiquetía', 'city' => 'Maiquetía', 'state' => 'La Guaira', 'address' => 'Calle El Cristo, frente a la tienda Canguro, Maiquetía.', 'phone' => '+58 (212) 331-5500', 'schedule' => 'Lunes a Sábado: 9:00 AM - 7:00 PM', 'image' => 'assets/images/tienda-nuala.webp'],
                ['name' => 'Nuala Maturín', 'city' => 'Maturín', 'state' => 'Monagas', 'address' => 'Av. Bolívar, sector Centro, frente a la CANTV/Ipostel, Maturín.', 'phone' => '+58 (291) 641-7788', 'schedule' => 'Lunes a Sábado: 9:00 AM - 7:00 PM', 'image' => 'assets/images/tienda-nuala.webp'],
                ['name' => 'Nuala Valera', 'city' => 'Valera', 'state' => 'Trujillo', 'address' => 'Av. 10, entre calles 10 y 11, frente a Total Panda, Valera.', 'phone' => '+58 (271) 221-3322', 'schedule' => 'Lunes a Sábado: 9:00 AM - 7:00 PM', 'image' => 'assets/images/tienda-nuala.webp'],
                ['name' => 'Nuala Maracaibo', 'city' => 'Maracaibo', 'state' => 'Zulia', 'address' => 'Av. Bella Vista con calle 72, local Nuala, Maracaibo.', 'phone' => '+58 (261) 792-4411', 'schedule' => 'Lunes a Sábado: 9:00 AM - 7:00 PM', 'image' => 'assets/images/tienda-nuala.webp'],
                ['name' => 'Nuala Puerto La Cruz', 'city' => 'Puerto La Cruz', 'state' => 'Anzoátegui', 'address' => 'Calle Libertad, cruce con Av. 5 de Julio, Puerto La Cruz.', 'phone' => '+58 (281) 265-3399', 'schedule' => 'Lunes a Sábado: 9:00 AM - 7:00 PM', 'image' => 'assets/images/tienda-nuala.webp'],
                ['name' => 'Nuala Puerto Ordaz', 'city' => 'Puerto Ordaz', 'state' => 'Bolívar', 'address' => 'Av. Las Américas, C.C. Orinokia Mall, Nivel Oro, Puerto Ordaz.', 'phone' => '+58 (286) 962-1100', 'schedule' => 'Lunes a Sábado: 9:00 AM - 7:00 PM', 'image' => 'assets/images/tienda-nuala.webp']
            ];

            $stmt_insert_store = $this->pdo->prepare("
                INSERT INTO stores (name, city, state, address, phone, schedule, image)
                VALUES (:name, :city, :state, :address, :phone, :schedule, :image)
            ");
            foreach ($default_stores as $store) {
                $stmt_insert_store->execute([
                    ':name' => $store['name'],
                    ':city' => $store['city'],
                    ':state' => $store['state'],
                    ':address' => $store['address'],
                    ':phone' => $store['phone'],
                    ':schedule' => $store['schedule'],
                    ':image' => $store['image']
                ]);
            }
        }
    }
}
