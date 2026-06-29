import { demoProducts } from "./demo-products.js";
import { escapeHtml, formatPrice, initNavigation, initScrollAnimations, productCard } from "./ui.js";
import { getLanguage, initLanguage, t, translateCategory } from "./i18n.js";

const shopCategories = [
  { category: "All", page: "shop.html" },
  { category: "Regular Bouquets", page: "shop-regular-bouquets.html" },
  { category: "Hoa Cam Binh", page: "shop-hoa-cam-binh.html" },
  { category: "Seasonal Bouquets", page: "shop-seasonal-bouquets.html" },
  { category: "Company Ceremonial Bouquets", page: "shop-company-ceremonial.html" },
  { category: "Memorial Bouquets", page: "shop-memorial.html" },
];

const grid = document.querySelector("[data-products-grid]");
const status = document.querySelector("[data-products-status]");
const filters = document.querySelector("[data-category-filters]");
const page = document.body.dataset.page;
const pageCategory = document.body.dataset.shopCategory || "All";

let activeCategory = pageCategory;
let carouselFrame;
let suppressProductClick = false;

function localizedProduct(product) {
  return {
    name: getLanguage() === "en" && product.name_en ? product.name_en : product.name,
    description: getLanguage() === "en" && product.description_en ? product.description_en : product.description,
  };
}

function productsForCategory() {
  if (activeCategory === "All") return demoProducts;
  return demoProducts.filter((product) => product.category === activeCategory);
}

function productImages(product) {
  if (Array.isArray(product.images) && product.images.length) return product.images;
  return [product.image || product.image_url].filter(Boolean);
}

function categoryLabel(category) {
  return category === "All" ? t("catalog.all") : translateCategory(category);
}

function updateDocumentTitle() {
  if (page !== "shop") return;
  document.title = `${categoryLabel(pageCategory)} | Aurora`;
}

function renderFilters() {
  if (!filters || page !== "shop" || pageCategory !== "All") return;
  filters.innerHTML = `
    <label class="category-select__label" for="catalog-category">${escapeHtml(t("shop.chooseCategory"))}</label>
    <div class="category-select__wrap">
      <select class="category-select" id="catalog-category" data-category-select aria-label="${escapeHtml(t("shop.filter"))}">
        ${shopCategories.map(({ category }) => `
          <option value="${escapeHtml(category)}" ${category === activeCategory ? "selected" : ""}>
            ${escapeHtml(categoryLabel(category))}
          </option>`).join("")}
      </select>
    </div>`;
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
  initProductCardSwipes(grid);
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
  initProductCardSwipes(grid);
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
    if (event.target.closest("[data-product-image-next], .product-card__image-wrap")) return;
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
  const images = productImages(product);
  const image = images[0] || product.image;
  const modal = document.createElement("div");
  modal.className = "product-modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-label", name);
  modal.innerHTML = `
    <div class="product-modal__card">
      <button class="product-modal__close" type="button" data-modal-close aria-label="${escapeHtml(t("product.close"))}">&times;</button>
      <div class="product-modal__media" data-modal-image-swipe>
        <img src="${escapeHtml(image)}" alt="${escapeHtml(name)}" data-modal-image data-modal-image-index="0">
        ${images.length > 1 ? `
          <button class="product-card__image-next product-modal__image-next" type="button" data-modal-image-next aria-label="${escapeHtml(t("product.nextImage"))}">
            <span aria-hidden="true">&rsaquo;</span>
          </button>` : ""}
      </div>
      <div class="product-modal__content">
        <p class="eyebrow">${escapeHtml(category)}</p>
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
    if (event.key === "Escape") close();
  };

  const cycleModalImage = (direction = 1) => {
    const image = modal.querySelector("[data-modal-image]");
    if (!image || images.length < 2) return;
    const currentIndex = Number.parseInt(image.dataset.modalImageIndex || "0", 10);
    const nextIndex = (currentIndex + direction + images.length) % images.length;
    image.dataset.modalImageIndex = String(nextIndex);
    image.src = images[nextIndex];
  };

  const close = () => {
    modal.classList.remove("is-visible");
    document.body.classList.remove("modal-open");
    document.removeEventListener("keydown", onKeydown);
    window.setTimeout(() => modal.remove(), 180);
  };

  modal.addEventListener("click", (event) => {
    const nextButton = event.target.closest("[data-modal-image-next]");
    if (nextButton) {
      cycleModalImage();
      return;
    }
    if (event.target === modal || event.target.closest("[data-modal-close]")) close();
  });
  initImageSwipe(modal.querySelector("[data-modal-image-swipe]"), (direction) => cycleModalImage(direction));
  document.addEventListener("keydown", onKeydown);

  document.body.append(modal);
  document.body.classList.add("modal-open");
  requestAnimationFrame(() => modal.classList.add("is-visible"));
}

function openProductById(id) {
  if (suppressProductClick) return;
  const product = demoProducts.find((item) => item.id === id);
  if (product) openProductModal(product);
}

function cycleProductImage(card) {
  const product = demoProducts.find((item) => item.id === card?.dataset.productId);
  const image = card?.querySelector("[data-product-image]");
  if (!product || !image) return;

  const images = productImages(product);
  if (images.length < 2) return;

  const currentIndex = Number.parseInt(image.dataset.productImageIndex || "0", 10);
  const nextIndex = (currentIndex + 1) % images.length;
  image.dataset.productImageIndex = String(nextIndex);
  image.src = images[nextIndex];
}

function initImageSwipe(target, onSwipe) {
  if (!target) return;

  let pointerId;
  let startX = 0;
  let startY = 0;

  target.addEventListener("pointerdown", (event) => {
    if (event.target.closest("button, a")) return;
    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    target.setPointerCapture?.(pointerId);
  });

  target.addEventListener("pointerup", (event) => {
    if (event.pointerId !== pointerId) return;
    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;
    pointerId = undefined;
    target.releasePointerCapture?.(event.pointerId);

    if (Math.abs(deltaX) < 36 || Math.abs(deltaX) < Math.abs(deltaY) * 1.15) return;
    onSwipe(deltaX < 0 ? 1 : -1);
  });

  target.addEventListener("pointercancel", (event) => {
    if (event.pointerId !== pointerId) return;
    pointerId = undefined;
    target.releasePointerCapture?.(event.pointerId);
  });
}

function initProductCardSwipes(root) {
  root?.querySelectorAll("[data-product-id]").forEach((card) => {
    const target = card.querySelector(".product-card__image-wrap");
    initImageSwipe(target, (direction) => {
      const product = demoProducts.find((item) => item.id === card.dataset.productId);
      const image = card.querySelector("[data-product-image]");
      if (!product || !image) return;

      const images = productImages(product);
      if (images.length < 2) return;

      const currentIndex = Number.parseInt(image.dataset.productImageIndex || "0", 10);
      const nextIndex = (currentIndex + direction + images.length) % images.length;
      image.dataset.productImageIndex = String(nextIndex);
      image.src = images[nextIndex];
      suppressProductClick = true;
      window.setTimeout(() => { suppressProductClick = false; }, 120);
    });
  });
}

initLanguage();
initNavigation();
initScrollAnimations();
render();

filters?.addEventListener("change", (event) => {
  const select = event.target.closest("[data-category-select]");
  if (!select) return;
  activeCategory = select.value;
  renderShopGrid();
});

grid?.addEventListener("click", (event) => {
  const nextButton = event.target.closest("[data-product-image-next]");
  if (nextButton) {
    event.preventDefault();
    event.stopPropagation();
    cycleProductImage(nextButton.closest("[data-product-id]"));
    return;
  }

  const card = event.target.closest("[data-product-id]");
  if (!card) return;
  openProductById(card.dataset.productId);
});

document.addEventListener("aurora:languagechange", render);
