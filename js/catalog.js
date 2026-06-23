import { demoProducts } from "./demo-products.js";
import { escapeHtml, formatPrice, initNavigation, initScrollAnimations, productCard } from "./ui.js";
import { getLanguage, initLanguage, t, translateCategory } from "./i18n.js";

const grid = document.querySelector("[data-products-grid]");
const status = document.querySelector("[data-products-status]");
const filters = document.querySelector("[data-category-filters]");
const page = document.body.dataset.page;

let activeCategory = "All";
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

function renderFilters() {
  if (!filters || page !== "shop") return;
  const categories = ["All", ...new Set(demoProducts.map((product) => product.category))];
  filters.innerHTML = categories.map((category) => `
    <button class="filter-button ${category === activeCategory ? "is-active" : ""}" type="button" data-category="${escapeHtml(category)}">
      ${escapeHtml(category === "All" ? t("catalog.all") : translateCategory(category))}
    </button>`).join("");
}

function renderShopGrid() {
  if (!grid) return;
  if (status) status.hidden = true;
  grid.className = "product-grid product-grid--shop";
  grid.innerHTML = productsForCategory().map(productCard).join("");
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
  const modal = document.createElement("div");
  modal.className = "product-modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-label", name);
  modal.innerHTML = `
    <div class="product-modal__card">
      <button class="product-modal__close" type="button" data-modal-close aria-label="${escapeHtml(t("product.close"))}">&times;</button>
      <img src="${escapeHtml(product.image)}" alt="${escapeHtml(name)}">
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

  const close = () => {
    modal.classList.remove("is-visible");
    document.body.classList.remove("modal-open");
    document.removeEventListener("keydown", onKeydown);
    window.setTimeout(() => modal.remove(), 180);
  };

  modal.addEventListener("click", (event) => {
    if (event.target === modal || event.target.closest("[data-modal-close]")) close();
  });
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

initLanguage();
initNavigation();
initScrollAnimations();
render();

filters?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  activeCategory = button.dataset.category;
  render();
});

grid?.addEventListener("click", (event) => {
  const card = event.target.closest("[data-product-id]");
  if (!card) return;
  openProductById(card.dataset.productId);
});

document.addEventListener("aurora:languagechange", render);
