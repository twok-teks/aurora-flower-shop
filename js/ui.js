import { getLanguage, t, translateCategory, translateSubcategory } from "./i18n.js";

export const fallbackImage = `data:image/svg+xml,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450">
    <rect width="600" height="450" fill="#f3e9dc"/>
    <circle cx="300" cy="192" r="74" fill="#f7d6e0"/>
    <circle cx="255" cy="220" r="62" fill="#e6dff5"/>
    <circle cx="348" cy="226" r="65" fill="#f9dcc4"/>
    <path d="M300 245v115M300 290c-60-52-88-13-68 19 18 27 51 13 68-2M300 310c55-47 84-7 60 23-19 23-46 8-60-7" stroke="#829b82" stroke-width="12" fill="none" stroke-linecap="round"/>
  </svg>`)}`;

const revealSelector = [
  ".hero__content > *",
  ".intro",
  ".section-heading > *",
  ".product-card",
  ".story__inner",
  ".story__value",
  ".contact > .container > *",
  ".page-hero > *",
  ".catalog-toolbar",
  ".contact-hero__content > *",
  ".contact-directory__heading > *",
  ".contact-link",
  ".contact-social__heading > *",
].join(", ");

let scrollAnimationObserver;

export function formatPrice(value) {
  return new Intl.NumberFormat(getLanguage() === "vi" ? "vi-VN" : "en-US", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

export function escapeHtml(value = "") {
  const element = document.createElement("div");
  element.textContent = value;
  return element.innerHTML.replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

export function productCard(product) {
  const images = Array.isArray(product.images) && product.images.length
    ? product.images
    : [product.image || product.image_url || fallbackImage];
  const image = images[0] || fallbackImage;
  const name = getLanguage() === "en" && product.name_en ? product.name_en : product.name;
  const localizedDescription = getLanguage() === "en" && product.description_en ? product.description_en : product.description;
  const description = localizedDescription || t("product.fallback");
  const category = translateCategory(product.category);
  const collection = product.subcategory ? translateSubcategory(product.subcategory) : category;
  const detailsLabel = `${t("product.details")}: ${name}`;
  return `
    <article class="product-card" data-product-id="${escapeHtml(product.id)}">
      <button class="product-card__details" type="button" data-product-open aria-label="${escapeHtml(detailsLabel)}">
        <div class="product-card__image-wrap">
          <img class="product-card__image" src="${escapeHtml(image)}" alt="${escapeHtml(name)}" loading="lazy" data-product-image data-product-image-index="0" onerror="this.onerror=null;this.src='${escapeHtml(fallbackImage)}'">
          ${product.featured ? `<span class="badge badge--featured">${t("product.featured")}</span>` : ""}
          ${product.in_stock === false ? `<span class="badge badge--sold">${t("product.sold")}</span>` : ""}
        </div>
        <div class="product-card__body">
          <div class="product-card__meta">
            <span>${escapeHtml(collection)}</span>
            <strong>${formatPrice(product.price)}</strong>
          </div>
          <h3>${escapeHtml(name)}</h3>
          <p>${escapeHtml(description)}</p>
          <span class="stock ${product.in_stock === false ? "stock--out" : "stock--in"}">
            ${product.in_stock === false ? t("product.unavailable") : t("product.available")}
          </span>
        </div>
      </button>
    </article>`;
}

export function showMessage(element, message, type = "info") {
  if (!element) return;
  element.textContent = message;
  element.className = `notice notice--${type}`;
  element.hidden = false;
}

export function hideMessage(element) {
  if (element) element.hidden = true;
}

export function initScrollAnimations(root = document) {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reducedMotion || !("IntersectionObserver" in window)) return;

  if (!scrollAnimationObserver) {
    scrollAnimationObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        scrollAnimationObserver.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.16 });
  }

  root.querySelectorAll(revealSelector).forEach((element, index) => {
    if (element.classList.contains("reveal-on-scroll")) return;
    element.classList.add("reveal-on-scroll");
    element.style.setProperty("--reveal-delay", `${Math.min(index % 6, 5) * 70}ms`);
    scrollAnimationObserver.observe(element);
  });
}

export function initNavigation() {
  const button = document.querySelector("[data-menu-button]");
  const nav = document.querySelector("[data-nav]");
  const header = document.querySelector(".site-header");
  const dropdowns = [...document.querySelectorAll("[data-nav-dropdown]")];

  const closeDropdowns = (except) => {
    dropdowns.forEach((dropdown) => {
      if (dropdown === except) return;
      dropdown.classList.remove("is-open");
      dropdown.querySelector("[data-nav-dropdown-button]")?.setAttribute("aria-expanded", "false");
    });
  };

  if (header) {
    let lastScrollY = window.scrollY;
    let ticking = false;

    const updateHeader = () => {
      const currentScrollY = Math.max(window.scrollY, 0);
      const menuOpen = button?.getAttribute("aria-expanded") === "true";

      header.classList.toggle("is-scrolled", currentScrollY > 10);

      if (currentScrollY <= 80 || menuOpen) {
        header.classList.remove("is-hidden");
      } else if (currentScrollY > lastScrollY + 6) {
        header.classList.add("is-hidden");
      } else if (currentScrollY < lastScrollY - 6) {
        header.classList.remove("is-hidden");
      }

      lastScrollY = currentScrollY;
      ticking = false;
    };

    window.addEventListener("scroll", () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(updateHeader);
    }, { passive: true });

    updateHeader();
  }

  if (!button || !nav) return;
  dropdowns.forEach((dropdown) => {
    const dropdownButton = dropdown.querySelector("[data-nav-dropdown-button]");
    dropdownButton?.addEventListener("click", (event) => {
      event.stopPropagation();
      const open = dropdown.classList.contains("is-open");
      closeDropdowns(dropdown);
      dropdown.classList.toggle("is-open", !open);
      dropdownButton.setAttribute("aria-expanded", String(!open));
      header?.classList.remove("is-hidden");
    });
  });

  button.addEventListener("click", () => {
    const open = button.getAttribute("aria-expanded") === "true";
    button.setAttribute("aria-expanded", String(!open));
    nav.classList.toggle("is-open", !open);
    if (open) closeDropdowns();
    header?.classList.remove("is-hidden");
  });
  nav.addEventListener("click", (event) => {
    if (!event.target.closest("a")) return;
    button.setAttribute("aria-expanded", "false");
    nav.classList.remove("is-open");
    closeDropdowns();
  });
  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-nav-dropdown]")) return;
    closeDropdowns();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    closeDropdowns();
  });
}
