import { isConfigured, supabase } from "./supabase-client.js";
import { escapeHtml, formatPrice, hideMessage, showMessage } from "./ui.js";

const bucket = "product-images";
const loading = document.querySelector("[data-page-loading]");
const content = document.querySelector("[data-admin-content]");
const message = document.querySelector("[data-admin-message]");
const productsContainer = document.querySelector("[data-admin-products]");
const count = document.querySelector("[data-product-count]");
const form = document.querySelector("[data-product-form]");
const formTitle = document.querySelector("[data-form-title]");
const formEyebrow = document.querySelector("[data-form-eyebrow]");
const imagePreview = document.querySelector("[data-image-preview]");
const saveButton = document.querySelector("[data-save-product]");
let products = [];

function placeholder() {
  return "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 90"><rect width="120" height="90" fill="#f3e9dc"/><circle cx="60" cy="38" r="20" fill="#f7d6e0"/><path d="M60 53v25" stroke="#829b82" stroke-width="5"/></svg>');
}

async function requireAdmin() {
  if (!isConfigured) {
    loading.textContent = "Supabase is not configured. Update js/config.js first.";
    return null;
  }
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    window.location.replace("admin-login.html");
    return null;
  }
  const { data: allowed, error } = await supabase.rpc("is_admin");
  if (error || !allowed) {
    await supabase.auth.signOut();
    window.location.replace("admin-login.html");
    return null;
  }
  return sessionData.session.user;
}

function renderProducts() {
  count.textContent = products.length;
  if (!products.length) {
    productsContainer.innerHTML = '<p class="empty-state">Your collection is empty. Add the first product to begin.</p>';
    return;
  }
  productsContainer.innerHTML = products.map((product) => `
    <article class="admin-product">
      <img src="${escapeHtml(product.image_url || placeholder())}" alt="">
      <div>
        <h3>${escapeHtml(product.name)}</h3>
        <p>${formatPrice(product.price)} &middot; ${escapeHtml(product.category)}${product.subcategory ? ` &middot; ${escapeHtml(product.subcategory)}` : ""}</p>
        <div class="admin-product__tags">
          <span class="mini-tag">${product.in_stock ? "In stock" : "Out of stock"}</span>
          ${product.featured ? '<span class="mini-tag">Featured</span>' : ""}
          ${!product.is_active ? '<span class="mini-tag">Hidden</span>' : ""}
        </div>
      </div>
      <div class="admin-product__actions">
        <button class="action-button" type="button" data-edit="${product.id}">Edit</button>
        <button class="action-button action-button--danger" type="button" data-delete="${product.id}">Delete</button>
      </div>
    </article>`).join("");
}

async function loadProducts() {
  const { data, error } = await supabase.from("products").select("*").order("updated_at", { ascending: false });
  if (error) {
    showMessage(message, `Could not load products: ${error.message}`, "error");
    return;
  }
  products = data;
  renderProducts();
}

function resetForm() {
  form.reset();
  form.elements.id.value = "";
  form.elements.existing_image_path.value = "";
  form.elements.existing_image_url.value = "";
  form.elements.in_stock.checked = true;
  form.elements.is_active.checked = true;
  imagePreview.hidden = true;
  imagePreview.querySelector("img").src = "";
  formTitle.textContent = "Add a product";
  formEyebrow.textContent = "New design";
  saveButton.textContent = "Save product";
}

function editProduct(id) {
  const product = products.find((item) => item.id === id);
  if (!product) return;
  form.elements.id.value = product.id;
  form.elements.name.value = product.name;
  form.elements.name_en.value = product.name_en || "";
  form.elements.price.value = product.price;
  form.elements.category.value = product.category;
  form.elements.subcategory.value = product.subcategory || "";
  form.elements.description.value = product.description || "";
  form.elements.description_en.value = product.description_en || "";
  form.elements.in_stock.checked = product.in_stock;
  form.elements.featured.checked = product.featured;
  form.elements.is_active.checked = product.is_active;
  form.elements.existing_image_path.value = product.image_path || "";
  form.elements.existing_image_url.value = product.image_url || "";
  if (product.image_url) {
    imagePreview.querySelector("img").src = product.image_url;
    imagePreview.hidden = false;
  } else imagePreview.hidden = true;
  formTitle.textContent = "Edit product";
  formEyebrow.textContent = "Update design";
  saveButton.textContent = "Update product";
  document.querySelector("[data-form-panel]").scrollIntoView({ behavior: "smooth", block: "start" });
}

async function uploadImage(file, userId) {
  if (!file) return null;
  if (file.size > 5 * 1024 * 1024) throw new Error("The image must be smaller than 5 MB.");
  if (!file.type.startsWith("image/")) throw new Error("Please choose a valid image file.");
  const extension = file.name.split(".").pop().toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { path, url: data.publicUrl };
}

async function removeImage(path) {
  if (!path) return;
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) console.warn("Product saved, but the old image could not be removed:", error.message);
}

async function saveProduct(event) {
  event.preventDefault();
  hideMessage(message);
  if (!form.reportValidity()) return;

  const user = (await supabase.auth.getUser()).data.user;
  const values = new FormData(form);
  const id = values.get("id");
  const oldPath = values.get("existing_image_path");
  const imageFile = values.get("image");
  let uploaded = null;
  saveButton.disabled = true;
  saveButton.textContent = "Saving...";

  try {
    if (imageFile && imageFile.size) uploaded = await uploadImage(imageFile, user.id);
    const payload = {
      name: values.get("name").trim(),
      name_en: values.get("name_en").trim() || null,
      price: Number(values.get("price")),
      category: values.get("category").trim(),
      subcategory: values.get("subcategory").trim() || null,
      description: values.get("description").trim(),
      description_en: values.get("description_en").trim() || null,
      in_stock: values.get("in_stock") === "on",
      featured: values.get("featured") === "on",
      is_active: values.get("is_active") === "on",
      image_path: uploaded?.path || oldPath || null,
      image_url: uploaded?.url || values.get("existing_image_url") || null,
    };
    const query = id ? supabase.from("products").update(payload).eq("id", id) : supabase.from("products").insert(payload);
    const { error } = await query;
    if (error) throw error;
    if (uploaded && oldPath) await removeImage(oldPath);
    showMessage(message, id ? "Product updated." : "Product added to the collection.", "success");
    resetForm();
    await loadProducts();
  } catch (error) {
    if (uploaded) await removeImage(uploaded.path);
    showMessage(message, `Could not save the product: ${error.message}`, "error");
  } finally {
    saveButton.disabled = false;
    if (!form.elements.id.value) saveButton.textContent = "Save product";
  }
}

async function deleteProduct(id) {
  const product = products.find((item) => item.id === id);
  if (!product || !window.confirm(`Delete “${product.name}”? This cannot be undone.`)) return;
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) {
    showMessage(message, `Could not delete the product: ${error.message}`, "error");
    return;
  }
  await removeImage(product.image_path);
  showMessage(message, "Product deleted.", "success");
  resetForm();
  await loadProducts();
}

async function init() {
  const user = await requireAdmin();
  if (!user) return;
  document.querySelector("[data-admin-email]").textContent = user.email;
  loading.hidden = true;
  content.hidden = false;
  await loadProducts();
}

form.addEventListener("submit", saveProduct);
productsContainer.addEventListener("click", (event) => {
  const edit = event.target.closest("[data-edit]");
  const remove = event.target.closest("[data-delete]");
  if (edit) editProduct(edit.dataset.edit);
  if (remove) deleteProduct(remove.dataset.delete);
});
document.querySelectorAll("[data-cancel-edit]").forEach((button) => button.addEventListener("click", resetForm));
document.querySelector("[data-new-product]").addEventListener("click", () => { resetForm(); document.querySelector("[data-form-panel]").scrollIntoView({ behavior: "smooth" }); });
document.querySelector("[data-logout]").addEventListener("click", async () => { await supabase.auth.signOut(); window.location.replace("admin-login.html"); });
form.elements.image.addEventListener("change", () => {
  const file = form.elements.image.files[0];
  if (!file) return;
  imagePreview.querySelector("img").src = URL.createObjectURL(file);
  imagePreview.hidden = false;
});
supabase?.auth.onAuthStateChange((event) => { if (event === "SIGNED_OUT") window.location.replace("admin-login.html"); });
init();
