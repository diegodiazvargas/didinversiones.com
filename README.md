# DIDI Inversiones — Sitio web

Sitio estático (HTML/CSS/JS) para DIDI Inversiones SpA, bróker de inversión inmobiliaria en Santiago, Chile. Pensado para desplegarse en **Netlify**, con un chatbot conectado a la API de Claude (Anthropic) vía una función serverless.

## Estructura del proyecto

```
.
├── index.html                  # Página única con las 7 secciones del sitio
├── css/
│   ├── style.css                # Sistema de diseño (colores, tipografía, layout, secciones)
│   └── chatbot.css              # Estilos del widget de chat "Dani"
├── js/
│   ├── main.js                   # Menú móvil, contadores animados, revelado al scroll
│   └── chatbot.js                # Lógica del widget de chat (llama a la función serverless)
├── netlify/functions/
│   └── chat.js                   # Proxy server-side hacia la API de Claude (API key nunca va al cliente)
├── assets/img/
│   └── logo-icon.svg             # Isotipo reconstruido en SVG (ver "Pendientes" abajo)
├── netlify.toml                  # Configuración de build/functions para Netlify
├── .env.example                  # Referencia de variables de entorno necesarias
└── package.json
```

## Cómo ver el sitio en local

Es HTML/CSS/JS puro, así que basta con un servidor estático simple, por ejemplo:

```bash
npx serve .
```

El chatbot **no funcionará en local** con un servidor estático simple, porque depende de la función serverless. Para probarlo en local con la función incluida, instala la CLI de Netlify y corre:

```bash
npm install -g netlify-cli
netlify dev
```

## Desplegar en Netlify

1. Sube este proyecto a un repositorio de GitHub (o similar).
2. En Netlify: **Add new site → Import an existing project**, y conecta el repo.
3. Build command: no aplica (sitio estático) — Netlify detectará `netlify.toml` automáticamente.
   - Publish directory: `.`
   - Functions directory: `netlify/functions`
4. En **Site settings → Environment variables**, agrega:
   - `ANTHROPIC_API_KEY` = tu API key de Anthropic (la consigues en [console.anthropic.com](https://console.anthropic.com)).
   - `ANTHROPIC_MODEL` (opcional) = `claude-sonnet-5` por defecto. Para reducir costo se puede usar `claude-haiku-4-5-20251001`.
5. Deploy. El chatbot quedará funcionando en `/.netlify/functions/chat`.

La API key **nunca se expone en el navegador** — solo la usa `netlify/functions/chat.js`, que corre en el servidor.

## Pendientes marcados en el código

Buscar el comentario `PENDIENTE` en los archivos para ubicar rápidamente cada uno:

| Dónde | Qué falta |
|---|---|
| `assets/img/logo-icon.svg` | Es una **reconstrucción vectorial** hecha a partir del logo en baja resolución encontrado en las firmas de correo (`Pie_de_Firma_*.png`). Si aparece el archivo original en alta resolución o vectorial (SVG/AI/PDF), reemplazar este archivo (y `logo-icon-on-dark.svg`, su variante para fondos oscuros). |
| `index.html` → hero | Reemplazar la tarjeta "Depto 2D/2B · Ñuñoa" por una foto real de un proyecto destacado. |
| `assets/logos/*` | Logos reales de aliados descargados de sus sitios oficiales / Wikimedia Commons (no son archivos entregados por DIDI). Si la empresa tiene una versión en mejor calidad o pide que se use otra, reemplazar el archivo correspondiente. |
| `index.html` → Testimonios | Son placeholders (`[PLACEHOLDER]`) — reemplazar por testimonios reales (nombre, cargo, frase). |
| `index.html` → footer | Confirmar si aplica una dirección/comuna exacta de oficina (hoy solo dice "Santiago, Chile"). |
| `netlify/functions/chat.js` | Requiere `ANTHROPIC_API_KEY` configurada en Netlify (ver arriba) para funcionar. |

## Notas de diseño

- Colores: azul marino `#102A57` (texto principal, CTA, marca), dorado `#C4953C` (acento: íconos, subtítulos, hover), fondo blanco/crema `#FFFFFF` / `#FAF8F3`, gris `#6E7580` (texto secundario) — variables CSS en `css/style.css`.
- Tipografías: **Fraunces** (títulos/wordmark) + **Hanken Grotesk** (texto), cargadas desde Google Fonts.
- Mobile-first: gran parte del tráfico esperado llega desde Meta Ads → WhatsApp.
- Referencia de diseño/estructura: [inviertepro.cl](https://inviertepro.cl).
- Razón social (holding): **DIDICAPITALS SPA** — usada en el pie de página. "DIDI Inversiones" es el nombre comercial/marca.
