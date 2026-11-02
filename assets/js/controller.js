import { NualaModel, normalizeComparableText } from './model.js';
import { NualaView } from './view.js';

/**
 * Clase NualaController - Actúa como Controlador (Controller) en la arquitectura MVC.
 * Coordina las interacciones entre NualaModel y NualaView.
 * Sigue los principios SOLID y utiliza camelCase para variables JavaScript.
 */
class NualaController {
    constructor(model, view) {
        this.model = model;
        this.view = view;

        this.activeStateFilter = 'Todas';
        this.activeQuickFilter = 'todos';
        this.searchQuery = '';
        this.adminSearchQuery = '';
        this.activeCropTarget = null;
        this.currentTheme = localStorage.getItem('nuala_theme') || 'normal';

        this.init();
    }

    /**
     * Inicialización híbrida: pinta caché seguro inmediato y sincroniza con SQLite3.
     */
    async init() {
        this.view.applyTheme(this.currentTheme);

        this.model.loadLocalStorage();
        if (this.model.getConfig()) this.view.renderHeroConfig(this.model.getConfig());
        if (this.model.getProducts()) this.view.renderProducts(this.model.getProducts());
        this.refreshFilterBar();
        this.refreshStoresData();

        this.setupThemeToggle();
        this.setupCategoryButtons();
        this.setupScrollInteractions();
        this.setupScrollRevealObserver();
        this.setupLocationFiltersEvents();
        this.setupStoreTrackingEvents();
        this.setupAdminPanelEvents();
        this.setupHeroFormEvents();
        this.setupEditProductModalEvents();
        this.setupEditStoreModalEvents();
        this.setupImageFileUploads();

        this.handleScroll();

        await this.model.initData();
        this.view.renderHeroConfig(this.model.getConfig());
        this.view.renderProducts(this.model.getProducts());
        this.refreshFilterBar();
        this.refreshStoresData();
        this.view.renderAdminProductsList(this.model.getProducts());
        this.view.renderAuditLogs(this.model.getAuditLogs());
    }

    /**
     * Controla el cambio seguro entre modo normal (claro corporativo) y modo oscuro.
     */
    setupThemeToggle() {
        if (this.view.btnThemeToggle) {
            this.view.btnThemeToggle.addEventListener('click', () => {
                this.currentTheme = normalizeComparableText(this.currentTheme) === 'dark' ? 'normal' : 'dark';
                localStorage.setItem('nuala_theme', this.currentTheme);
                this.view.applyTheme(this.currentTheme);
            });
        }
    }

    /**
     * Verifica si una operación administrativa expiró por sesión y solicita reautenticación.
     */
    handleAuthResultCheck(result) {
        if (result && result.auth_required) {
            this.model.isAdminAuthenticated = false;
            this.view.closeEditProductModal();
            this.view.closeEditStoreModal();
            this.view.closeAdminModal();
            this.view.openPinModal();
            this.view.showToast(result.message || 'Sesión expirada. Ingresa tu PIN nuevamente.', 'error');
            return false;
        }
        return true;
    }

    /**
     * Configura la selección de imágenes con recorte interactivo (Cropper.js) y subida segura.
     */
    setupImageFileUploads() {
        this.view.setupCropperToolbarEvents();

        const fileInputConfigs = [
            { fileInputId: 'product-image-file', textInputId: 'product-image', previewImgId: 'product-image-preview' },
            { fileInputId: 'edit-product-image-file', textInputId: 'edit-product-image', previewImgId: 'edit-product-preview' },
            { fileInputId: 'store-image-file', textInputId: 'store-image', previewImgId: 'store-image-preview' },
            { fileInputId: 'edit-store-image-file', textInputId: 'edit-store-image', previewImgId: 'edit-store-preview' },
            { fileInputId: 'stats-bg-image-file', textInputId: 'stats-bg-image', previewImgId: 'stats-bg-preview' }
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
                if (!this.handleAuthResultCheck(uploadResult)) return;

                if (uploadResult && uploadResult.success) {
                    this.activeCropTarget.textInput.value = uploadResult.image_url;
                    this.activeCropTarget.previewImg.src = uploadResult.image_url;
                    this.view.closeCropModal();
                    this.view.renderAuditLogs(this.model.getAuditLogs());
                    this.view.showToast('Recorte guardado y subido correctamente.', 'success');
                } else {
                    this.view.showToast(uploadResult ? uploadResult.message : 'Error al subir la imagen recortada.', 'error');
                }
            });
        }
    }

    /**
     * Configura la interacción para filtrar productos por género.
     */
    setupCategoryButtons() {
        const filterByGender = (categoryName, event) => {
            if (event) event.preventDefault();
            const filtered = this.model.getProductsByCategory(categoryName);
            this.view.renderProducts(filtered);
            document.getElementById('products-carousel')?.scrollIntoView({ behavior: 'smooth' });
        };

        document.getElementById('btn-shop-women')?.addEventListener('click', (e) => filterByGender('Dama', e));
        document.getElementById('btn-shop-men')?.addEventListener('click', (e) => filterByGender('Caballero', e));
        document.getElementById('footer-link-dama')?.addEventListener('click', (e) => filterByGender('Dama', e));
        document.getElementById('footer-link-caballero')?.addEventListener('click', (e) => filterByGender('Caballero', e));
    }

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

    setupScrollRevealObserver() {
        const revealOptions = { root: null, rootMargin: '0px', threshold: 0.12 };
        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('reveal-active');
                    observer.unobserve(entry.target);
                }
            });
        }, revealOptions);

        document.querySelectorAll('.scroll-reveal').forEach(element => revealObserver.observe(element));

        const sectionOptions = { root: null, rootMargin: '-50% 0px -50% 0px', threshold: 0 };
        const sectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const sectionId = entry.target.getAttribute('id');
                    if (sectionId) this.view.updateActiveNavLink(sectionId);
                    entry.target.classList.add('reveal-active');
                }
            });
        }, sectionOptions);

        document.querySelectorAll('.scene-section').forEach(section => sectionObserver.observe(section));
    }

    /**
     * Configura buscador instantáneo, filtros rápidos (Cashea / Mayor / Detal) y filtro por Estado.
     */
    setupLocationFiltersEvents() {
        if (this.view.locationsFilterBar) {
            this.view.locationsFilterBar.addEventListener('click', (e) => {
                const filterBtn = e.target.closest('.filter-btn');
                if (filterBtn) {
                    this.activeStateFilter = filterBtn.getAttribute('data-state') || 'Todas';
                    this.refreshFilterBar();
                    this.refreshStoresData();
                }
            });
        }

        const searchInput = document.getElementById('store-search-input');
        const btnClearSearch = document.getElementById('btn-clear-store-search');

        if (searchInput) {
            searchInput.addEventListener('input', () => {
                this.searchQuery = searchInput.value.trim();
                if (btnClearSearch) {
                    btnClearSearch.style.display = this.searchQuery ? 'inline-flex' : 'none';
                }
                this.refreshStoresData();
            });
        }

        if (btnClearSearch) {
            btnClearSearch.addEventListener('click', () => {
                this.searchQuery = '';
                if (searchInput) searchInput.value = '';
                btnClearSearch.style.display = 'none';
                this.refreshStoresData();
            });
        }

        const quickFilterContainer = document.getElementById('stores-quick-filters');
        if (quickFilterContainer) {
            quickFilterContainer.addEventListener('click', (e) => {
                const quickBtn = e.target.closest('.quick-mode-btn');
                if (!quickBtn) return;
                this.activeQuickFilter = quickBtn.getAttribute('data-quick') || 'todos';
                quickFilterContainer.querySelectorAll('.quick-mode-btn').forEach(btn => {
                    btn.classList.toggle('active', btn === quickBtn);
                });
                this.refreshStoresData();
            });
        }
    }

    /**
     * Registra clics de usuarios en botones de WhatsApp, Google Maps, Instagram y TikTok de cada tienda.
     */
    setupStoreTrackingEvents() {
        if (this.view.storesWrapper) {
            this.view.storesWrapper.addEventListener('click', (e) => {
                const trackedLink = e.target.closest('.track-store-link');
                if (trackedLink) {
                    const storeId = trackedLink.getAttribute('data-store-id');
                    const channel = trackedLink.getAttribute('data-channel');
                    if (storeId && channel) {
                        this.model.trackStoreClick(storeId, channel);
                    }
                }
            });
        }
    }

    refreshFilterBar() {
        const uniqueStates = this.model.getUniqueStates();
        this.view.renderFilterBar(uniqueStates, this.activeStateFilter);
    }

    /**
     * Configura eventos del Panel Administrativo protegido por sesión y CSRF.
     */
    setupAdminPanelEvents() {
        const btnOpenAdmin = document.getElementById('btn-open-admin');
        const linkOpenAdmin = document.getElementById('link-open-admin');
        const btnCloseAdmin = document.getElementById('btn-close-admin');
        const btnClosePin = document.getElementById('btn-close-pin');
        const btnClosePinModal = document.getElementById('btn-close-pin-modal');
        const btnLogoutAdmin = document.getElementById('btn-logout-admin');
        const adminModal = document.getElementById('admin-modal');
        const adminPinModal = document.getElementById('admin-pin-modal');
        const formAdminPin = document.getElementById('form-admin-pin');
        const adminStoreSearch = document.getElementById('admin-store-search-input');

        const handleOpenAdminClick = (e) => {
            if (e) e.preventDefault();
            if (this.model.isAdminAuthenticated) {
                this.refreshStoresData();
                this.view.renderAuditLogs(this.model.getAuditLogs());
                this.view.openAdminModal();
            } else {
                this.view.openPinModal();
            }
        };

        if (btnOpenAdmin) btnOpenAdmin.addEventListener('click', handleOpenAdminClick);
        if (linkOpenAdmin) linkOpenAdmin.addEventListener('click', handleOpenAdminClick);

        if (formAdminPin) {
            formAdminPin.addEventListener('submit', async (e) => {
                e.preventDefault();
                const pinInput = document.getElementById('admin-pin-input').value;
                const authResult = await this.model.verifyAdminPin(pinInput);

                if (authResult.success) {
                    this.refreshStoresData();
                    this.view.renderAuditLogs(this.model.getAuditLogs());
                    this.view.openAdminModal();
                    this.view.showToast(authResult.message, 'success');
                } else {
                    this.view.showToast(authResult.message, 'error');
                }
            });
        }

        if (btnLogoutAdmin) {
            btnLogoutAdmin.addEventListener('click', async () => {
                await this.model.logoutAdmin();
                this.view.closeAdminModal();
                this.view.showToast('Sesión administrativa cerrada de forma segura.', 'info');
            });
        }

        if (btnCloseAdmin) btnCloseAdmin.addEventListener('click', () => this.view.closeAdminModal());
        if (btnClosePin) btnClosePin.addEventListener('click', () => this.view.closePinModal());
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

        this.view.tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTabId = btn.getAttribute('data-tab');
                this.view.switchTab(targetTabId, btn);
            });
        });

        if (adminStoreSearch) {
            adminStoreSearch.addEventListener('input', () => {
                this.adminSearchQuery = adminStoreSearch.value.trim();
                const filteredAdminStores = this.model.filterAdminStores(this.adminSearchQuery);
                this.view.renderAdminStoresList(filteredAdminStores);
            });
        }

        // Formulario: Añadir Producto/Prenda (especificando Docena o Unidad)
        const formAddProduct = document.getElementById('form-add-product');
        if (formAddProduct) {
            formAddProduct.addEventListener('submit', async (e) => {
                e.preventDefault();
                const newProductData = {
                    name: document.getElementById('product-name').value.trim(),
                    category: document.getElementById('product-category').value,
                    price: document.getElementById('product-price').value.trim(),
                    unitType: document.getElementById('product-unit')?.value || 'Docena',
                    description: document.getElementById('product-description').value.trim(),
                    image: document.getElementById('product-image').value.trim()
                };

                const result = await this.model.addProduct(newProductData);
                if (!this.handleAuthResultCheck(result)) return;

                if (result && result.success) {
                    this.refreshProductsData();
                    this.view.renderAuditLogs(this.model.getAuditLogs());
                    formAddProduct.reset();
                    const unitSelect = document.getElementById('product-unit');
                    if (unitSelect) unitSelect.value = 'Docena';
                    document.getElementById('product-image').value = 'assets/images/lenceria-femenina.webp';
                    document.getElementById('product-image-preview').src = 'assets/images/lenceria-femenina.webp';
                    this.view.showToast('Prenda añadida al carrusel exitosamente.', 'success');
                } else {
                    this.view.showToast(result?.message || 'Error al registrar prenda.', 'error');
                }
            });
        }

        // Formulario: Añadir Tienda
        const formAddStore = document.getElementById('form-add-store');
        if (formAddStore) {
            formAddStore.addEventListener('submit', async (e) => {
                e.preventDefault();
                const waActiveInput = document.getElementById('store-whatsapp-active');
                const igActiveInput = document.getElementById('store-instagram-active');
                const tkActiveInput = document.getElementById('store-tiktok-active');
                const mapsActiveInput = document.getElementById('store-maps-active');
                const casheaActiveInput = document.getElementById('store-cashea-active');
                const storeActiveInput = document.getElementById('store-active');

                const newStoreData = {
                    name: document.getElementById('store-name').value.trim(),
                    city: document.getElementById('store-city').value.trim(),
                    state: document.getElementById('store-state').value.trim(),
                    address: document.getElementById('store-address').value.trim(),
                    phone: '',
                    whatsapp: document.getElementById('store-whatsapp')?.value.trim() || '',
                    whatsappActive: waActiveInput ? (waActiveInput.checked ? 1 : 0) : 1,
                    instagram: document.getElementById('store-instagram')?.value.trim() || '',
                    instagramActive: igActiveInput ? (igActiveInput.checked ? 1 : 0) : 1,
                    tiktok: document.getElementById('store-tiktok')?.value.trim() || '',
                    tiktokActive: tkActiveInput ? (tkActiveInput.checked ? 1 : 0) : 1,
                    mapsUrl: document.getElementById('store-maps-url')?.value.trim() || '',
                    mapsActive: mapsActiveInput ? (mapsActiveInput.checked ? 1 : 0) : 1,
                    casheaActive: casheaActiveInput ? (casheaActiveInput.checked ? 1 : 0) : 0,
                    saleType: document.getElementById('store-sale-type')?.value || 'Detal',
                    storeActive: storeActiveInput ? (storeActiveInput.checked ? 1 : 0) : 1,
                    schedule: document.getElementById('store-schedule').value.trim(),
                    image: document.getElementById('store-image').value.trim()
                };

                const result = await this.model.addStore(newStoreData);
                if (!this.handleAuthResultCheck(result)) return;

                if (result && result.success) {
                    this.refreshFilterBar();
                    this.refreshStoresData();
                    this.view.renderAuditLogs(this.model.getAuditLogs());
                    formAddStore.reset();
                    if (waActiveInput) waActiveInput.checked = true;
                    if (igActiveInput) igActiveInput.checked = true;
                    if (tkActiveInput) tkActiveInput.checked = true;
                    if (mapsActiveInput) mapsActiveInput.checked = true;
                    if (storeActiveInput) storeActiveInput.checked = true;
                    document.getElementById('store-image').value = 'assets/images/tienda-nuala.webp';
                    document.getElementById('store-image-preview').src = 'assets/images/tienda-nuala.webp';
                    this.view.showToast('Tienda registrada exitosamente.', 'success');
                } else {
                    this.view.showToast(result?.message || 'Error al guardar tienda.', 'error');
                }
            });
        }

        // Delegación de eventos en lista de prendas
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
                        const result = await this.model.deleteProduct(productId);
                        if (!this.handleAuthResultCheck(result)) return;
                        if (result && result.success) {
                            this.refreshProductsData();
                            this.view.renderAuditLogs(this.model.getAuditLogs());
                            this.view.showToast('Prenda eliminada del carrusel.', 'info');
                        }
                    }
                }
            });
        }

        // Delegación de eventos en lista de tiendas (Pausar/Publicar, Editar, Eliminar)
        if (this.view.adminStoresList) {
            this.view.adminStoresList.addEventListener('click', async (e) => {
                const toggleBtn = e.target.closest('.btn-toggle-store');
                const editBtn = e.target.closest('.btn-edit-store');
                const deleteBtn = e.target.closest('.btn-delete-store');

                if (toggleBtn) {
                    const storeId = toggleBtn.getAttribute('data-id');
                    const currentActive = parseInt(toggleBtn.getAttribute('data-active'), 10) === 1;
                    const result = await this.model.toggleStoreStatus(storeId, !currentActive);
                    if (!this.handleAuthResultCheck(result)) return;

                    if (result && result.success) {
                        this.refreshFilterBar();
                        this.refreshStoresData();
                        this.view.renderAuditLogs(this.model.getAuditLogs());
                        this.view.showToast(result.message, 'info');
                    }
                } else if (editBtn) {
                    const storeId = editBtn.getAttribute('data-id');
                    const store = this.model.getStoreById(storeId);
                    if (store) this.view.openEditStoreModal(store);
                } else if (deleteBtn) {
                    const storeId = deleteBtn.getAttribute('data-id');
                    if (confirm('¿Estás seguro de eliminar permanentemente esta tienda física?')) {
                        const storeToDelete = this.model.getStoreById(storeId);
                        const result = await this.model.deleteStore(storeId);
                        if (!this.handleAuthResultCheck(result)) return;

                        if (result && result.success) {
                            if (storeToDelete) {
                                const remainingInState = this.model.filterStores({ state: storeToDelete.state });
                                if (remainingInState.length === 0 && normalizeComparableText(this.activeStateFilter) === normalizeComparableText(storeToDelete.state)) {
                                    this.activeStateFilter = 'Todas';
                                }
                            }
                            this.refreshFilterBar();
                            this.refreshStoresData();
                            this.view.renderAuditLogs(this.model.getAuditLogs());
                            this.view.showToast('Tienda eliminada.', 'info');
                        }
                    }
                }
            });
        }
    }

    /**
     * Configura el formulario para actualizar configuración general y seguridad.
     */
    setupHeroFormEvents() {
        const formEditHero = document.getElementById('form-edit-hero');
        if (formEditHero) {
            formEditHero.addEventListener('submit', async (e) => {
                e.preventDefault();
                const titleVal = document.getElementById('hero-title-input')?.value.trim() || '';
                const subtitleVal = document.getElementById('hero-subtitle-input')?.value.trim() || '';
                const descriptionVal = document.getElementById('hero-description-input')?.value.trim() || '';
                const heightVal = document.getElementById('carousel-height-input')?.value.trim() || '520';
                const fitVal = document.getElementById('carousel-fit-input')?.value.trim() || 'cover';
                const pinVal = document.getElementById('admin-pin-change-input')?.value.trim() || '';

                const statsTaglineVal = document.getElementById('stats-tagline-input')?.value.trim() || 'Cerca de ti';
                const statsNumberVal = document.getElementById('stats-number-input')?.value.trim() || '+30';
                const statsHeadingVal = document.getElementById('stats-heading-input')?.value.trim() || 'Tiendas en todo el país';
                const statsTextVal = document.getElementById('stats-text-input')?.value.trim() || '';
                const statsButtonVal = document.getElementById('stats-button-input')?.value.trim() || 'Explorar Tiendas';
                const statsBgImageVal = document.getElementById('stats-bg-image')?.value.trim() || 'assets/images/tienda-nuala.jpg';

                const configsToSave = {
                    hero_title: titleVal,
                    hero_subtitle: subtitleVal,
                    hero_description: descriptionVal,
                    carousel_height: heightVal,
                    carousel_object_fit: fitVal,
                    stats_tagline: statsTaglineVal,
                    stats_number: statsNumberVal,
                    stats_heading: statsHeadingVal,
                    stats_description: statsTextVal,
                    stats_button_text: statsButtonVal,
                    stats_bg_image: statsBgImageVal,
                    stats_section_active: document.getElementById('stats-section-active')?.checked ? '1' : '0',
                    stats_bg_active: document.getElementById('stats-bg-active')?.checked ? '1' : '0',
                    stats_tagline_active: document.getElementById('stats-tagline-active')?.checked ? '1' : '0',
                    stats_number_active: document.getElementById('stats-number-active')?.checked ? '1' : '0',
                    stats_heading_active: document.getElementById('stats-heading-active')?.checked ? '1' : '0',
                    stats_description_active: document.getElementById('stats-description-active')?.checked ? '1' : '0',
                    stats_button_active: document.getElementById('stats-button-active')?.checked ? '1' : '0'
                };

                if (pinVal) {
                    if (pinVal.length < 4) {
                        this.view.showToast('El nuevo PIN debe tener al menos 4 caracteres.', 'error');
                        return;
                    }
                    configsToSave.admin_pin = pinVal;
                }

                const result = await this.model.saveConfig(configsToSave);
                if (!this.handleAuthResultCheck(result)) return;

                if (result && result.success) {
                    this.view.renderGeneralConfig(this.model.getConfig());
                    this.view.renderAuditLogs(this.model.getAuditLogs());
                    const pinChangeInput = document.getElementById('admin-pin-change-input');
                    if (pinChangeInput) pinChangeInput.value = '';
                    this.view.showToast('Configuración general guardada con éxito.', 'success');
                } else {
                    this.view.showToast(result?.message || 'Error al guardar configuración.', 'error');
                }
            });
        }
    }

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
                    unitType: document.getElementById('edit-product-unit')?.value || 'Docena',
                    description: document.getElementById('edit-product-description').value.trim(),
                    image: document.getElementById('edit-product-image').value.trim()
                };

                const result = await this.model.updateProduct(productId, updatedData);
                if (!this.handleAuthResultCheck(result)) return;

                if (result && result.success) {
                    this.view.closeEditProductModal();
                    this.refreshProductsData();
                    this.view.renderAuditLogs(this.model.getAuditLogs());
                    this.view.showToast('Prenda actualizada correctamente.', 'success');
                } else {
                    this.view.showToast(result?.message || 'Error al actualizar prenda.', 'error');
                }
            });
        }
    }

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
                const waActiveInput = document.getElementById('edit-store-whatsapp-active');
                const igActiveInput = document.getElementById('edit-store-instagram-active');
                const tkActiveInput = document.getElementById('edit-store-tiktok-active');
                const mapsActiveInput = document.getElementById('edit-store-maps-active');
                const casheaActiveInput = document.getElementById('edit-store-cashea-active');
                const storeActiveInput = document.getElementById('edit-store-active');

                const updatedData = {
                    name: document.getElementById('edit-store-name').value.trim(),
                    city: document.getElementById('edit-store-city').value.trim(),
                    state: document.getElementById('edit-store-state').value.trim(),
                    address: document.getElementById('edit-store-address').value.trim(),
                    phone: '',
                    whatsapp: document.getElementById('edit-store-whatsapp')?.value.trim() || '',
                    whatsappActive: waActiveInput ? (waActiveInput.checked ? 1 : 0) : 1,
                    instagram: document.getElementById('edit-store-instagram')?.value.trim() || '',
                    instagramActive: igActiveInput ? (igActiveInput.checked ? 1 : 0) : 1,
                    tiktok: document.getElementById('edit-store-tiktok')?.value.trim() || '',
                    tiktokActive: tkActiveInput ? (tkActiveInput.checked ? 1 : 0) : 1,
                    mapsUrl: document.getElementById('edit-store-maps-url')?.value.trim() || '',
                    mapsActive: mapsActiveInput ? (mapsActiveInput.checked ? 1 : 0) : 1,
                    casheaActive: casheaActiveInput ? (casheaActiveInput.checked ? 1 : 0) : 0,
                    saleType: document.getElementById('edit-store-sale-type')?.value || 'Detal',
                    storeActive: storeActiveInput ? (storeActiveInput.checked ? 1 : 0) : 1,
                    schedule: document.getElementById('edit-store-schedule').value.trim(),
                    image: document.getElementById('edit-store-image').value.trim()
                };

                const result = await this.model.updateStore(storeId, updatedData);
                if (!this.handleAuthResultCheck(result)) return;

                if (result && result.success) {
                    this.view.closeEditStoreModal();
                    this.refreshFilterBar();
                    this.refreshStoresData();
                    this.view.renderAuditLogs(this.model.getAuditLogs());
                    this.view.showToast('Tienda, dirección y canales actualizados correctamente.', 'success');
                } else {
                    this.view.showToast(result?.message || 'Error al actualizar tienda.', 'error');
                }
            });
        }
    }

    refreshStoresData() {
        const filteredStores = this.model.filterStores({
            state: this.activeStateFilter,
            searchQuery: this.searchQuery,
            quickFilter: this.activeQuickFilter
        });
        const totalPublicStores = this.model.getStores().length;
        this.view.renderStores(filteredStores, totalPublicStores);

        const filteredAdminStores = this.model.filterAdminStores(this.adminSearchQuery);
        this.view.renderAdminStoresList(filteredAdminStores);
    }

    refreshProductsData() {
        const products = this.model.getProducts();
        this.view.renderProducts(products);
        this.view.renderAdminProductsList(products);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const model = new NualaModel();
    const view = new NualaView();
    new NualaController(model, view);
});
