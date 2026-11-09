document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("login-form");
  const errorEl = document.getElementById("login-error");
  if (!form) return;

  supabaseClient.auth.getSession().then(({ data }) => {
    if (data.session) window.location.href = "board.html";
  }).catch(() => {});

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.textContent = "";
    const email = form.email.value.trim();
    const password = form.password.value;
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    btn.textContent = "Ingresando...";

    try {
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) {
        errorEl.textContent = "Correo o contraseña incorrectos.";
        return;
      }
      window.location.href = "board.html";
    } catch (err) {
      errorEl.textContent = "No se pudo conectar. Revisa tu conexión o la configuración del CRM.";
    } finally {
      btn.disabled = false;
      btn.textContent = "Iniciar sesión";
    }
  });
});
