/* ==========================================================================
   DIDI Inversiones — widget de chatbot "Dani"
   Conecta con /.netlify/functions/chat (proxy server-side a la API de Claude).
   La API key NUNCA se expone en el cliente: vive como variable de entorno
   en Netlify y solo la usa la función serverless. Ver README.md.
   ========================================================================== */

(function () {
  "use strict";

  var launcher = document.getElementById("chatLauncher");
  var panel = document.getElementById("chatPanel");
  var body = document.getElementById("chatBody");
  var form = document.getElementById("chatForm");
  var input = document.getElementById("chatInput");
  var quickReplies = document.getElementById("chatQuickReplies");

  if (!launcher || !panel || !form) return;

  var ENDPOINT = "/.netlify/functions/chat";
  var history = []; // [{ role: "user" | "assistant", content: "..." }]
  var isOpen = false;
  var isSending = false;
  var hasGreeted = false;

  /* ---------- Abrir / cerrar panel ---------- */
  launcher.addEventListener("click", function () {
    isOpen = !isOpen;
    panel.classList.toggle("is-open", isOpen);
    launcher.classList.toggle("is-open", isOpen);
    launcher.setAttribute("aria-expanded", String(isOpen));

    if (isOpen && !hasGreeted) {
      hasGreeted = true;
      addBotMessage(
        "¡Hola! Soy Dani, asistente de DIDI Inversiones 👋 " +
          "Puedo ayudarte a entender cómo invertir en propiedades, resolver dudas y, si quieres, coordinar una " +
          "conversación con Diego. ¿En qué te puedo ayudar hoy?"
      );
    }

    if (isOpen) {
      window.setTimeout(function () { input.focus(); }, 250);
    }
  });

  /* ---------- Respuestas rápidas ---------- */
  if (quickReplies) {
    quickReplies.addEventListener("click", function (event) {
      var btn = event.target.closest("button[data-quick]");
      if (!btn) return;
      sendMessage(btn.getAttribute("data-quick"));
    });
  }

  /* ---------- Envío del formulario ---------- */
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var text = input.value.trim();
    if (!text) return;
    input.value = "";
    sendMessage(text);
  });

  /* ---------- Render de mensajes ---------- */
  function scrollToBottom() {
    body.scrollTop = body.scrollHeight;
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // Renderer minimalista y seguro: escapa todo y solo permite **negrita**,
  // [texto](url) y saltos de línea. No inyecta HTML arbitrario del modelo.
  function renderBotText(raw) {
    var escaped = escapeHtml(raw);
    escaped = escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    escaped = escaped.replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>'
    );
    escaped = escaped.replace(/\n/g, "<br>");
    return escaped;
  }

  function addUserMessage(text) {
    var el = document.createElement("div");
    el.className = "chat-msg chat-msg--user";
    el.textContent = text;
    body.appendChild(el);
    scrollToBottom();
  }

  function addBotMessage(text) {
    var el = document.createElement("div");
    el.className = "chat-msg chat-msg--bot";
    el.innerHTML = renderBotText(text);
    body.appendChild(el);
    scrollToBottom();
  }

  function showTyping() {
    var el = document.createElement("div");
    el.className = "chat-msg chat-msg--bot chat-typing";
    el.id = "chatTypingIndicator";
    el.innerHTML = "<span></span><span></span><span></span>";
    body.appendChild(el);
    scrollToBottom();
  }

  function hideTyping() {
    var el = document.getElementById("chatTypingIndicator");
    if (el) el.remove();
  }

  /* ---------- Envío al backend ---------- */
  function sendMessage(text) {
    if (isSending) return;
    isSending = true;

    addUserMessage(text);
    history.push({ role: "user", content: text });
    showTyping();

    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history })
    })
      .then(function (res) {
        if (!res.ok) throw new Error("Respuesta no válida (" + res.status + ")");
        return res.json();
      })
      .then(function (data) {
        hideTyping();
        var reply = (data && data.reply) || "";
        if (!reply) throw new Error("Respuesta vacía");
        addBotMessage(reply);
        history.push({ role: "assistant", content: reply });
      })
      .catch(function () {
        hideTyping();
        addBotMessage(
          "Se me cortó la conexión 😅 Mientras lo resolvemos, puedes escribirle directo a Diego por " +
            "[WhatsApp](https://wa.me/56999641973) o [agendar una asesoría](https://calendly.com/diegodiaz-didinversiones/inversion-inmobiliaria)."
        );
      })
      .finally(function () {
        isSending = false;
      });
  }
})();
