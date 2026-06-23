import { isConfigured, supabase } from "./supabase-client.js";
import { showMessage } from "./ui.js";

const form = document.querySelector("[data-login-form]");
const message = document.querySelector("[data-auth-message]");
const submit = document.querySelector("[data-submit]");

async function userIsAdmin() {
  const { data, error } = await supabase.rpc("is_admin");
  return !error && data === true;
}

async function redirectExistingAdmin() {
  if (!isConfigured) return;
  const { data } = await supabase.auth.getSession();
  if (data.session && await userIsAdmin()) window.location.replace("admin.html");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!isConfigured) {
    showMessage(message, "Add your Supabase URL and anon key in js/config.js first.", "error");
    return;
  }

  submit.disabled = true;
  submit.textContent = "Signing in...";
  const fields = new FormData(form);
  const { error } = await supabase.auth.signInWithPassword({
    email: fields.get("email").trim(),
    password: fields.get("password"),
  });

  if (error) {
    showMessage(message, error.message, "error");
  } else if (!(await userIsAdmin())) {
    await supabase.auth.signOut();
    showMessage(message, "This account does not have studio access.", "error");
  } else {
    showMessage(message, "Welcome back. Opening the studio...", "success");
    window.location.replace("admin.html");
    return;
  }
  submit.disabled = false;
  submit.textContent = "Sign in";
});

redirectExistingAdmin();

