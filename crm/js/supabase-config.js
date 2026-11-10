// Reemplaza estos dos valores con los de tu proyecto Supabase.
// Los encuentras en: Supabase → tu proyecto → Settings → API.
// El "anon public key" está hecho para usarse en el navegador (no es secreto);
// el acceso real a los datos lo controla Row Level Security (ver schema.sql).
const SUPABASE_URL = "https://nuxrrllkomvsmydaxgkb.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_JQpxVJrMufSsnuLdlr29QA_N7gXJbkq";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const STAGES = [
  // Hito 1: calificación del lead
  { key: "lead", label: "Lead", hito: 1 },
  { key: "contacto", label: "Contacto", hito: 1 },
  { key: "volver_a_llamar", label: "Volver a llamar", hito: 1 },
  { key: "agendado", label: "Agendado", hito: 1 },
  { key: "no_contesta_malo", label: "No contesta / Malo", hito: 1 },
  { key: "asesoria_ok", label: "Asesoría OK", hito: 1 },
  { key: "descartado", label: "Descartado", hito: 1 },
  // Hito 2: cierre de la operación
  { key: "reserva", label: "Reserva", hito: 2 },
  { key: "documentos", label: "Documentos", hito: 2 },
  { key: "aprobacion", label: "Aprobación", hito: 2 },
  { key: "promesa", label: "Promesa", hito: 2 },
  { key: "escritura", label: "Escritura", hito: 2 },
  { key: "factura", label: "Factura", hito: 2 },
  { key: "arriendo", label: "Arriendo", hito: 2 },
];

const HITOS = [
  { key: 1, label: "Hito 1 · Calificación" },
  { key: 2, label: "Hito 2 · Cierre" },
];
