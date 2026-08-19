import { NualaModel } from './model.js';
import { NualaView } from './view.js';

/**
 * Clase NualaController - Actúa como Controlador (Controller) en la arquitectura MVC.
 * Coordina las interacciones entre NualaModel y NualaView con carga ultrarrápida (0ms instant UI).
 * Sigue los principios SOLID (Responsabilidad Única e Inyección de Dependencias).
 * Variables en camelCase.
 */
class NualaController {
    constructor(model, view) {
        this.model = model;
        this.view = view;
        
        // Estado inicial del filtro de tiendas por Estado
        this.activeStateFilter = 'Todas';
        this.activeCropTarget = null;

        this.init();
    }

    /**
     * Inicialización híbrida ultrarrápida: pinta la interfaz en 0ms y sincroniza con SQLite3 en segundo plano.
     */
    async init() {
        // 1. Cargar cacheados locales para renderizado instantáneo en 0ms
        this.model.loadLocalStorage();
        if (this.model.getConfig()) this.view.renderHeroConfig(this.model.getConfig());
        if (this.model.getProducts()) this.view.renderProducts(this.model.getProducts());
        this.refreshFilterBar();
        this.refreshStoresData();

        // 2. Configurar todos los event listeners e interfaz
        this.setupCategoryButtons();
        this.setupScrollInteractions();
        this.setupScrollRevealObserver();
        this.setupAdminPanelEvents();
        this.setupLocationFiltersEvents();
        this.setupHeroFormEvents();
        this.setupEditProductModalEvents();
        this.setupEditStoreModalEvents();
        this.setupImageFileUploads();

        this.handleScroll();

        // 3. Sincronizar en segundo plano la fuente de verdad desde SQLite3
        await this.model.initData();
        this.view.renderHeroConfig(this.model.getConfig());
        this.view.renderProducts(this.model.getProducts());
        this.refreshFilterBar();
        this.refreshStoresData();
        this.view.renderAdminStoresList(this.model.getStores());
        this.view.renderAdminProductsList(this.model.getProducts());
    }

    /**
     * Configura la selección de imágenes con apertura del modal interactivo de recorte (Cropper.js)
     */
    setupImageFileUploads() {
        this.view.setupCropperToolbarEvents();

        const fileInputConfigs = [
            { fileInputId: 'product-image-file', textInputId: 'product-image', previewImgId: 'product-image-preview' },
            { fileInputId: 'edit-product-image-file', textInputId: 'edit-product-image', previewImgId: 'edit-product-preview' },
            { fileInputId: 'store-image-file', textInputId: 'store-image', previewImgId: 'store-image-preview' },
            { fileInputId: 'edit-store-image-file', textInputId: 'edit-store-image', previewImgId: 'edit-store-preview' }
        ];

        fileInputConfigs.forEach(config => {
            const fileInput = document.getElementById(config.fileInputId);
            const textInput = document.getElementById(config.textInputId);
            const previewImg = document.getElementById(config.previewImgId);

            if (textInput && previewImg) {
                textInput.addEventListener('input', () => {
                    previewImg.src = textInput.value.trim();
                });
            }

            if (fileInput) {
                fileInput.addEventListener('change', (e) => {
                    const selectedFile = e.target.files[0];
                    if (!selectedFile) return;

                    const reader = new FileReader();
                    reader.onload = (event) => {
                        this.activeCropTarget = { textInput, previewImg, originalFileName: selectedFile.name };
                        this.view.openCropModal(event.target.result);
                    };
                    reader.readAsDataURL(selectedFile);

                    fileInput.value = '';
                });
            }
        });

        // Botón "Aplicar Recorte y Subir"
        const btnApplyCrop = document.getElementById('btn-apply-crop');
        if (btnApplyCrop) {
            btnApplyCrop.addEventListener('click', async () => {
                if (!this.activeCropTarget) return;

                this.view.showToast('Procesando recorte y subiendo...', 'info');

                const croppedBlob = await this.view.getCroppedCanvasBlob();
                if (!croppedBlob) {
                    this.view.showToast('No se pudo generar el recorte de la imagen.', 'error');
                    return;
                }

                const croppedFileName = `crop_${Date.now()}_` + (this.activeCropTarget.originalFileName || 'image.jpg');
                const croppedFile = new File([croppedBlob], croppedFileName, { type: 'image/jpeg' });

                const uploadResult = await this.model.uploadImage(croppedFile);
                if (uploadResult && uploadResult.success) {
                    this.activeCropTarget.textInput.value = uploadResult.image_url;
                    this.activeCropTarget.previewImg.src = uploadResult.image_url;
                    this.view.closeCropModal();
                    this.view.showToast('Recorte guardado y subido correctamente.', 'success');
                } else {
                    this.view.showToast(uploadResult ? uploadResult.message : 'Error al subir la imagen recortada.', 'error');
                }
            });
        }
    }

    /**
     * Configura la interacción para filtrar productos por género al presionar botones
     */
    setupCategoryButtons() {
        const btnShopWomen = document.getElementById('btn-shop-women');
        const btnShopMen = document.getElementById('btn-shop-men');

        if (btnShopWomen) {
            btnShopWomen.addEventListener('click', (e) => {
                e.preventDefault();
                const filtered = this.model.getProductsByCategory('Dama');
                this.view.renderProducts(filtered);
                document.getElementById('products-carousel').scrollIntoView({ behavior: 'smooth' });
            });
        }

        if (btnShopMen) {
            btnShopMen.addEventListener('click', (e) => {
                e.preventDefault();
                const filtered = this.model.getProductsByCategory('Caballero');
                this.view.renderProducts(filtered);
                document.getElementById('products-carousel').scrollIntoView({ behavior: 'smooth' });
            });
        }
    }

    /**
     * Configura los controladores de scroll del sitio
     */
    setupScrollInteractions() {
        window.addEventListener('scroll', () => this.handleScroll(), { passive: true });
        
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href');
                const targetSection = document.querySelector(targetId);
                if (targetSection) {
                    targetSection.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
    }

    handleScroll() {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        this.view.toggleHeaderStyle(scrollTop > 50);
    }

    /**
     * IntersectionObserver para animación scroll-reveal y actualización del menú activo.
     */
    setupScrollRevealObserver() {
        const revealOptions = { root: null, rootMargin: '0px', threshold: 0.15 };
        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('reveal-active');
                    observer.unobserve(entry.target);
                }
            });
        }, revealOptions);

        const revealElements = document.querySelectorAll('.scroll-reveal');
        revealElements.forEach(element => revealObserver.observe(element));

        const sectionOptions = { root: null, rootMargin: '-50% 0px -50% 0px', threshold: 0 };
        const sectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const sectionId = entry.target.getAttribute('id');
                    this.view.updateActiveNavLink(sectionId);
                    entry.target.classList.add('reveal-active');
                }
            });
        }, sectionOptions);

        const sections = document.querySelectorAll('.scene-section');
        sections.forEach(section => sectionObserver.observe(section));
    }

    /**
     * Configura la barra de filtros de tiendas por Estado.
     * Normaliza los textos a minúsculas al comparar.
     */
    setupLocationFiltersEvents() {
        if (this.view.locationsFilterBar) {
            this.view.locationsFilterBar.addEventListener('click', (e) => {
                const filterBtn = e.target.closest('.filter-btn');
                if (filterBtn) {
                    const selectedState = filterBtn.getAttribute('data-state');
                    this.activeStateFilter = selectedState;
                    this.refreshFilterBar();
                    
                    const filteredStores = this.model.getStoresByState(selectedState);
                    this.view.renderStores(filteredStores);
                }
            });
        }
    }

    refreshFilterBar() {
        const uniqueStates = this.model.getUniqueStates();
        this.view.renderFilterBar(uniqueStates, this.activeStateFilter);
    }

    /**
     * Configura eventos del Panel de Administración ("Estricto y Hábil")
     */
    setupAdminPanelEvents() {
        const btnOpenAdmin = document.getElementById('btn-open-admin');
        const linkOpenAdmin = document.getElementById('link-open-admin');
        const btnCloseAdmin = document.getElementById('btn-close-admin');
        const btnClosePinModal = document.getElementById('btn-close-pin-modal');
        const adminModal = document.getElementById('admin-modal');
        const adminPinModal = document.getElementById('admin-pin-modal');
        const formAdminPin = document.getElementById('form-admin-pin');

        // Apertura estricta: Solicita PIN
        const handleOpenAdminClick = (e) => {
            if (e) e.preventDefault();
            this.view.openPinModal();
        };

        if (btnOpenAdmin) btnOpenAdmin.addEventListener('click', handleOpenAdminClick);
        if (linkOpenAdmin) linkOpenAdmin.addEventListener('click', handleOpenAdminClick);

        // Validación de PIN
        if (formAdminPin) {
            formAdminPin.addEventListener('submit', async (e) => {
                e.preventDefault();
                const pinInput = document.getElementById('admin-pin-input').value;
                const isValid = await this.model.verifyAdminPin(pinInput);
                
                if (isValid) {
                    this.view.openAdminModal();
                    this.view.showToast('Acceso concedido al panel de configuración.', 'success');
                } else {
                    this.view.showToast('PIN de seguridad incorrecto. Acceso denegado.', 'error');
                }
            });
        }

        // Cierre de modales
        if (btnCloseAdmin) btnCloseAdmin.addEventListener('click', () => this.view.closeAdminModal());
        if (btnClosePinModal) btnClosePinModal.addEventListener('click', () => this.view.closePinModal());

        if (adminModal) {
            adminModal.addEventListener('click', (e) => {
                if (e.target === adminModal) this.view.closeAdminModal();
            });
        }
        if (adminPinModal) {
            adminPinModal.addEventListener('click', (e) => {
                if (e.target === adminPinModal) this.view.closePinModal();
            });
        }

        // Pestañas
        this.view.tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTabId = btn.getAttribute('data-tab');
                this.view.switchTab(targetTabId, btn);
            });
        });

        // Formulario: Añadir Producto/Prenda
        const formAddProduct = document.getElementById('form-add-product');
        if (formAddProduct) {
            formAddProduct.addEventListener('submit', async (e) => {
                e.preventDefault();
                const newProductData = {
                    name: document.getElementById('product-name').value.trim(),
                    category: document.getElementById('product-category').value,
                    price: document.getElementById('product-price').value.trim(),
                    description: document.getElementById('product-description').value.trim(),
                    image: document.getElementById('product-image').value.trim()
                };

                await this.model.addProduct(newProductData);
                this.refreshProductsData();
                formAddProduct.reset();
                document.getElementById('product-image').value = 'assets/images/lenceria-femenina.webp';
                document.getElementById('product-image-preview').src = 'assets/images/lenceria-femenina.webp';
                this.view.showToast('Prenda añadida al carrusel exitosamente.', 'success');
            });
        }

        // Formulario: Añadir Tienda
        const formAddStore = document.getElementById('form-add-store');
        if (formAddStore) {
            formAddStore.addEventListener('submit', async (e) => {
                e.preventDefault();
                const newStoreData = {
                    name: document.getElementById('store-name').value.trim(),
                    city: document.getElementById('store-city').value.trim(),
                    state: document.getElementById('store-state').value.trim(),
                    address: document.getElementById('store-address').value.trim(),
                    phone: document.getElementById('store-phone').value.trim(),
                    schedule: document.getElementById('store-schedule').value.trim(),
                    image: document.getElementById('store-image').value.trim()
                };

                await this.model.addStore(newStoreData);
                this.refreshFilterBar();
                this.refreshStoresData();
                formAddStore.reset();
                document.getElementById('store-image').value = 'assets/images/tienda-nuala.webp';
                document.getElementById('store-image-preview').src = 'assets/images/tienda-nuala.webp';
                this.view.showToast('Tienda registrada exitosamente.', 'success');
            });
        }

        // Delegación de eventos en lista de prendas (Editar / Eliminar)
        if (this.view.adminProductsList) {
            this.view.adminProductsList.addEventListener('click', async (e) => {
                const editBtn = e.target.closest('.btn-edit-product');
                const deleteBtn = e.target.closest('.btn-delete-product');

                if (editBtn) {
                    const productId = editBtn.getAttribute('data-id');
                    const product = this.model.getProductById(productId);
                    if (product) this.view.openEditProductModal(product);
                } else if (deleteBtn) {
                    const productId = deleteBtn.getAttribute('data-id');
                    if (confirm('¿Estás seguro de eliminar esta prenda del carrusel?')) {
                        await this.model.deleteProduct(productId);
                        this.refreshProductsData();
                        this.view.showToast('Prenda eliminada del carrusel.', 'info');
                    }
                }
            });
        }

        // Delegación de eventos en lista de tiendas (Editar / Eliminar)
        if (this.view.adminStoresList) {
            this.view.adminStoresList.addEventListener('click', async (e) => {
                const editBtn = e.target.closest('.btn-edit-store');
                const deleteBtn = e.target.closest('.btn-delete-store');

                if (editBtn) {
                    const storeId = editBtn.getAttribute('data-id');
                    const store = this.model.getStoreById(storeId);
                    if (store) this.view.openEditStoreModal(store);
                } else if (deleteBtn) {
                    const storeId = deleteBtn.getAttribute('data-id');
                    if (confirm('¿Estás seguro de eliminar esta tienda física?')) {
                        const stores = this.model.getStores();
                        const storeToDelete = stores.find(s => s.id === parseInt(storeId));
                        
                        await this.model.deleteStore(storeId);

                        if (storeToDelete) {
                            const remainingInState = this.model.getStoresByState(storeToDelete.state);
                            if (remainingInState.length === 0 && this.activeStateFilter.toLowerCase() === storeToDelete.state.toLowerCase()) {
                                this.activeStateFilter = 'Todas';
                            }
                        }

                        this.refreshFilterBar();
                        this.refreshStoresData();
                        this.view.showToast('Tienda eliminada.', 'info');
                    }
                }
            });
        }
    }

    /**
     * Configura el formulario para actualizar contextos del Hero y dimensiones de carrusel
     */
    setupHeroFormEvents() {
        const formEditHero = document.getElementById('form-edit-hero');
        if (formEditHero) {
            formEditHero.addEventListener('submit', async (e) => {
                e.preventDefault();
                const titleVal = document.getElementById('hero-title-input').value.trim();
                const subtitleVal = document.getElementById('hero-subtitle-input').value.trim();
                const descriptionVal = document.getElementById('hero-description-input').value.trim();
                const heightVal = document.getElementById('carousel-height-input').value.trim();
                const fitVal = document.getElementById('carousel-fit-input').value.trim();
                const pinVal = document.getElementById('admin-pin-change-input').value.trim();

                const configsToSave = {
                    hero_title: titleVal,
                    hero_subtitle: subtitleVal,
                    hero_description: descriptionVal,
                    carousel_height: heightVal || '520',
                    carousel_object_fit: fitVal || 'cover'
                };

                if (pinVal && pinVal.length >= 4) {
                    configsToSave.admin_pin = pinVal;
                }

                const updatedConfig = await this.model.saveConfig(configsToSave);
                this.view.renderHeroConfig(updatedConfig);
                
                document.getElementById('admin-pin-change-input').value = '';
                this.view.showToast('Configuración general y dimensiones del carrusel guardadas.', 'success');
            });
        }
    }

    /**
     * Configura el modal y formulario para EDITAR una prenda/diapositiva del carrusel.
     */
    setupEditProductModalEvents() {
        const btnClose = document.getElementById('btn-close-edit-product');
        const formEditProduct = document.getElementById('form-edit-product');

        if (btnClose) {
            btnClose.addEventListener('click', () => this.view.closeEditProductModal());
        }

        if (formEditProduct) {
            formEditProduct.addEventListener('submit', async (e) => {
                e.preventDefault();
                const productId = document.getElementById('edit-product-id').value;
                const updatedData = {
                    name: document.getElementById('edit-product-name').value.trim(),
                    category: document.getElementById('edit-product-category').value,
                    price: document.getElementById('edit-product-price').value.trim(),
                    description: document.getElementById('edit-product-description').value.trim(),
                    image: document.getElementById('edit-product-image').value.trim()
                };

                await this.model.updateProduct(productId, updatedData);
                this.view.closeEditProductModal();
                this.refreshProductsData();
                this.view.showToast('Prenda e imagen actualizadas correctamente.', 'success');
            });
        }
    }

    /**
     * Configura el modal y formulario para EDITAR una tienda y sus direcciones/imágenes.
     */
    setupEditStoreModalEvents() {
        const btnClose = document.getElementById('btn-close-edit-store');
        const formEditStore = document.getElementById('form-edit-store');

        if (btnClose) {
            btnClose.addEventListener('click', () => this.view.closeEditStoreModal());
        }

        if (formEditStore) {
            formEditStore.addEventListener('submit', async (e) => {
                e.preventDefault();
                const storeId = document.getElementById('edit-store-id').value;
                const updatedData = {
                    name: document.getElementById('edit-store-name').value.trim(),
                    city: document.getElementById('edit-store-city').value.trim(),
                    state: document.getElementById('edit-store-state').value.trim(),
                    address: document.getElementById('edit-store-address').value.trim(),
                    phone: document.getElementById('edit-store-phone').value.trim(),
                    schedule: document.getElementById('edit-store-schedule').value.trim(),
                    image: document.getElementById('edit-store-image').value.trim()
                };

                await this.model.updateStore(storeId, updatedData);
                this.view.closeEditStoreModal();
                this.refreshFilterBar();
                this.refreshStoresData();
                this.view.showToast('Tienda, dirección e imagen actualizadas correctamente.', 'success');
            });
        }
    }

    /**
     * Sincroniza la vista de tiendas en base al filtro seleccionado
     */
    refreshStoresData() {
        const filteredStores = this.model.getStoresByState(this.activeStateFilter);
        this.view.renderStores(filteredStores);
        
        const allStores = this.model.getStores();
        this.view.renderAdminStoresList(allStores);
    }

    /**
     * Sincroniza la vista de productos en la web
     */
    refreshProductsData() {
        const products = this.model.getProducts();
        this.view.renderProducts(products);
        this.view.renderAdminProductsList(products);
    }
}

// Inicialización cuando el DOM está completamente cargado
document.addEventListener('DOMContentLoaded', () => {
    const model = new NualaModel();
    const view = new NualaView();
    new NualaController(model, view);
});
