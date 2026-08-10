/* ==========================================================================
   Netlify Function: /.netlify/functions/chat
   Proxy server-side hacia la API de Claude (Anthropic) para el widget "Dani".
   La API key vive SOLO en la variable de entorno ANTHROPIC_API_KEY de Netlify
   (Site settings → Environment variables) — nunca se expone al navegador.
   ========================================================================== */

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

// Modelo por defecto: Claude Sonnet 5 (buena calidad conversacional).
// Para reducir costo se puede cambiar a "claude-haiku-4-5-20251001".
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

const MAX_HISTORY_MESSAGES = 16; // últimos N mensajes que se reenvían como contexto
const MAX_MESSAGE_LENGTH = 1200; // caracteres por mensaje de usuario

const SYSTEM_PROMPT = `Eres Dani, la asistente virtual de DIDI Inversiones, un bróker de inversión inmobiliaria en Santiago, Chile.

Sobre DIDI Inversiones:
- Intermedia entre inmobiliarias e inversionistas, vendiendo departamentos de inversión en proyectos nuevos.
- También ofrece corretaje y administración de arriendo.
- Trabaja con inmobiliarias (Imagina, Fai, Simonetti, Deisa, Euro, Norte Verde, Delabase, Siena, Castro Y Tagle, Almazara, Fundamenta), bancos (Santander, BCI, Itaú, Banco de Chile, Consorcio, Coopeuch, Banco Estado, Bice) y mutuarias hipotecarias (Bice Hipotecaria, Metlife, Evoluciona, Principal, Renta Nacional).
- Proceso: asesoría gratuita → selección de proyecto y unidad según el perfil del inversionista → gestión de crédito hipotecario → firma de promesa y escrituración → entrega y arriendo de la propiedad.
- Fundador: Diego Díaz.

Tu tono: cercano, educativo, sin tecnicismos. NO eres vendedora agresiva — tu rol es acompañar y educar al visitante, no presionar por una venta.

Tu objetivo en la conversación:
1. Responder dudas sobre inversión inmobiliaria en Chile de forma clara y honesta (qué es invertir en verde, UF, dividendo, plusvalía, arriendo, etc.), sin dar asesoría financiera regulada ni cifras que no puedas sustentar.
2. Ir levantando, de forma natural y conversacional (no como un formulario), el perfil financiero básico del visitante: su capacidad de ahorro aproximada, y si busca su primera propiedad de inversión o ampliar una cartera existente.
3. Cuando el visitante muestre intención real (quiere avanzar, cotizar, o ya diste suficiente contexto), invítalo a agendar una conversación con Diego. Ofrece SIEMPRE estas dos opciones con sus links exactos en formato markdown:
   - WhatsApp: [conversar por WhatsApp](https://wa.me/56999641973)
   - Calendly: [agendar una asesoría gratuita](https://calendly.com/diegodiaz-didinversiones/inversion-inmobiliaria)

Reglas:
- Responde siempre en español de Chile, en mensajes breves (máximo ~4-5 líneas), como una conversación de chat real, no un ensayo.
- No inventes datos de proyectos específicos, precios exactos o disponibilidad que no tengas — si preguntan por eso, deriva a Diego.
- No dés asesoría de inversión financiera regulada ni garantices rentabilidades.
- Si preguntan algo fuera del rubro inmobiliario/DIDI, redirige amablemente a lo que sí puedes ayudar.`;

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("Falta ANTHROPIC_API_KEY en las variables de entorno de Netlify.");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "El chatbot no está configurado todavía." })
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ error: "JSON inválido" }) };
  }

  const incoming = Array.isArray(payload.messages) ? payload.messages : [];
  if (!incoming.length) {
    return { statusCode: 400, body: JSON.stringify({ error: "Falta el mensaje" }) };
  }

  // Sanitiza y acota el historial: solo role/content de texto, largo limitado.
  const messages = incoming
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-MAX_HISTORY_MESSAGES)
    .map((m) => ({
      role: m.role,
      content: m.content.slice(0, MAX_MESSAGE_LENGTH)
    }));

  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return { statusCode: 400, body: JSON.stringify({ error: "El último mensaje debe ser del usuario" }) };
  }

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        messages
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Error de la API de Anthropic:", response.status, errText);
      return {
        statusCode: 502,
        body: JSON.stringify({ error: "No se pudo obtener respuesta del asistente." })
      };
    }

    const data = await response.json();
    const reply = (data.content || [])
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reply })
    };
  } catch (err) {
    console.error("Error llamando a la API de Anthropic:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error interno del asistente." })
    };
  }
};
