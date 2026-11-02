import { normalizeComparableText } from './model.js';

/**
 * Sanitiza texto dinámico para prevenir inyección XSS en plantillas HTML.
 */
export function escapeHtml(rawValue) {
    if (rawValue === null || rawValue === undefined) return '';
    return String(rawValue)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Construye de forma segura el enlace de WhatsApp con mensaje contextual de origen web.
 */
export function buildWhatsappUrl(phoneOrUrl, storeName = '') {
    if (!phoneOrUrl) return '';
    const trimmed = String(phoneOrUrl).trim();
    const normCheck = normalizeComparableText(trimmed);
    if (!trimmed || normCheck === 'no' || normCheck === 'na' || normCheck === 'n/a') {
        return '';
    }

    if (/^https?:\/\//i.test(trimmed)) {
        return trimmed;
    }

    const numeric = trimmed.replace(/\D/g, '');
    if (!numeric || numeric.length < 10) return '';

    let fullNumber = numeric;
    if (numeric.startsWith('0')) {
        fullNumber = '58' + numeric.substring(1);
    } else if (!numeric.startsWith('58') && numeric.length === 10) {
        fullNumber = '58' + numeric;
    }

    const greeting = storeName
        ? `Hola ${storeName}, les escribo desde la página web de NUALA para consultar disponibilidad.`
        : 'Hola NUALA, les escribo desde la página web.';

    return `https://wa.me/${fullNumber}?text=${encodeURIComponent(greeting)}`;
}

/**
 * Construye de forma segura enlaces a perfiles sociales (Instagram o TikTok).
 */
export function buildInstagramUrl(userOrUrl) {
    if (!userOrUrl) return '';
    const trimmed = String(userOrUrl).trim();
    const normCheck = normalizeComparableText(trimmed);
    if (!trimmed || normCheck === 'no' || normCheck === 'n/a') return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    const cleanUser = trimmed.replace(/^@+/, '').replace(/[^a-zA-Z0-9._]/g, '');
    return cleanUser ? `https://instagram.com/${cleanUser}` : '';
}

export function buildTiktokUrl(userOrUrl) {
    if (!userOrUrl) return '';
    const trimmed = String(userOrUrl).trim();
    const normCheck = normalizeComparableText(trimmed);
    if (!trimmed || normCheck === 'no' || normCheck === 'n/a') return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    const cleanUser = trimmed.replace(/^@+/, '').replace(/[^a-zA-Z0-9._]/g, '');
    return cleanUser ? `https://www.tiktok.com/@${cleanUser}` : '';
}

export function buildSafeMapsUrl(rawUrl) {
    if (!rawUrl) return '';
    const trimmed = String(rawUrl).trim();
    if (!/^https?:\/\//i.test(trimmed)) return '';
    return trimmed;
}

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

    getEffectiveItemsToShow() {
        if (window.innerWidth <= 768) return 1;
        if (window.innerWidth <= 1024) return Math.min(2, this.itemsToShow);
        return this.itemsToShow;
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
        let isTouching = false;

        if (this.container) {
            this.container.addEventListener('touchstart', (e) => {
                startX = e.touches[0].clientX;
                endX = startX;
                isTouching = true;
            }, { passive: true });

            this.container.addEventListener('touchmove', (e) => {
                if (!isTouching) return;
                endX = e.touches[0].clientX;
            }, { passive: true });

            this.container.addEventListener('touchend', () => {
                if (!isTouching) return;
                isTouching = false;
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

        if (totalItems === 0 || this.slides[0]?.classList.contains('empty-state-box')) {
            if (this.indicatorsContainer) this.indicatorsContainer.innerHTML = '';
            this.currentIndex = 0;
            this.wrapper.style.transform = 'translateX(0px)';
            return;
        }

        const effectiveItems = this.getEffectiveItemsToShow();
        const maxSteps = Math.max(1, Math.ceil(totalItems / effectiveItems));

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

        const effectiveItems = this.getEffectiveItemsToShow();
        const maxIndex = Math.max(0, Math.ceil(totalItems / effectiveItems) - 1);

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
        if (!this.slides.length || this.slides[0]?.classList.contains('empty-state-box')) {
            if (this.wrapper) this.wrapper.style.transform = 'translateX(0px)';
            return;
        }

        const effectiveItems = this.getEffectiveItemsToShow();
        const slideWidth = this.slides[0].offsetWidth;
        const gap = parseInt(window.getComputedStyle(this.wrapper).gap, 10) || 0;
        const offset = this.currentIndex * effectiveItems * (slideWidth + gap);

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
 * Clase NualaView - Gestiona el DOM, renderizado seguro, tema claro/oscuro, modales y Cropper.js.
 * Sigue los principios SOLID y utiliza camelCase para variables JavaScript.
 */
export class NualaView {
    constructor() {
        // Elementos del Hero principales
        this.heroTitle = document.getElementById('hero-title');
        this.heroSubtitle = document.getElementById('hero-subtitle');
        this.heroDescription = document.getElementById('hero-description');

        // Elementos de la Sección 'Cerca de ti' (Expansión Nacional)
        this.statsScene = document.getElementById('stats-scene');
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
        this.statsSectionActiveInput = document.getElementById('stats-section-active');
        this.statsBgActiveInput = document.getElementById('stats-bg-active');
        this.statsBgImageInput = document.getElementById('stats-bg-image');
        this.statsBgPreview = document.getElementById('stats-bg-preview');
        this.statsTaglineActiveInput = document.getElementById('stats-tagline-active');
        this.statsTaglineInput = document.getElementById('stats-tagline-input');
        this.statsNumberActiveInput = document.getElementById('stats-number-active');
        this.statsNumberInput = document.getElementById('stats-number-input');
        this.statsHeadingActiveInput = document.getElementById('stats-heading-active');
        this.statsHeadingInput = document.getElementById('stats-heading-input');
        this.statsDescriptionActiveInput = document.getElementById('stats-description-active');
        this.statsTextInput = document.getElementById('stats-text-input');
        this.statsButtonActiveInput = document.getElementById('stats-button-active');
        this.statsButtonInput = document.getElementById('stats-button-input');

        // Contenedores del DOM
        this.productsWrapper = document.getElementById('products-wrapper');
        this.storesWrapper = document.getElementById('stores-wrapper');
        this.storesResultsCounter = document.getElementById('stores-results-counter');
        this.header = document.querySelector('.main-header');
        this.navLinks = document.querySelectorAll('.nav-link');
        this.locationsFilterBar = document.getElementById('locations-filter-bar');
        this.toastContainer = document.getElementById('toast-container');
        this.btnThemeToggle = document.getElementById('btn-theme-toggle');

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
        this.adminAuditList = document.getElementById('admin-audit-list');
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
     * Aplica de forma controlada el tema claro (normal) u oscuro sin afectar la identidad corporativa por defecto.
     */
    applyTheme(themeName) {
        const cleanTheme = normalizeComparableText(themeName) === 'dark' ? 'dark' : 'normal';
        document.documentElement.setAttribute('data-theme', cleanTheme);
        if (this.btnThemeToggle) {
            const iconElem = this.btnThemeToggle.querySelector('i');
            if (iconElem) {
                iconElem.className = cleanTheme === 'dark' ? 'fa-regular fa-sun' : 'fa-regular fa-moon';
            }
            this.btnThemeToggle.setAttribute(
                'title',
                cleanTheme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'
            );
        }
    }

    /**
     * Renderiza la configuración general del sitio.
     */
    renderGeneralConfig(config) {
        if (!config) return;

        const isFieldActive = (val) => val === undefined || val === null || val === '1' || val === 1 || val === true;

        if (config.hero_title && this.heroTitle) this.heroTitle.textContent = config.hero_title;
        if (config.hero_subtitle && this.heroSubtitle) this.heroSubtitle.textContent = config.hero_subtitle;
        if (config.hero_description && this.heroDescription) this.heroDescription.textContent = config.hero_description;

        if (this.heroTitleInput) this.heroTitleInput.value = config.hero_title || '';
        if (this.heroSubtitleInput) this.heroSubtitleInput.value = config.hero_subtitle || '';
        if (this.heroDescriptionInput) this.heroDescriptionInput.value = config.hero_description || '';

        const heightVal = config.carousel_height || '520';
        const fitVal = config.carousel_object_fit || 'cover';

        if (this.carouselHeightInput) this.carouselHeightInput.value = heightVal;
        if (this.carouselFitInput) this.carouselFitInput.value = fitVal;

        document.documentElement.style.setProperty('--carousel-height', `${heightVal}px`);
        document.documentElement.style.setProperty('--carousel-fit', fitVal);

        const isSectionActive = isFieldActive(config.stats_section_active);
        if (this.statsScene) this.statsScene.style.display = isSectionActive ? '' : 'none';

        const isBgActive = isFieldActive(config.stats_bg_active);
        if (this.statsBg) {
            if (isBgActive) {
                this.statsBg.style.display = '';
                if (config.stats_bg_image) {
                    this.statsBg.style.backgroundImage = `url('${encodeURI(config.stats_bg_image)}')`;
                }
            } else {
                this.statsBg.style.display = 'none';
            }
        }

        const isTaglineActive = isFieldActive(config.stats_tagline_active);
        if (this.statsTagline) {
            this.statsTagline.style.display = isTaglineActive ? '' : 'none';
            if (config.stats_tagline) this.statsTagline.textContent = config.stats_tagline;
        }

        const isNumberActive = isFieldActive(config.stats_number_active);
        if (this.statsMainNumber) {
            this.statsMainNumber.style.display = isNumberActive ? '' : 'none';
            if (config.stats_number) this.statsMainNumber.textContent = config.stats_number;
        }

        const isHeadingActive = isFieldActive(config.stats_heading_active);
        if (this.statsHeading) {
            this.statsHeading.style.display = isHeadingActive ? '' : 'none';
            if (config.stats_heading) this.statsHeading.textContent = config.stats_heading;
        }

        const isDescActive = isFieldActive(config.stats_description_active);
        if (this.statsText) {
            this.statsText.style.display = isDescActive ? '' : 'none';
            if (config.stats_description) this.statsText.textContent = config.stats_description;
        }

        const isButtonActive = isFieldActive(config.stats_button_active);
        if (this.btnViewLocations) {
            this.btnViewLocations.style.display = isButtonActive ? '' : 'none';
            if (config.stats_button_text) this.btnViewLocations.textContent = config.stats_button_text;
        }

        if (this.statsSectionActiveInput) this.statsSectionActiveInput.checked = isSectionActive;
        if (this.statsBgActiveInput) this.statsBgActiveInput.checked = isBgActive;
        if (this.statsBgImageInput) this.statsBgImageInput.value = config.stats_bg_image || 'assets/images/tienda-nuala.jpg';
        if (this.statsBgPreview) this.statsBgPreview.src = config.stats_bg_image || 'assets/images/tienda-nuala.jpg';

        if (this.statsTaglineActiveInput) this.statsTaglineActiveInput.checked = isTaglineActive;
        if (this.statsTaglineInput) this.statsTaglineInput.value = config.stats_tagline || 'Cerca de ti';

        if (this.statsNumberActiveInput) this.statsNumberActiveInput.checked = isNumberActive;
        if (this.statsNumberInput) this.statsNumberInput.value = config.stats_number || '+30';

        if (this.statsHeadingActiveInput) this.statsHeadingActiveInput.checked = isHeadingActive;
        if (this.statsHeadingInput) this.statsHeadingInput.value = config.stats_heading || 'Tiendas en todo el país';

        if (this.statsDescriptionActiveInput) this.statsDescriptionActiveInput.checked = isDescActive;
        if (this.statsTextInput) this.statsTextInput.value = config.stats_description || '';

        if (this.statsButtonActiveInput) this.statsButtonActiveInput.checked = isButtonActive;
        if (this.statsButtonInput) this.statsButtonInput.value = config.stats_button_text || 'Explorar Tiendas';
    }

    renderHeroConfig(config) {
        this.renderGeneralConfig(config);
    }

    /**
     * Renderiza las prendas en el carrusel principal especificando siempre Docena o Unidad.
     */
    renderProducts(products) {
        if (!this.productsWrapper) return;
        this.productsWrapper.innerHTML = '';

        if (!Array.isArray(products) || products.length === 0) {
            this.productsWrapper.innerHTML = `
                <div class="carousel-slide empty-state-box">
                    <div class="empty-state-content">
                        <i class="fa-regular fa-image empty-state-icon"></i>
                        No hay prendas disponibles en esta categoría.
                        <p>Selecciona otra colección o gestiona las prendas desde el panel.</p>
                    </div>
                </div>
            `;
            this.productsCarousel.setupIndicators();
            return;
        }

        products.forEach(product => {
            const slide = document.createElement('div');
            slide.className = 'carousel-slide';
            const imgPath = escapeHtml(product.image || 'assets/images/lenceria-femenina.webp');
            const unitLabel = escapeHtml(product.unitType || 'Docena');

            slide.innerHTML = `
                <img src="${imgPath}" alt="${escapeHtml(product.name)}" loading="eager" onerror="this.onerror=null; this.src='assets/images/lenceria-femenina.webp';">
                <div class="carousel-info">
                    <div class="carousel-info-text">
                        <h3>${escapeHtml(product.name)}</h3>
                        <p>${escapeHtml(product.category)}</p>
                    </div>
                    <div class="carousel-price-group">
                        <div class="carousel-price">${escapeHtml(product.price)}</div>
                        <span class="carousel-unit-badge">Por ${unitLabel}</span>
                    </div>
                </div>
            `;
            this.productsWrapper.appendChild(slide);
        });

        this.productsCarousel.setupIndicators();
    }

    /**
     * Renderiza las tiendas físicas con jerarquía visual limpia (WhatsApp + Google Maps + IG + TikTok + Cashea + Mayor/Detal).
     */
    renderStores(stores, totalActiveStores = 0) {
        if (!this.storesWrapper) return;
        this.storesWrapper.innerHTML = '';

        const shownCount = Array.isArray(stores) ? stores.length : 0;
        if (this.storesResultsCounter) {
            this.storesResultsCounter.textContent = totalActiveStores > 0
                ? `Mostrando ${shownCount} de ${totalActiveStores} boutiques a nivel nacional`
                : `${shownCount} boutiques encontradas`;
        }

        if (shownCount === 0) {
            this.storesWrapper.innerHTML = `
                <div class="empty-state-box stores-empty-card">
                    <div class="empty-state-content">
                        <i class="fa-solid fa-store-slash empty-state-icon"></i>
                        No encontramos boutiques con ese criterio.
                        <p>Prueba limpiando la búsqueda o seleccionando otro estado.</p>
                    </div>
                </div>
            `;
            this.storesCarousel.setupIndicators();
            return;
        }

        stores.forEach((store, idx) => {
            const card = document.createElement('div');
            card.className = 'store-card';
            card.style.animationDelay = `${Math.min(idx, 6) * 0.06}s`;

            const storeImgPath = escapeHtml(store.image || 'assets/images/tienda-nuala.webp');
            const whatsappUrl = store.whatsappActive === 1 ? buildWhatsappUrl(store.whatsapp, store.name) : '';
            const instagramUrl = store.instagramActive === 1 ? buildInstagramUrl(store.instagram) : '';
            const tiktokUrl = store.tiktokActive === 1 ? buildTiktokUrl(store.tiktok) : '';
            const mapsUrl = store.mapsActive === 1 ? buildSafeMapsUrl(store.mapsUrl) : '';

            const saleNorm = normalizeComparableText(store.saleType || 'Detal');
            let saleBadgeClass = 'badge-sale-detal';
            if (saleNorm === 'mayor') saleBadgeClass = 'badge-sale-mayor';
            else if (saleNorm === 'mayor y detal') saleBadgeClass = 'badge-sale-both';

            const casheaBadgeHtml = store.casheaActive === 1
                ? '<span class="store-pill-cashea" title="Aceptamos Cashea en esta sede"><i class="fa-solid fa-bolt"></i> Cashea</span>'
                : '';

            const primaryCtaHtml = whatsappUrl
                ? `
                    <a href="${escapeHtml(whatsappUrl)}" target="_blank" rel="noopener noreferrer"
                       class="btn-store-social btn-store-whatsapp track-store-link"
                       data-store-id="${store.id}" data-channel="whatsapp"
                       title="Escribir al WhatsApp de ${escapeHtml(store.name)}">
                        <i class="fa-brands fa-whatsapp"></i>
                        <span>WhatsApp Tienda</span>
                    </a>
                `
                : `
                    <div class="store-in-person-badge" title="Atención personalizada directamente en nuestra sede">
                        <i class="fa-solid fa-store"></i>
                        <span>Atención exclusiva en tienda</span>
                    </div>
                `;

            let secondaryLinksHtml = '';
            if (mapsUrl) {
                secondaryLinksHtml += `
                    <a href="${escapeHtml(mapsUrl)}" target="_blank" rel="noopener noreferrer"
                       class="btn-store-quick btn-store-maps track-store-link"
                       data-store-id="${store.id}" data-channel="maps"
                       title="Cómo llegar en Google Maps">
                        <i class="fa-solid fa-location-dot"></i>
                        <span>Cómo llegar</span>
                    </a>
                `;
            }
            if (instagramUrl) {
                secondaryLinksHtml += `
                    <a href="${escapeHtml(instagramUrl)}" target="_blank" rel="noopener noreferrer"
                       class="btn-store-quick btn-store-ig-pill track-store-link"
                       data-store-id="${store.id}" data-channel="instagram"
                       title="Instagram: ${escapeHtml(store.instagram)}">
                        <i class="fa-brands fa-instagram"></i>
                    </a>
                `;
            }
            if (tiktokUrl) {
                secondaryLinksHtml += `
                    <a href="${escapeHtml(tiktokUrl)}" target="_blank" rel="noopener noreferrer"
                       class="btn-store-quick btn-store-tk-pill track-store-link"
                       data-store-id="${store.id}" data-channel="tiktok"
                       title="TikTok: ${escapeHtml(store.tiktok)}">
                        <i class="fa-brands fa-tiktok"></i>
                    </a>
                `;
            }

            card.innerHTML = `
                <div class="store-image">
                    <img src="${storeImgPath}" alt="${escapeHtml(store.name)}" loading="lazy" onerror="this.onerror=null; this.src='assets/images/tienda-nuala.webp';">
                    <span class="store-badge">${escapeHtml(store.city)}</span>
                    <div class="store-top-right-badges">
                        <span class="store-sale-badge ${saleBadgeClass}">${escapeHtml(store.saleType || 'Detal')}</span>
                        ${casheaBadgeHtml}
                    </div>
                </div>
                <div class="store-info">
                    <div>
                        <span class="store-state-label">${escapeHtml(store.state)}</span>
                        <h3 class="store-name">${escapeHtml(store.name)}</h3>
                        <p class="store-address">${escapeHtml(store.address)}</p>
                    </div>
                    <div class="store-bottom-section">
                        <div class="store-contact">
                            <span><i class="fa-regular fa-clock"></i> ${escapeHtml(store.schedule)}</span>
                        </div>
                        <div class="store-social-actions">
                            ${primaryCtaHtml}
                            ${secondaryLinksHtml ? `<div class="store-quick-links-row">${secondaryLinksHtml}</div>` : ''}
                        </div>
                    </div>
                </div>
            `;
            this.storesWrapper.appendChild(card);
        });

        this.storesCarousel.setupIndicators();
    }

    /**
     * Renderiza los chips de Estados comparando en minúsculas normalizadas.
     */
    renderFilterBar(states, activeState) {
        if (!this.locationsFilterBar) return;
        this.locationsFilterBar.innerHTML = '';

        const activeNormalized = normalizeComparableText(activeState || 'todas');
        const allFilters = ['Todas', ...(Array.isArray(states) ? states : [])];

        allFilters.forEach((filterItem) => {
            const btn = document.createElement('button');
            const isFilterActive = activeNormalized === normalizeComparableText(filterItem);
            btn.type = 'button';
            btn.className = `filter-btn ${isFilterActive ? 'active' : ''}`;
            btn.setAttribute('data-state', filterItem);
            btn.textContent = filterItem;
            this.locationsFilterBar.appendChild(btn);
        });
    }

    /**
     * Renderiza la lista de tiendas en el panel administrativo incluyendo estado, canales y métricas de clics.
     */
    renderAdminStoresList(stores) {
        if (!this.adminStoresList) return;
        this.adminStoresList.innerHTML = '';

        const countBadge = document.getElementById('admin-stores-count-badge');
        if (countBadge) {
            countBadge.textContent = `${Array.isArray(stores) ? stores.length : 0}`;
        }

        if (!Array.isArray(stores) || stores.length === 0) {
            this.adminStoresList.innerHTML = '<p class="admin-empty-msg">No se encontraron tiendas con ese criterio.</p>';
            return;
        }

        stores.forEach(store => {
            const row = document.createElement('div');
            const isPublished = store.storeActive === 1;
            row.className = `admin-item-row ${isPublished ? '' : 'admin-item-paused'}`;
            const thumbImg = escapeHtml(store.image || 'assets/images/tienda-nuala.webp');

            let tagsHtml = '';
            tagsHtml += `<span class="admin-social-tag ${isPublished ? 'tag-status-on' : 'tag-disabled'}">${isPublished ? 'Publicada' : 'Oculta'}</span>`;
            tagsHtml += `<span class="admin-social-tag tag-sale">${escapeHtml(store.saleType)}</span>`;

            if (store.casheaActive === 1) {
                tagsHtml += `<span class="admin-social-tag tag-cashea"><i class="fa-solid fa-bolt"></i> Cashea</span>`;
            }
            if (store.whatsapp) {
                const cls = store.whatsappActive === 1 ? 'tag-wa' : 'tag-disabled';
                tagsHtml += `<span class="admin-social-tag ${cls}"><i class="fa-brands fa-whatsapp"></i> ${escapeHtml(store.whatsapp)}</span>`;
            }
            if (store.instagram) {
                const cls = store.instagramActive === 1 ? 'tag-ig' : 'tag-disabled';
                tagsHtml += `<span class="admin-social-tag ${cls}"><i class="fa-brands fa-instagram"></i> ${escapeHtml(store.instagram)}</span>`;
            }
            if (store.tiktok) {
                const cls = store.tiktokActive === 1 ? 'tag-tk' : 'tag-disabled';
                tagsHtml += `<span class="admin-social-tag ${cls}"><i class="fa-brands fa-tiktok"></i> ${escapeHtml(store.tiktok)}</span>`;
            }
            if (store.mapsUrl) {
                const cls = store.mapsActive === 1 ? 'tag-maps' : 'tag-disabled';
                tagsHtml += `<span class="admin-social-tag ${cls}"><i class="fa-solid fa-location-dot"></i> Maps</span>`;
            }

            const totalClicks = (store.clicksWhatsapp || 0) + (store.clicksMaps || 0) + (store.clicksInstagram || 0) + (store.clicksTiktok || 0);
            const metricsHtml = totalClicks > 0
                ? `<p class="admin-item-metrics"><i class="fa-solid fa-chart-simple"></i> Clics web: <strong>${totalClicks}</strong> (WA: ${store.clicksWhatsapp} · Maps: ${store.clicksMaps} · IG: ${store.clicksInstagram} · TK: ${store.clicksTiktok})</p>`
                : '';

            row.innerHTML = `
                <div class="admin-item-thumb">
                    <img src="${thumbImg}" alt="${escapeHtml(store.name)}" onerror="this.onerror=null; this.src='assets/images/tienda-nuala.webp';">
                </div>
                <div class="admin-item-details">
                    <h4>${escapeHtml(store.name)}</h4>
                    <p class="admin-item-sub">${escapeHtml(store.city)} (${escapeHtml(store.state)})${store.whatsapp ? '' : ' · Sin WhatsApp en tienda'}</p>
                    <p class="admin-item-addr"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(store.address)}</p>
                    <div class="admin-social-tags-container">${tagsHtml}</div>
                    ${metricsHtml}
                </div>
                <div class="admin-item-actions">
                    <button type="button" class="admin-action-btn btn-toggle-store" data-id="${store.id}" data-active="${isPublished ? 1 : 0}" title="${isPublished ? 'Pausar / Ocultar tienda' : 'Publicar tienda'}">
                        <i class="fa-solid ${isPublished ? 'fa-eye' : 'fa-eye-slash'}"></i>
                    </button>
                    <button type="button" class="admin-action-btn btn-edit-store" data-id="${store.id}" title="Editar tienda y canales">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button type="button" class="admin-action-btn btn-delete-store danger" data-id="${store.id}" title="Eliminar tienda">
                        <i class="fa-regular fa-trash-can"></i>
                    </button>
                </div>
            `;
            this.adminStoresList.appendChild(row);
        });
    }

    /**
     * Renderiza la lista de productos en el panel administrativo especificando siempre Docena o Unidad.
     */
    renderAdminProductsList(products) {
        if (!this.adminProductsList) return;
        this.adminProductsList.innerHTML = '';

        if (!Array.isArray(products) || products.length === 0) {
            this.adminProductsList.innerHTML = '<p class="admin-empty-msg">No hay prendas. Añade una usando el formulario.</p>';
            return;
        }

        products.forEach(product => {
            const row = document.createElement('div');
            row.className = 'admin-item-row';
            const thumbImg = escapeHtml(product.image || 'assets/images/lenceria-femenina.webp');
            const unitLabel = escapeHtml(product.unitType || 'Docena');

            row.innerHTML = `
                <div class="admin-item-thumb">
                    <img src="${thumbImg}" alt="${escapeHtml(product.name)}" onerror="this.onerror=null; this.src='assets/images/lenceria-femenina.webp';">
                </div>
                <div class="admin-item-details">
                    <h4>${escapeHtml(product.name)}</h4>
                    <p class="admin-item-sub">${escapeHtml(product.category)} · <strong class="admin-price-highlight">${escapeHtml(product.price)}</strong> <span class="admin-social-tag tag-sale">Por ${unitLabel}</span></p>
                    <p class="admin-item-desc">${escapeHtml(product.description || '')}</p>
                </div>
                <div class="admin-item-actions">
                    <button type="button" class="admin-action-btn btn-edit-product" data-id="${product.id}" title="Editar prenda e imagen">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button type="button" class="admin-action-btn btn-delete-product danger" data-id="${product.id}" title="Eliminar prenda">
                        <i class="fa-regular fa-trash-can"></i>
                    </button>
                </div>
            `;
            this.adminProductsList.appendChild(row);
        });
    }

    /**
     * Renderiza la bitácora de auditoría del sistema en la pestaña Seguridad / Auditoría.
     */
    renderAuditLogs(auditLogs) {
        if (!this.adminAuditList) return;
        this.adminAuditList.innerHTML = '';

        if (!Array.isArray(auditLogs) || auditLogs.length === 0) {
            this.adminAuditList.innerHTML = '<p class="admin-empty-msg">Aún no hay eventos registrados en auditoría.</p>';
            return;
        }

        auditLogs.forEach(log => {
            const item = document.createElement('div');
            item.className = 'admin-audit-row';
            const isSuccess = normalizeComparableText(log.estatus) === 'exitoso';
            const badgeClass = isSuccess ? 'tag-status-on' : 'tag-audit-denied';

            item.innerHTML = `
                <div class="audit-row-top">
                    <span class="admin-social-tag ${badgeClass}">${escapeHtml(log.estatus)}</span>
                    <strong>${escapeHtml(log.accion)}</strong>
                    <span class="audit-module-label">[${escapeHtml(log.modulo)}${log.entidad_id ? ' #' + escapeHtml(log.entidad_id) : ''}]</span>
                    <span class="audit-date-label">${escapeHtml(log.created_at)}</span>
                </div>
            `;
            this.adminAuditList.appendChild(item);
        });
    }

    // --- Control del Modal de Recorte Interactivo (Cropper.js) ---

    openCropModal(imageDataUrl, onCropConfirmed) {
        if (!this.cropImageModal || !this.cropperTargetImage) return;

        this.destroyCropper();
        this.cropImageModal.classList.add('open');
        document.body.style.overflow = 'hidden';

        const startCropper = () => {
            this.destroyCropper();
            /* global Cropper */
            if (typeof Cropper !== 'undefined') {
                try {
                    this.cropperInstance = new Cropper(this.cropperTargetImage, {
                        aspectRatio: 1,
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
                this.showToast('Herramienta de recorte no disponible.', 'error');
            }
        };

        this.cropperTargetImage.onload = () => {
            setTimeout(startCropper, 60);
        };
        this.cropperTargetImage.src = imageDataUrl;

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
        const unitSelect = document.getElementById('edit-product-unit');
        if (unitSelect) unitSelect.value = product.unitType || 'Docena';
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
        document.getElementById('edit-store-whatsapp').value = store.whatsapp || '';
        document.getElementById('edit-store-instagram').value = store.instagram || '';

        const tkInput = document.getElementById('edit-store-tiktok');
        if (tkInput) tkInput.value = store.tiktok || '';

        const mapsInput = document.getElementById('edit-store-maps-url');
        if (mapsInput) mapsInput.value = store.mapsUrl || '';

        const saleSelect = document.getElementById('edit-store-sale-type');
        if (saleSelect) saleSelect.value = store.saleType || 'Detal';

        const casheaCheck = document.getElementById('edit-store-cashea-active');
        if (casheaCheck) casheaCheck.checked = store.casheaActive === 1;

        const storeActiveCheck = document.getElementById('edit-store-active');
        if (storeActiveCheck) storeActiveCheck.checked = store.storeActive === 1;

        const waActiveCheck = document.getElementById('edit-store-whatsapp-active');
        if (waActiveCheck) waActiveCheck.checked = store.whatsappActive === 1;

        const igActiveCheck = document.getElementById('edit-store-instagram-active');
        if (igActiveCheck) igActiveCheck.checked = store.instagramActive === 1;

        const tkActiveCheck = document.getElementById('edit-store-tiktok-active');
        if (tkActiveCheck) tkActiveCheck.checked = store.tiktokActive === 1;

        const mapsActiveCheck = document.getElementById('edit-store-maps-active');
        if (mapsActiveCheck) mapsActiveCheck.checked = store.mapsActive === 1;

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
        const iconElem = document.createElement('i');
        iconElem.className = `fa-solid ${iconClass}`;
        const spanElem = document.createElement('span');
        spanElem.textContent = message;

        toast.appendChild(iconElem);
        toast.appendChild(spanElem);

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
        if (!this.header) return;
        if (isScrolled) {
            this.header.classList.add('scrolled');
        } else {
            this.header.classList.remove('scrolled');
        }
    }

    updateActiveNavLink(sectionId) {
        const sectionIdNormalized = normalizeComparableText(sectionId);
        this.navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href && normalizeComparableText(href.replace(/^#/, '')) === sectionIdNormalized) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }
}
