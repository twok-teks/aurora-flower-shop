import { demoProducts } from "./demo-products.js";
import { escapeHtml, fallbackImage, formatPrice, initNavigation, initScrollAnimations, productCard } from "./ui.js";
import { getLanguage, initLanguage, t, translateCategory, translateSubcategory } from "./i18n.js";

const shopCategories = [
  { category: "All", page: "shop.html" },
  { category: "Regular Bouquets", page: "shop-regular-bouquets.html" },
  { category: "Hoa Cam Binh", page: "shop-hoa-cam-binh.html" },
  { category: "Seasonal Bouquets", page: "shop-seasonal-bouquets.html" },
  { category: "Company Ceremonial Bouquets", page: "shop-company-ceremonial.html" },
  { category: "Memorial Bouquets", page: "shop-memorial.html" },
];

const shopSubcategories = {
  "Regular Bouquets": ["Bo Hong Do", "Bo Hong Phan", "Bo Hoa Mix"],
};

const grid = document.querySelector("[data-products-grid]");
const status = document.querySelector("[data-products-status]");
const filters = document.querySelector("[data-category-filters]");
const page = document.body.dataset.page;
const pageCategory = document.body.dataset.shopCategory || "All";

let activeCategory = pageCategory;
let activeSubcategory = "All";
let carouselFrame;
let suppressProductClick = false;

function localizedProduct(product) {
  return {
    name: getLanguage() === "en" && product.name_en ? product.name_en : product.name,
    description: getLanguage() === "en" && product.description_en ? product.description_en : product.description,
  };
}

function productsForCategory() {
  const categoryProducts = activeCategory === "All"
    ? demoProducts
    : demoProducts.filter((product) => product.category === activeCategory);
  if (activeSubcategory === "All") return categoryProducts;
  return categoryProducts.filter((product) => product.subcategory === activeSubcategory);
}

function productImages(product) {
  if (Array.isArray(product.images) && product.images.length) return product.images;
  return [product.image || product.image_url].filter(Boolean);
}

function categoryLabel(category) {
  return category === "All" ? t("catalog.all") : translateCategory(category);
}

function subcategoryLabel(subcategory) {
  return subcategory === "All" ? t("catalog.all") : translateSubcategory(subcategory);
}

function updateDocumentTitle() {
  if (page !== "shop") return;
  document.title = `${categoryLabel(pageCategory)} | Aurora`;
}

function renderFilters() {
  if (!filters || page !== "shop") return;
  const subcategories = shopSubcategories[activeCategory] || [];
  const subcategoryValue = subcategories.includes(activeSubcategory) ? activeSubcategory : "All";
  if (activeSubcategory !== subcategoryValue) activeSubcategory = subcategoryValue;
  filters.innerHTML = `
    ${pageCategory === "All" ? `
      <label class="category-select__label" for="catalog-category">${escapeHtml(t("shop.chooseCategory"))}</label>
      <div class="category-select__wrap">
        <select class="category-select" id="catalog-category" data-category-select aria-label="${escapeHtml(t("shop.filter"))}">
          ${shopCategories.map(({ category }) => `
            <option value="${escapeHtml(category)}" ${category === activeCategory ? "selected" : ""}>
              ${escapeHtml(categoryLabel(category))}
            </option>`).join("")}
        </select>
      </div>` : ""}
    ${subcategories.length ? `
      <label class="category-select__label" for="catalog-subcategory">${escapeHtml(t("shop.filter"))}</label>
      <div class="category-select__wrap">
        <select class="category-select" id="catalog-subcategory" data-subcategory-select aria-label="${escapeHtml(t("shop.filter"))}">
          ${["All", ...subcategories].map((subcategory) => `
            <option value="${escapeHtml(subcategory)}" ${subcategory === activeSubcategory ? "selected" : ""}>
              ${escapeHtml(subcategoryLabel(subcategory))}
            </option>`).join("")}
        </select>
      </div>` : ""}`;
}

function renderShopGrid() {
  if (!grid) return;
  const products = productsForCategory();
  if (status) {
    status.hidden = products.length > 0;
    if (!products.length) status.textContent = t("catalog.empty");
  }
  grid.className = "product-grid product-grid--shop";
  grid.innerHTML = products.map(productCard).join("");
  initScrollAnimations(grid);
}

function renderCarousel() {
  if (!grid) return;
  if (status) status.hidden = true;
  const cards = [...demoProducts, ...demoProducts].map(productCard).join("");
  grid.className = "flower-carousel";
  grid.innerHTML = `
    <div class="flower-carousel__viewport" data-carousel>
      <div class="flower-carousel__track" data-carousel-track>
        ${cards}
      </div>
    </div>`;
  initCarousel();
}

function render() {
  if (page === "home") renderCarousel();
  else {
    renderFilters();
    renderShopGrid();
    updateDocumentTitle();
  }
}

function initCarousel() {
  const carousel = document.querySelector("[data-carousel]");
  const track = document.querySelector("[data-carousel-track]");
  if (!carousel || !track) return;

  if (carouselFrame) cancelAnimationFrame(carouselFrame);

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let offset = 0;
  let lastTime = performance.now();
  let paused = reducedMotion;
  let dragging = false;
  let startX = 0;
  let startOffset = 0;
  let moved = 0;
  let pressedProductId = "";

  const normalize = () => {
    const loopWidth = track.scrollWidth / 2;
    if (!loopWidth) return;
    while (offset <= -loopWidth) offset += loopWidth;
    while (offset > 0) offset -= loopWidth;
  };

  const paint = () => {
    normalize();
    track.style.transform = `translate3d(${offset}px, 0, 0)`;
  };

  const tick = (time) => {
    const delta = time - lastTime;
    lastTime = time;
    if (!paused && !dragging) {
      offset -= delta * 0.035;
      paint();
    }
    carouselFrame = requestAnimationFrame(tick);
  };

  carousel.addEventListener("mouseenter", () => { paused = true; });
  carousel.addEventListener("mouseleave", () => { paused = reducedMotion; });
  carousel.addEventListener("pointerdown", (event) => {
    if (event.target.closest(".product-card__image-wrap")) return;
    dragging = true;
    paused = true;
    moved = 0;
    suppressProductClick = false;
    pressedProductId = event.target.closest("[data-product-id]")?.dataset.productId || "";
    startX = event.clientX;
    startOffset = offset;
    carousel.classList.add("is-dragging");
    carousel.setPointerCapture(event.pointerId);
  });
  carousel.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    const delta = event.clientX - startX;
    moved = Math.max(moved, Math.abs(delta));
    if (moved > 8) suppressProductClick = true;
    offset = startOffset + delta;
    paint();
  });
  carousel.addEventListener("pointerup", (event) => {
    if (!dragging) return;
    dragging = false;
    paused = reducedMotion;
    carousel.classList.remove("is-dragging");
    carousel.releasePointerCapture(event.pointerId);
    if (pressedProductId && moved <= 8) {
      openProductById(pressedProductId);
      suppressProductClick = true;
    }
    pressedProductId = "";
    window.setTimeout(() => { suppressProductClick = false; }, 80);
  });
  carousel.addEventListener("pointercancel", () => {
    dragging = false;
    paused = reducedMotion;
    carousel.classList.remove("is-dragging");
    pressedProductId = "";
    window.setTimeout(() => { suppressProductClick = false; }, 80);
  });

  paint();
  carouselFrame = requestAnimationFrame(tick);
}

function openProductModal(product) {
  const { name, description } = localizedProduct(product);
  const category = translateCategory(product.category);
  const collection = product.subcategory ? translateSubcategory(product.subcategory) : category;
  const image = productImages(product)[0] || fallbackImage;
  const modal = document.createElement("div");
  modal.className = "product-modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-label", name);
  modal.innerHTML = `
    <div class="product-modal__card">
      <button class="product-modal__close" type="button" data-modal-close aria-label="${escapeHtml(t("product.close"))}">&times;</button>
      <button class="product-modal__media" type="button" data-full-image-open aria-label="${escapeHtml(t("product.viewImage"))}">
        <img src="${escapeHtml(image)}" alt="${escapeHtml(name)}" data-modal-image onerror="this.onerror=null;this.src='${escapeHtml(fallbackImage)}'">
      </button>
      <div class="product-modal__content">
        <p class="eyebrow">${escapeHtml(collection)}</p>
        <h2>${escapeHtml(name)}</h2>
        <strong>${formatPrice(product.price)}</strong>
        <p>${escapeHtml(description)}</p>
        <div class="product-modal__actions">
          <a class="button button--primary button--nowrap" href="contact.html">${escapeHtml(t("product.contact"))}</a>
          <a class="button button--outline button--nowrap" href="shop.html">${escapeHtml(t("product.more"))}</a>
        </div>
      </div>
    </div>`;

  const onKeydown = (event) => {
    if (document.querySelector("[data-full-image-viewer]")) return;
    if (event.key === "Escape") close();
  };

  const close = () => {
    modal.classList.remove("is-visible");
    document.body.classList.remove("modal-open");
    document.removeEventListener("keydown", onKeydown);
    window.setTimeout(() => modal.remove(), 180);
  };

  modal.addEventListener("click", (event) => {
    if (event.target.closest("[data-full-image-open]")) {
      openFullImage(image, name);
      return;
    }
    if (event.target === modal || event.target.closest("[data-modal-close]")) close();
  });
  document.addEventListener("keydown", onKeydown);

  document.body.append(modal);
  document.body.classList.add("modal-open");
  requestAnimationFrame(() => modal.classList.add("is-visible"));
}

function openFullImage(image, name) {
  const viewer = document.createElement("div");
  viewer.className = "product-image-viewer";
  viewer.dataset.fullImageViewer = "";
  viewer.setAttribute("role", "dialog");
  viewer.setAttribute("aria-modal", "true");
  viewer.setAttribute("aria-label", t("product.viewImage"));
  viewer.innerHTML = `
    <button class="product-image-viewer__close" type="button" data-full-image-close aria-label="${escapeHtml(t("product.closeImage"))}">&times;</button>
    <img src="${escapeHtml(image)}" alt="${escapeHtml(name)}" onerror="this.onerror=null;this.src='${escapeHtml(fallbackImage)}'">`;

  const close = () => {
    viewer.classList.remove("is-visible");
    document.removeEventListener("keydown", onKeydown);
    window.setTimeout(() => viewer.remove(), 160);
  };

  const onKeydown = (event) => {
    if (event.key === "Escape") close();
  };

  viewer.addEventListener("click", (event) => {
    if (event.target === viewer || event.target.closest("[data-full-image-close]")) close();
  });

  document.addEventListener("keydown", onKeydown);
  document.body.append(viewer);
  requestAnimationFrame(() => viewer.classList.add("is-visible"));
}

function openProductById(id) {
  if (suppressProductClick) return;
  const product = demoProducts.find((item) => item.id === id);
  if (product) openProductModal(product);
}

initLanguage();
initNavigation();
initScrollAnimations();
render();

filters?.addEventListener("change", (event) => {
  const categorySelect = event.target.closest("[data-category-select]");
  const subcategorySelect = event.target.closest("[data-subcategory-select]");
  if (!categorySelect && !subcategorySelect) return;
  if (categorySelect) {
    activeCategory = categorySelect.value;
    activeSubcategory = "All";
  }
  if (subcategorySelect) activeSubcategory = subcategorySelect.value;
  renderFilters();
  renderShopGrid();
});

grid?.addEventListener("click", (event) => {
  const card = event.target.closest("[data-product-id]");
  if (!card) return;
  openProductById(card.dataset.productId);
});

document.addEventListener("aurora:languagechange", render);
