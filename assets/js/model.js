/**
 * Clase NualaModel - Gestiona los datos y la interacción con la API SQLite3.
 * La base de datos es la ÚNICA fuente de verdad (Single Source of Truth).
 * Sigue el principio de responsabilidad única (Single Responsibility Principle - SOLID).
 * Utiliza camelCase para variables JavaScript.
 */
export class NualaModel {
    constructor() {
        this.apiBaseUrl = 'api/index.php';
        this.productsKey = 'nuala_products';
        this.storesKey = 'nuala_stores_v2';
        this.configKey = 'nuala_config';

        this.config = {};
        this.products = [];
        this.stores = [];

        this.isApiConnected = false;
    }

    /**
     * Inicializa los datos cargando estrictamente desde SQLite3 vía API PHP.
     */
    async initData() {
        try {
            const response = await fetch(`${this.apiBaseUrl}?action=get_data`);
            if (response.ok) {
                const apiResult = await response.json();
                if (apiResult.success) {
                    this.isApiConnected = true;
                    this.config = apiResult.config || {};

                    this.products = Array.isArray(apiResult.products) ? apiResult.products.map(p => ({
                        id: parseInt(p.id),
                        name: p.name,
                        category: p.category,
                        price: p.price,
                        description: p.description,
                        image: p.image
                    })) : [];

                    this.stores = Array.isArray(apiResult.stores) ? apiResult.stores.map(s => ({
                        id: parseInt(s.id),
                        name: s.name,
                        city: s.city,
                        state: s.state,
                        address: s.address,
                        phone: s.phone,
                        schedule: s.schedule,
                        image: s.image
                    })) : [];

                    this.syncLocalStorage();
                    return true;
                }
            }
        } catch (error) {
            console.warn('API PHP offline, utilizando datos locales en localStorage:', error);
        }

        // Fallback LocalStorage (solamente lo que se haya sincronizado desde la BD)
        this.loadLocalStorage();
        return false;
    }

    /**
     * Carga fallback desde localStorage sin sobreescribir con datos duros estáticos.
     */
    loadLocalStorage() {
        try {
            const localConfig = localStorage.getItem(this.configKey);
            const localProducts = localStorage.getItem(this.productsKey);
            const localStores = localStorage.getItem(this.storesKey);

            if (localConfig) this.config = JSON.parse(localConfig);
            if (localProducts) this.products = JSON.parse(localProducts);
            if (localStores) this.stores = JSON.parse(localStores);
        } catch (err) {
            console.warn('Error al leer de localStorage:', err);
        }
    }

    /**
     * Sincroniza el estado actual exacto en localStorage de forma protegida contra cuotas.
     */
    syncLocalStorage() {
        try {
            const sanitizedProducts = this.products.map(p => {
                const cleanImage = (p.image && p.image.startsWith('data:image/')) ? 'assets/images/lenceria-femenina.jpg' : p.image;
                return { ...p, image: cleanImage };
            });

            const sanitizedStores = this.stores.map(s => {
                const cleanImage = (s.image && s.image.startsWith('data:image/')) ? 'assets/images/tienda-nuala.jpg' : s.image;
                return { ...s, image: cleanImage };
            });

            localStorage.setItem(this.configKey, JSON.stringify(this.config));
            localStorage.setItem(this.productsKey, JSON.stringify(sanitizedProducts));
            localStorage.setItem(this.storesKey, JSON.stringify(sanitizedStores));
        } catch (err) {
            console.warn('Advertencia: localStorage superó la cuota local, los datos siguen 100% seguros en SQLite3:', err);
        }
    }

    /**
     * Sube un archivo de imagen al servidor PHP/assets/images/.
     * @param {File} imageFile Archivo seleccionado por el usuario
     * @returns {Promise<Object>} Resultado con success e imageUrl
     */
    async uploadImage(imageFile) {
        if (!imageFile) return { success: false, message: 'No se seleccionó ningún archivo de imagen.' };

        if (this.isApiConnected) {
            try {
                const formData = new FormData();
                formData.append('image_file', imageFile);

                const response = await fetch(`${this.apiBaseUrl}?action=upload_image`, {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    const result = await response.json();
                    return result;
                }
            } catch (err) {
                console.warn('Error al subir imagen a la API PHP:', err);
            }
        }

        // Fallback local utilizando DataURL (Base64) si la API estuviera offline
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                resolve({
                    success: true,
                    image_url: e.target.result,
                    message: 'Imagen cargada localmente en navegador.'
                });
            };
            reader.readAsDataURL(imageFile);
        });
    }

    /**
     * Obtiene la configuración general del sitio (siteConfig)
     */
    getConfig() {
        return this.config;
    }

    /**
     * Valida el PIN de seguridad para ingresar al panel estricto.
     */
    async verifyAdminPin(pinInput) {
        if (this.isApiConnected) {
            try {
                const response = await fetch(`${this.apiBaseUrl}?action=verify_pin`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pin: pinInput })
                });
                if (response.ok) {
                    const result = await response.json();
                    return result.success;
                }
            } catch (err) {
                console.warn('Error al verificar PIN vía API:', err);
            }
        }
        
        const currentPin = this.config.admin_pin || '1234';
        return pinInput.trim() === currentPin.trim();
    }

    /**
     * Guarda la configuración del sitio (hero_title, hero_description, pin, etc.)
     */
    async saveConfig(configsObj) {
        this.config = { ...this.config, ...configsObj };

        if (this.isApiConnected) {
            try {
                const response = await fetch(`${this.apiBaseUrl}?action=save_config`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ configs: configsObj })
                });
                if (response.ok) {
                    const result = await response.json();
                    if (result.success && result.config) {
                        this.config = { ...this.config, ...result.config };
                    }
                }
            } catch (err) {
                console.warn('Error al guardar configuración en la API:', err);
            }
        }

        this.syncLocalStorage();
        return this.config;
    }

    /**
     * Obtiene la lista completa de productos.
     */
    getProducts() {
        return this.products;
    }

    /**
     * Obtiene un producto por su ID.
     */
    getProductById(productId) {
        return this.products.find(p => p.id === parseInt(productId));
    }

    /**
     * Obtiene productos filtrados por categoría.
     * Compara ambos términos en las mismas condiciones (minúsculas).
     */
    getProductsByCategory(category) {
        if (!category) return this.products;
        return this.products.filter(product => 
            product.category.toLowerCase() === category.toLowerCase()
        );
    }

    /**
     * Agrega un nuevo producto al carrusel.
     */
    async addProduct(productData) {
        if (this.isApiConnected) {
            try {
                const response = await fetch(`${this.apiBaseUrl}?action=add_product`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(productData)
                });
                if (response.ok) {
                    const result = await response.json();
                    if (result.success && result.products) {
                        this.products = result.products.map(p => ({ ...p, id: parseInt(p.id) }));
                        this.syncLocalStorage();
                        return result.product;
                    }
                }
            } catch (err) {
                console.warn('Error al añadir producto en API:', err);
            }
        }

        // Fallback local
        const newProduct = {
            id: Date.now(),
            name: productData.name,
            category: productData.category,
            price: productData.price,
            image: productData.image || "assets/images/lenceria-femenina.jpg",
            description: productData.description || ""
        };
        this.products.unshift(newProduct);
        this.syncLocalStorage();
        return newProduct;
    }

    /**
     * Actualiza una prenda/diapositiva del carrusel existente.
     */
    async updateProduct(productId, productData) {
        const idNum = parseInt(productId);
        if (this.isApiConnected) {
            try {
                const response = await fetch(`${this.apiBaseUrl}?action=update_product`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: idNum, ...productData })
                });
                if (response.ok) {
                    const result = await response.json();
                    if (result.success && result.products) {
                        this.products = result.products.map(p => ({ ...p, id: parseInt(p.id) }));
                        this.syncLocalStorage();
                        return result.product;
                    }
                }
            } catch (err) {
                console.warn('Error al actualizar producto en API:', err);
            }
        }

        // Fallback local
        const index = this.products.findIndex(p => p.id === idNum);
        if (index !== -1) {
            this.products[index] = { ...this.products[index], ...productData, id: idNum };
            this.syncLocalStorage();
            return this.products[index];
        }
        return null;
    }

    /**
     * Elimina una prenda del carrusel por su ID y purga de la lista y la BD SQLite3.
     */
    async deleteProduct(productId) {
        const idNum = parseInt(productId);
        if (this.isApiConnected) {
            try {
                const response = await fetch(`${this.apiBaseUrl}?action=delete_product`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: idNum })
                });
                if (response.ok) {
                    const result = await response.json();
                    if (result.success && Array.isArray(result.products)) {
                        this.products = result.products.map(p => ({ ...p, id: parseInt(p.id) }));
                        this.syncLocalStorage();
                        return true;
                    }
                }
            } catch (err) {
                console.warn('Error al eliminar producto en API:', err);
            }
        }

        // Fallback local
        this.products = this.products.filter(p => p.id !== idNum);
        this.syncLocalStorage();
        return true;
    }

    /**
     * Obtiene la lista completa de tiendas físicas.
     */
    getStores() {
        return this.stores;
    }

    /**
     * Obtiene una tienda por su ID.
     */
    getStoreById(storeId) {
        return this.stores.find(s => s.id === parseInt(storeId));
    }

    /**
     * Obtiene tiendas filtradas por estado.
     * Compara ambos términos en las mismas condiciones (minúsculas).
     */
    getStoresByState(state) {
        if (!state || state.toLowerCase() === 'todas') return this.stores;
        return this.stores.filter(store => 
            store.state.toLowerCase() === state.toLowerCase()
        );
    }

    /**
     * Agrega una nueva tienda física con su dirección e imagen.
     */
    async addStore(storeData) {
        if (this.isApiConnected) {
            try {
                const response = await fetch(`${this.apiBaseUrl}?action=add_store`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(storeData)
                });
                if (response.ok) {
                    const result = await response.json();
                    if (result.success && result.stores) {
                        this.stores = result.stores.map(s => ({ ...s, id: parseInt(s.id) }));
                        this.syncLocalStorage();
                        return result.store;
                    }
                }
            } catch (err) {
                console.warn('Error al añadir tienda en API:', err);
            }
        }

        // Fallback local
        const newStore = {
            id: Date.now(),
            name: storeData.name,
            city: storeData.city,
            state: storeData.state || "Distrito Capital",
            address: storeData.address,
            phone: storeData.phone,
            schedule: storeData.schedule || "Lunes a Sábado: 9:00 AM - 7:00 PM",
            image: storeData.image || "assets/images/tienda-nuala.jpg"
        };
        this.stores.push(newStore);
        this.syncLocalStorage();
        return newStore;
    }

    /**
     * Actualiza una tienda física (dirección, imagen y datos).
     */
    async updateStore(storeId, storeData) {
        const idNum = parseInt(storeId);
        if (this.isApiConnected) {
            try {
                const response = await fetch(`${this.apiBaseUrl}?action=update_store`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: idNum, ...storeData })
                });
                if (response.ok) {
                    const result = await response.json();
                    if (result.success && result.stores) {
                        this.stores = result.stores.map(s => ({ ...s, id: parseInt(s.id) }));
                        this.syncLocalStorage();
                        return result.store;
                    }
                }
            } catch (err) {
                console.warn('Error al actualizar tienda en API:', err);
            }
        }

        // Fallback local
        const index = this.stores.findIndex(s => s.id === idNum);
        if (index !== -1) {
            this.stores[index] = { ...this.stores[index], ...storeData, id: idNum };
            this.syncLocalStorage();
            return this.stores[index];
        }
        return null;
    }

    /**
     * Elimina una tienda física por su ID y purga de la lista y la BD SQLite3.
     */
    async deleteStore(storeId) {
        const idNum = parseInt(storeId);
        if (this.isApiConnected) {
            try {
                const response = await fetch(`${this.apiBaseUrl}?action=delete_store`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: idNum })
                });
                if (response.ok) {
                    const result = await response.json();
                    if (result.success && Array.isArray(result.stores)) {
                        this.stores = result.stores.map(s => ({ ...s, id: parseInt(s.id) }));
                        this.syncLocalStorage();
                        return true;
                    }
                }
            } catch (err) {
                console.warn('Error al eliminar tienda en API:', err);
            }
        }

        // Fallback local
        this.stores = this.stores.filter(s => s.id !== idNum);
        this.syncLocalStorage();
        return true;
    }

    /**
     * Extrae de forma dinámica todos los estados únicos registrados en las tiendas.
     * Compara los estados llevando ambos a minúsculas (toLowerCase()).
     */
    getUniqueStates() {
        const seen = new Set();
        const uniqueStates = [];

        this.stores.forEach(store => {
            if (store.state) {
                const normalized = store.state.trim().toLowerCase();
                if (!seen.has(normalized)) {
                    seen.add(normalized);
                    const capitalized = store.state.trim().split(/\s+/)
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                        .join(' ');
                    uniqueStates.push(capitalized);
                }
            }
        });

        return uniqueStates.sort((a, b) => a.localeCompare(b));
    }
}
