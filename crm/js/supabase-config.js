// Reemplaza estos dos valores con los de tu proyecto Supabase.
// Los encuentras en: Supabase → tu proyecto → Settings → API.
// El "anon public key" está hecho para usarse en el navegador (no es secreto);
// el acceso real a los datos lo controla Row Level Security (ver schema.sql).
const SUPABASE_URL = "https://TU-PROYECTO.supabase.co";
const SUPABASE_ANON_KEY = "TU-ANON-PUBLIC-KEY";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const STAGES = [
  { key: "lead", label: "Lead" },
  { key: "reunion", label: "Reunión agendada" },
  { key: "reserva", label: "Reserva" },
  { key: "aprobacion", label: "Aprobación" },
  { key: "promesa", label: "Promesa" },
  { key: "escritura", label: "Escritura" },
  { key: "arriendo", label: "Arriendo" },
];
