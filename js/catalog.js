import { isConfigured, supabase } from "./supabase-client.js";
import { escapeHtml, initNavigation, initScrollAnimations, productCard, showMessage } from "./ui.js";
import { initLanguage, t, translateCategory } from "./i18n.js";

const grid = document.querySelector("[data-products-grid]");
const status = document.querySelector("[data-products-status]");
const filters = document.querySelector("[data-category-filters]");
const featuredOnly = document.body.dataset.page === "home";
let products = [];
let activeCategory = "All";

function render(category = "All") {
  if (!grid) return;
  const visible = category === "All" ? products : products.filter((item) => item.category === category);
  grid.innerHTML = visible.map(productCard).join("");
  initScrollAnimations(grid);
  if (!visible.length) showMessage(status, t("catalog.empty"), "info");
  else status.hidden = true;
}

function renderFilters() {
  if (!filters) return;
  const categories = ["All", ...new Set(products.map((item) => item.category))];
  filters.innerHTML = categories.map((category, index) => `
    <button class="filter-button ${category === activeCategory ? "is-active" : ""}" type="button" data-category="${escapeHtml(category)}">
      ${escapeHtml(category === "All" ? t("catalog.all") : translateCategory(category))}
    </button>`).join("");

  filters.onclick = (event) => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    activeCategory = button.dataset.category;
    filters.querySelectorAll("button").forEach((item) => item.classList.remove("is-active"));
    button.classList.add("is-active");
    render(activeCategory);
  };
}

async function loadProducts() {
  if (!grid) return;
  if (!isConfigured) {
    grid.innerHTML = "";
    showMessage(status, t("catalog.configure"), "info");
    return;
  }

  let query = supabase.from("products").select("*").order("created_at", { ascending: false });
  if (featuredOnly) query = query.eq("featured", true).limit(3);
  const { data, error } = await query;

  if (error) {
    grid.innerHTML = "";
    console.error(error);
    showMessage(status, t("catalog.error"), "error");
    return;
  }
  products = data;
  renderFilters();
  render();
}

initLanguage();
initNavigation();
initScrollAnimations();
document.addEventListener("aurora:languagechange", () => {
  if (products.length) {
    renderFilters();
    render(activeCategory);
  } else if (!isConfigured) {
    showMessage(status, t("catalog.configure"), "info");
  }
});
loadProducts();
