/**
 * Clase CarouselComponent - Gestiona los carruseles de forma reutilizable y genérica.
 * Sigue los principios SOLID (Open/Closed y Single Responsibility).
 */
export class CarouselComponent {
    constructor(config) {
        this.container = document.getElementById(config.containerId);
        this.wrapper = document.getElementById(config.wrapperId);
        this.btnPrev = document.getElementById(config.prevBtnId);
        this.btnNext = document.getElementById(config.nextBtnId);
        this.indicatorsContainer = document.getElementById(config.indicatorContainerId);
        this.itemsToShow = config.itemsToShow || 1;
        
        this.currentIndex = 0;
        this.slides = [];
        this.indicators = [];
        
        this.initEventListeners();
    }

    initEventListeners() {
        if (this.btnPrev) {
            this.btnPrev.addEventListener('click', () => this.prevSlide());
        }
        if (this.btnNext) {
            this.btnNext.addEventListener('click', () => this.nextSlide());
        }
        
        let startX = 0;
        let endX = 0;
        
        if (this.container) {
            this.container.addEventListener('touchstart', (e) => {
                startX = e.touches[0].clientX;
            }, { passive: true });

            this.container.addEventListener('touchmove', (e) => {
                endX = e.touches[0].clientX;
            }, { passive: true });

            this.container.addEventListener('touchend', () => {
                const threshold = 50;
                if (startX - endX > threshold) {
                    this.nextSlide();
                } else if (endX - startX > threshold) {
                    this.prevSlide();
                }
            });
        }

        window.addEventListener('resize', () => this.updateCarouselPosition());
    }

    setupIndicators() {
        if (!this.wrapper) return;
        this.slides = this.wrapper.children;
        const totalItems = this.slides.length;
        
        if (totalItems === 0) {
            if (this.indicatorsContainer) this.indicatorsContainer.innerHTML = '';
            this.currentIndex = 0;
            return;
        }

        const maxSteps = Math.ceil(totalItems / this.itemsToShow);

        if (this.indicatorsContainer) {
            this.indicatorsContainer.innerHTML = '';
            this.indicators = [];
            
            for (let i = 0; i < maxSteps; i++) {
                const indicator = document.createElement('div');
                indicator.className = `indicator ${i === 0 ? 'active' : ''}`;
                indicator.addEventListener('click', () => this.goToSlide(i));
                this.indicatorsContainer.appendChild(indicator);
                this.indicators.push(indicator);
            }
        }
        this.currentIndex = 0;
        this.updateCarouselPosition();
    }

    goToSlide(index) {
        const totalItems = this.slides.length;
        if (totalItems === 0) return;

        const maxIndex = Math.ceil(totalItems / this.itemsToShow) - 1;
        
        if (index < 0) {
            this.currentIndex = maxIndex;
        } else if (index > maxIndex) {
            this.currentIndex = 0;
        } else {
            this.currentIndex = index;
        }
        
        this.updateCarouselPosition();
    }

    prevSlide() {
        this.goToSlide(this.currentIndex - 1);
    }

    nextSlide() {
        this.goToSlide(this.currentIndex + 1);
    }

    updateCarouselPosition() {
        if (!this.slides.length) return;
        
        const isMobile = window.innerWidth <= 1024;
        const effectiveItemsToShow = isMobile ? 1 : this.itemsToShow;

        const slideWidth = this.slides[0].offsetWidth;
        const gap = parseInt(window.getComputedStyle(this.wrapper).gap) || 0;
        const offset = this.currentIndex * effectiveItemsToShow * (slideWidth + gap);
        
        this.wrapper.style.transform = `translateX(-${offset}px)`;
        
        this.indicators.forEach((indicator, idx) => {
            if (idx === this.currentIndex) {
                indicator.classList.add('active');
            } else {
                indicator.classList.remove('active');
            }
        });
    }
}

/**
 * Helper para formatear y construir el enlace de WhatsApp.
 * Si es número telefónico, elimina caracteres no numéricos y antepone código de país si es necesario.
 */
export function buildWhatsappUrl(phoneOrUrl) {
    if (!phoneOrUrl) return '';
    const trimmed = phoneOrUrl.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return trimmed;
    }
    const numeric = trimmed.replace(/\D/g, '');
    if (!numeric) return '';
    let fullNumber = numeric;
    if (numeric.startsWith('0')) {
        fullNumber = '58' + numeric.substring(1);
    } else if (!numeric.startsWith('58') && numeric.length === 10) {
        fullNumber = '58' + numeric;
    }
    return `https://wa.me/${fullNumber}`;
}

/**
 * Helper para formatear y construir el enlace de Instagram.
 */
export function buildInstagramUrl(userOrUrl) {
    if (!userOrUrl) return '';
    const trimmed = userOrUrl.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return trimmed;
    }
    const cleanUser = trimmed.replace(/^@/, '');
    return `https://instagram.com/${cleanUser}`;
}

/**
 * Clase NualaView - Gestiona el DOM, renderizado de plantillas, modales y recorte con Cropper.js.
 * Sigue los principios SOLID y utiliza camelCase para variables JavaScript.
 */
export class NualaView {
    constructor() {
        // Elementos del Hero principales
        this.heroTitle = document.getElementById('hero-title');
        this.heroSubtitle = document.getElementById('hero-subtitle');
        this.heroDescription = document.getElementById('hero-description');

        // Elementos de la Sección 'Cerca de ti' (Expansión Nacional)
        this.statsTagline = document.getElementById('stats-tagline');
        this.statsMainNumber = document.getElementById('stats-main-number');
        this.statsHeading = document.getElementById('stats-heading');
        this.statsText = document.getElementById('stats-text');
        this.btnViewLocations = document.getElementById('btn-view-locations');
        this.statsBg = document.getElementById('stats-bg');

        // Formulario de edición del Hero y Dimensiones
        this.heroTitleInput = document.getElementById('hero-title-input');
        this.heroSubtitleInput = document.getElementById('hero-subtitle-input');
        this.heroDescriptionInput = document.getElementById('hero-description-input');
        this.carouselHeightInput = document.getElementById('carousel-height-input');
        this.carouselFitInput = document.getElementById('carousel-fit-input');

        // Formulario de edición de la Sección 'Cerca de ti'
        this.statsBgImageInput = document.getElementById('stats-bg-image');
        this.statsBgPreview = document.getElementById('stats-bg-preview');
        this.statsTaglineInput = document.getElementById('stats-tagline-input');
        this.statsNumberInput = document.getElementById('stats-number-input');
        this.statsHeadingInput = document.getElementById('stats-heading-input');
        this.statsTextInput = document.getElementById('stats-text-input');
        this.statsButtonInput = document.getElementById('stats-button-input');

        // Contenedores del DOM
        this.productsWrapper = document.getElementById('products-wrapper');
        this.storesWrapper = document.getElementById('stores-wrapper');
        this.header = document.querySelector('.main-header');
        this.navLinks = document.querySelectorAll('.nav-link');
        this.locationsFilterBar = document.getElementById('locations-filter-bar');
        this.toastContainer = document.getElementById('toast-container');

        // Modales
        this.adminPinModal = document.getElementById('admin-pin-modal');
        this.adminModal = document.getElementById('admin-modal');
        this.editProductModal = document.getElementById('edit-product-modal');
        this.editStoreModal = document.getElementById('edit-store-modal');
        this.cropImageModal = document.getElementById('crop-image-modal');

        // Instancia de Cropper.js
        this.cropperTargetImage = document.getElementById('cropper-target-image');
        this.cropperInstance = null;

        // Listas del panel de administración
        this.adminStoresList = document.getElementById('admin-stores-list');
        this.adminProductsList = document.getElementById('admin-products-list');
        this.tabButtons = document.querySelectorAll('.tab-btn');
        this.tabContents = document.querySelectorAll('.tab-content');
        
        // Componentes reutilizables de Carrusel
        this.productsCarousel = new CarouselComponent({
            containerId: 'products-carousel',
            wrapperId: 'products-wrapper',
            prevBtnId: 'products-prev',
            nextBtnId: 'products-next',
            indicatorContainerId: 'products-indicators',
            itemsToShow: 1
        });

        this.storesCarousel = new CarouselComponent({
            containerId: 'stores-carousel',
            wrapperId: 'stores-wrapper',
            prevBtnId: 'stores-prev',
            nextBtnId: 'stores-next',
            indicatorContainerId: 'stores-indicators',
            itemsToShow: 3
        });
    }

    /**
     * Renderiza la configuración general del sitio (Hero, Dimensiones del Carrusel y Sección Cerca de ti).
     */
    renderGeneralConfig(config) {
        if (!config) return;

        // 1. Hero Principal
        if (config.hero_title && this.heroTitle) {
            this.heroTitle.textContent = config.hero_title;
        }
        if (config.hero_subtitle && this.heroSubtitle) {
            this.heroSubtitle.textContent = config.hero_subtitle;
        }
        if (config.hero_description && this.heroDescription) {
            this.heroDescription.textContent = config.hero_description;
        }

        if (this.heroTitleInput) this.heroTitleInput.value = config.hero_title || '';
        if (this.heroSubtitleInput) this.heroSubtitleInput.value = config.hero_subtitle || '';
        if (this.heroDescriptionInput) this.heroDescriptionInput.value = config.hero_description || '';

        // Dimensiones y encuadre configurables del carrusel por el usuario de marketing
        const heightVal = config.carousel_height || '520';
        const fitVal = config.carousel_object_fit || 'cover';

        if (this.carouselHeightInput) this.carouselHeightInput.value = heightVal;
        if (this.carouselFitInput) this.carouselFitInput.value = fitVal;

        // Inyectar variables CSS globales para tamaño uniforme
        document.documentElement.style.setProperty('--carousel-height', `${heightVal}px`);
        document.documentElement.style.setProperty('--carousel-fit', fitVal);

        // 2. Sección Cerca de ti (Expansión Nacional / Estadísticas)
        if (config.stats_tagline && this.statsTagline) {
            this.statsTagline.textContent = config.stats_tagline;
        }
        if (config.stats_number && this.statsMainNumber) {
            this.statsMainNumber.textContent = config.stats_number;
        }
        if (config.stats_heading && this.statsHeading) {
            this.statsHeading.textContent = config.stats_heading;
        }
        if (config.stats_description && this.statsText) {
            this.statsText.textContent = config.stats_description;
        }
        if (config.stats_button_text && this.btnViewLocations) {
            this.btnViewLocations.textContent = config.stats_button_text;
        }
        if (config.stats_bg_image && this.statsBg) {
            this.statsBg.style.backgroundImage = `url('${config.stats_bg_image}')`;
        }

        // Poblar campos del formulario en el panel de administración
        if (this.statsTaglineInput) this.statsTaglineInput.value = config.stats_tagline || 'Cerca de ti';
        if (this.statsNumberInput) this.statsNumberInput.value = config.stats_number || '+30';
        if (this.statsHeadingInput) this.statsHeadingInput.value = config.stats_heading || 'Tiendas en todo el país';
        if (this.statsTextInput) this.statsTextInput.value = config.stats_description || '';
        if (this.statsButtonInput) this.statsButtonInput.value = config.stats_button_text || 'Explorar Tiendas';
        if (this.statsBgImageInput) this.statsBgImageInput.value = config.stats_bg_image || 'assets/images/tienda-nuala.jpg';
        if (this.statsBgPreview) this.statsBgPreview.src = config.stats_bg_image || 'assets/images/tienda-nuala.jpg';
    }

    /**
     * Mantiene retrocompatibilidad para llamadas existentes a renderHeroConfig.
     */
    renderHeroConfig(config) {
        this.renderGeneralConfig(config);
    }

    /**
     * Renderiza las prendas en el carrusel principal.
     */
    renderProducts(products) {
        if (!this.productsWrapper) return;
        this.productsWrapper.innerHTML = '';

        if (products.length === 0) {
            this.productsWrapper.innerHTML = `
                <div class="carousel-slide" style="justify-content: center; align-items: center; background: var(--color-primary-light); padding: 40px; text-align: center;">
                    <div style="color: var(--color-text-main); font-family: var(--font-serif); font-size: 1.5rem;">
                        <i class="fa-regular fa-image" style="font-size: 3rem; margin-bottom: 15px; color: var(--color-primary-dark); display: block;"></i>
                        No hay prendas en el carrusel.
                        <p style="font-family: var(--font-sans); font-size: 0.85rem; color: var(--color-text-muted); margin-top: 10px;">Agrega o edita prendas desde el panel de configuración.</p>
                    </div>
                </div>
            `;
            this.productsCarousel.setupIndicators();
            return;
        }

        products.forEach(product => {
            const slide = document.createElement('div');
            slide.className = 'carousel-slide';
            const imgPath = product.image || 'assets/images/lenceria-femenina.webp';
            slide.innerHTML = `
                <img src="${imgPath}" alt="${product.name}" loading="eager" onerror="this.onerror=null; this.src='assets/images/lenceria-femenina.webp';">
                <div class="carousel-info">
                    <div class="carousel-info-text">
                        <h3>${product.name}</h3>
                        <p>${product.category}</p>
                    </div>
                    <div class="carousel-price">${product.price}</div>
                </div>
            `;
            this.productsWrapper.appendChild(slide);
        });

        this.productsCarousel.setupIndicators();
    }

    /**
     * Renderiza las tiendas físicas en el carrusel de ubicaciones.
     */
    renderStores(stores) {
        if (!this.storesWrapper) return;
        this.storesWrapper.innerHTML = '';

        if (stores.length === 0) {
            this.storesWrapper.innerHTML = `
                <div style="grid-column: span 3; width: 100%; display: flex; justify-content: center; align-items: center; background: var(--color-white); border: 1px solid var(--color-border); padding: 50px; border-radius: 16px; text-align: center;">
                    <div style="color: var(--color-text-main); font-family: var(--font-serif); font-size: 1.5rem;">
                        <i class="fa-solid fa-store-slash" style="font-size: 3.5rem; margin-bottom: 15px; color: var(--color-primary-dark); display: block;"></i>
                        No hay tiendas registradas.
                        <p style="font-family: var(--font-sans); font-size: 0.85rem; color: var(--color-text-muted); margin-top: 10px;">Agrega sucursales desde el panel de configuración.</p>
                    </div>
                </div>
            `;
            this.storesCarousel.setupIndicators();
            return;
        }

        stores.forEach((store, idx) => {
            const card = document.createElement('div');
            card.className = 'store-card';
            card.style.animationDelay = `${idx * 0.08}s`;
            const storeImgPath = store.image || 'assets/images/tienda-nuala.webp';
            const whatsappUrl = buildWhatsappUrl(store.whatsapp || store.phone);
            const instagramUrl = buildInstagramUrl(store.instagram);

            const isWhatsappActive = store.whatsapp_active === undefined || store.whatsapp_active === null || parseInt(store.whatsapp_active) === 1;
            const isInstagramActive = store.instagram_active === undefined || store.instagram_active === null || parseInt(store.instagram_active) === 1;

            let socialButtonsHtml = '';
            if (isWhatsappActive && whatsappUrl) {
                socialButtonsHtml += `
                    <a href="${whatsappUrl}" target="_blank" rel="noopener noreferrer" class="btn-store-social btn-store-whatsapp" title="Whatsapp de la tienda aqui">
                        <i class="fa-brands fa-whatsapp"></i>
                        <span>Whatsapp de la tienda aqui</span>
                    </a>
                `;
            }

            if (isInstagramActive && instagramUrl) {
                socialButtonsHtml += `
                    <a href="${instagramUrl}" target="_blank" rel="noopener noreferrer" class="btn-store-social btn-store-instagram" title="Instagram de la tienda">
                        <i class="fa-brands fa-instagram"></i>
                        <span>Instagram de la tienda</span>
                    </a>
                `;
            }

            card.innerHTML = `
                <div class="store-image">
                    <img src="${storeImgPath}" alt="${store.name}" loading="eager" onerror="this.onerror=null; this.src='assets/images/tienda-nuala.webp';">
                    <span class="store-badge">${store.city}</span>
                </div>
                <div class="store-info">
                    <div>
                        <h3 class="store-name">${store.name}</h3>
                        <p class="store-address">${store.address}</p>
                    </div>
                    <div class="store-bottom-section">
                        <div class="store-contact">
                            <span><i class="fa-solid fa-phone"></i> ${store.phone}</span>
                            <span><i class="fa-regular fa-clock"></i> ${store.schedule}</span>
                        </div>
                        ${socialButtonsHtml ? `<div class="store-social-actions">${socialButtonsHtml}</div>` : ''}
                    </div>
                </div>
            `;
            this.storesWrapper.appendChild(card);
        });

        this.storesCarousel.setupIndicators();
    }

    /**
     * Renderiza la barra de filtro por Estado.
     * Cuenta los filtros con JS y aplica un salto a la mitad para distribuir en dos filas ordenadas.
     * Compara estados en minúsculas (toLowerCase()).
     */
    renderFilterBar(states, activeState) {
        if (!this.locationsFilterBar) return;
        this.locationsFilterBar.innerHTML = '';

        const activeNormalized = activeState ? activeState.toLowerCase() : 'todas';
        const allFilters = ['Todas', ...(Array.isArray(states) ? states : [])];
        const totalFilters = allFilters.length;
        const midPoint = totalFilters > 2 ? Math.ceil(totalFilters / 2) : totalFilters;

        allFilters.forEach((filterItem, index) => {
            // Cuando llega a la mitad, inserta un elemento de salto para pasar la otra mitad a la siguiente fila
            if (index === midPoint) {
                const lineBreak = document.createElement('div');
                lineBreak.className = 'filter-break';
                this.locationsFilterBar.appendChild(lineBreak);
            }

            const btn = document.createElement('button');
            const isFilterActive = activeNormalized === filterItem.toLowerCase();
            btn.className = `filter-btn ${isFilterActive ? 'active' : ''}`;
            btn.setAttribute('data-state', filterItem);
            btn.textContent = filterItem;
            this.locationsFilterBar.appendChild(btn);
        });
    }

    /**
     * Renderiza la lista de tiendas en el panel administrativo con botones para Editar y Eliminar.
     */
    renderAdminStoresList(stores) {
        if (!this.adminStoresList) return;
        this.adminStoresList.innerHTML = '';
        
        if (stores.length === 0) {
            this.adminStoresList.innerHTML = '<p style="text-align: center; color: var(--color-text-muted); font-size: 0.85rem; padding: 20px;">No hay tiendas. Añade una usando el formulario.</p>';
            return;
        }

        stores.forEach(store => {
            const row = document.createElement('div');
            row.className = 'admin-item-row';
            const thumbImg = store.image || 'assets/images/tienda-nuala.webp';
            const whatsappUrl = buildWhatsappUrl(store.whatsapp);
            const instagramUrl = buildInstagramUrl(store.instagram);

            const isWhatsappActive = store.whatsapp_active === undefined || store.whatsapp_active === null || parseInt(store.whatsapp_active) === 1;
            const isInstagramActive = store.instagram_active === undefined || store.instagram_active === null || parseInt(store.instagram_active) === 1;

            let socialTagsHtml = '';
            if (whatsappUrl) {
                const statusClass = isWhatsappActive ? 'tag-wa' : 'tag-disabled';
                const statusText = isWhatsappActive ? '' : ' (Desactivado)';
                socialTagsHtml += `<span class="admin-social-tag ${statusClass}" title="WhatsApp: ${store.whatsapp}${statusText}"><i class="fa-brands fa-whatsapp"></i> ${store.whatsapp}${statusText}</span>`;
            }
            if (instagramUrl) {
                const statusClass = isInstagramActive ? 'tag-ig' : 'tag-disabled';
                const statusText = isInstagramActive ? '' : ' (Desactivado)';
                socialTagsHtml += `<span class="admin-social-tag ${statusClass}" title="Instagram: ${store.instagram}${statusText}"><i class="fa-brands fa-instagram"></i> ${store.instagram}${statusText}</span>`;
            }

            row.innerHTML = `
                <div class="admin-item-thumb">
                    <img src="${thumbImg}" alt="${store.name}" onerror="this.onerror=null; this.src='assets/images/tienda-nuala.webp';">
                </div>
                <div class="admin-item-details">
                    <h4>${store.name}</h4>
                    <p class="admin-item-sub">${store.city} (${store.state}) - ${store.phone}</p>
                    <p class="admin-item-addr"><i class="fa-solid fa-location-dot"></i> ${store.address}</p>
                    ${socialTagsHtml ? `<div class="admin-social-tags-container">${socialTagsHtml}</div>` : ''}
                </div>
                <div class="admin-item-actions">
                    <button class="admin-action-btn btn-edit-store" data-id="${store.id}" title="Editar tienda y dirección">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button class="admin-action-btn btn-delete-store danger" data-id="${store.id}" title="Eliminar tienda">
                        <i class="fa-regular fa-trash-can"></i>
                    </button>
                </div>
            `;
            this.adminStoresList.appendChild(row);
        });
    }

    /**
     * Renderiza la lista de productos del carrusel en el panel administrativo con botones para Editar y Eliminar.
     */
    renderAdminProductsList(products) {
        if (!this.adminProductsList) return;
        this.adminProductsList.innerHTML = '';
        
        if (products.length === 0) {
            this.adminProductsList.innerHTML = '<p style="text-align: center; color: var(--color-text-muted); font-size: 0.85rem; padding: 20px;">No hay prendas. Añade una usando el formulario.</p>';
            return;
        }

        products.forEach(product => {
            const row = document.createElement('div');
            row.className = 'admin-item-row';
            const thumbImg = product.image || 'assets/images/lenceria-femenina.webp';
            row.innerHTML = `
                <div class="admin-item-thumb">
                    <img src="${thumbImg}" alt="${product.name}" onerror="this.onerror=null; this.src='assets/images/lenceria-femenina.webp';">
                </div>
                <div class="admin-item-details">
                    <h4>${product.name}</h4>
                    <p class="admin-item-sub">${product.category} - <strong style="color: var(--color-primary-dark);">${product.price}</strong></p>
                    <p class="admin-item-desc">${product.description || ''}</p>
                </div>
                <div class="admin-item-actions">
                    <button class="admin-action-btn btn-edit-product" data-id="${product.id}" title="Editar prenda e imagen">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button class="admin-action-btn btn-delete-product danger" data-id="${product.id}" title="Eliminar prenda">
                        <i class="fa-regular fa-trash-can"></i>
                    </button>
                </div>
            `;
            this.adminProductsList.appendChild(row);
        });
    }

    // --- Control del Modal de Recorte Interactivo (Cropper.js) ---

    /**
     * Abre el modal de recorte e inicializa la instancia de Cropper.js con la imagen seleccionada.
     */
    openCropModal(imageDataUrl, onCropConfirmed) {
        if (!this.cropImageModal || !this.cropperTargetImage) return;

        this.destroyCropper();

        // 1. Mostrar primero el modal para que el contenedor adquiera dimensiones en el DOM
        this.cropImageModal.classList.add('open');
        document.body.style.overflow = 'hidden';

        const startCropper = () => {
            this.destroyCropper();
            /* global Cropper */
            if (typeof Cropper !== 'undefined') {
                try {
                    this.cropperInstance = new Cropper(this.cropperTargetImage, {
                        aspectRatio: 1, // Cuadrado perfecto 1:1 estandarizado
                        viewMode: 1,
                        dragMode: 'move',
                        autoCropArea: 0.85,
                        restore: false,
                        guides: true,
                        center: true,
                        highlight: false,
                        cropBoxMovable: true,
                        cropBoxResizable: true,
                        toggleDragModeOnDblclick: false,
                        responsive: true,
                        checkOrientation: false
                    });
                } catch (err) {
                    console.error('Error al instanciar Cropper:', err);
                }
            } else {
                console.error('Cropper.js no está disponible globalmente.');
                this.showToast('Herramienta de recorte no disponible.', 'error');
            }
        };

        // 2. Adjuntar el listener onload ANTES de asignar el src para evitar pérdida del evento en Base64
        this.cropperTargetImage.onload = () => {
            setTimeout(startCropper, 60);
        };

        this.cropperTargetImage.src = imageDataUrl;

        // Si la imagen ya estuviese completamente cargada de forma síncrona
        if (this.cropperTargetImage.complete) {
            setTimeout(startCropper, 60);
        }

        this.onCropConfirmedCallback = onCropConfirmed;
    }

    closeCropModal() {
        if (this.cropImageModal) {
            this.cropImageModal.classList.remove('open');
            document.body.style.overflow = '';
        }
        this.destroyCropper();
    }

    destroyCropper() {
        if (this.cropperInstance) {
            try {
                this.cropperInstance.destroy();
            } catch (err) {
                console.warn('Error al destruir instancia de Cropper:', err);
            }
            this.cropperInstance = null;
        }
    }

    /**
     * Obtiene el Blob de la imagen recortada según la selección visual del usuario.
     */
    getCroppedCanvasBlob() {
        return new Promise((resolve) => {
            if (!this.cropperInstance) {
                resolve(null);
                return;
            }
            try {
                const canvas = this.cropperInstance.getCroppedCanvas({
                    width: 900,
                    height: 900,
                    imageSmoothingEnabled: true,
                    imageSmoothingQuality: 'high'
                });
                if (canvas) {
                    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9);
                } else {
                    resolve(null);
                }
            } catch (err) {
                console.error('Error al generar canvas de recorte:', err);
                resolve(null);
            }
        });
    }

    /**
     * Configura los botones de la barra de herramientas del Cropper (zoom, rotar, reiniciar).
     */
    setupCropperToolbarEvents() {
        const btnZoomIn = document.getElementById('btn-crop-zoom-in');
        const btnZoomOut = document.getElementById('btn-crop-zoom-out');
        const btnRotateLeft = document.getElementById('btn-crop-rotate-left');
        const btnRotateRight = document.getElementById('btn-crop-rotate-right');
        const btnReset = document.getElementById('btn-crop-reset');
        const btnClose = document.getElementById('btn-close-crop-modal');

        if (btnZoomIn) btnZoomIn.addEventListener('click', () => this.cropperInstance && this.cropperInstance.zoom(0.1));
        if (btnZoomOut) btnZoomOut.addEventListener('click', () => this.cropperInstance && this.cropperInstance.zoom(-0.1));
        if (btnRotateLeft) btnRotateLeft.addEventListener('click', () => this.cropperInstance && this.cropperInstance.rotate(-90));
        if (btnRotateRight) btnRotateRight.addEventListener('click', () => this.cropperInstance && this.cropperInstance.rotate(90));
        if (btnReset) btnReset.addEventListener('click', () => this.cropperInstance && this.cropperInstance.reset());
        if (btnClose) btnClose.addEventListener('click', () => this.closeCropModal());
    }

    // --- Control de Modales Generales ---

    openPinModal() {
        if (this.adminPinModal) {
            this.adminPinModal.classList.add('open');
            document.body.style.overflow = 'hidden';
            const pinInput = document.getElementById('admin-pin-input');
            if (pinInput) {
                pinInput.value = '';
                pinInput.focus();
            }
        }
    }

    closePinModal() {
        if (this.adminPinModal) {
            this.adminPinModal.classList.remove('open');
            document.body.style.overflow = '';
        }
    }

    openAdminModal() {
        this.closePinModal();
        if (this.adminModal) {
            this.adminModal.classList.add('open');
            document.body.style.overflow = 'hidden';
        }
    }

    closeAdminModal() {
        if (this.adminModal) {
            this.adminModal.classList.remove('open');
            document.body.style.overflow = '';
        }
    }

    openEditProductModal(product) {
        if (!product || !this.editProductModal) return;
        
        document.getElementById('edit-product-id').value = product.id;
        document.getElementById('edit-product-name').value = product.name;
        document.getElementById('edit-product-category').value = product.category;
        document.getElementById('edit-product-price').value = product.price;
        document.getElementById('edit-product-description').value = product.description || '';
        document.getElementById('edit-product-image').value = product.image;
        
        const preview = document.getElementById('edit-product-preview');
        if (preview) preview.src = product.image;

        this.editProductModal.classList.add('open');
    }

    closeEditProductModal() {
        if (this.editProductModal) {
            this.editProductModal.classList.remove('open');
        }
    }

    openEditStoreModal(store) {
        if (!store || !this.editStoreModal) return;
        
        document.getElementById('edit-store-id').value = store.id;
        document.getElementById('edit-store-name').value = store.name;
        document.getElementById('edit-store-city').value = store.city;
        document.getElementById('edit-store-state').value = store.state;
        document.getElementById('edit-store-address').value = store.address;
        document.getElementById('edit-store-phone').value = store.phone;
        document.getElementById('edit-store-whatsapp').value = store.whatsapp || '';
        document.getElementById('edit-store-instagram').value = store.instagram || '';
        
        const waActiveCheck = document.getElementById('edit-store-whatsapp-active');
        if (waActiveCheck) {
            waActiveCheck.checked = store.whatsapp_active === undefined || store.whatsapp_active === null || parseInt(store.whatsapp_active) === 1;
        }

        const igActiveCheck = document.getElementById('edit-store-instagram-active');
        if (igActiveCheck) {
            igActiveCheck.checked = store.instagram_active === undefined || store.instagram_active === null || parseInt(store.instagram_active) === 1;
        }

        document.getElementById('edit-store-schedule').value = store.schedule || '';
        document.getElementById('edit-store-image').value = store.image;
        
        const preview = document.getElementById('edit-store-preview');
        if (preview) preview.src = store.image;

        this.editStoreModal.classList.add('open');
    }

    closeEditStoreModal() {
        if (this.editStoreModal) {
            this.editStoreModal.classList.remove('open');
        }
    }

    showToast(message, type = 'success') {
        if (!this.toastContainer) return;
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const iconClass = type === 'success' ? 'fa-circle-check' : (type === 'error' ? 'fa-circle-xmark' : 'fa-circle-info');
        toast.innerHTML = `
            <i class="fa-solid ${iconClass}"></i>
            <span>${message}</span>
        `;
        
        this.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }

    switchTab(targetTabId, activeBtn) {
        this.tabButtons.forEach(btn => btn.classList.remove('active'));
        this.tabContents.forEach(content => content.classList.remove('active'));

        activeBtn.classList.add('active');
        const targetTab = document.getElementById(targetTabId);
        if (targetTab) {
            targetTab.classList.add('active');
        }
    }

    toggleHeaderStyle(isScrolled) {
        if (isScrolled) {
            this.header.classList.add('scrolled');
        } else {
            this.header.classList.remove('scrolled');
        }
    }

    updateActiveNavLink(sectionId) {
        const sectionIdNormalized = sectionId.toLowerCase();
        this.navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href && href.toLowerCase() === `#${sectionIdNormalized}`) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }
}
