let currentUser = null;
let currentProfile = null;
let profiles = [];
let leads = [];
let activeLeadId = null;
let draggedLeadId = null;

const boardEl = document.getElementById("board");
const vendorFilterEl = document.getElementById("vendor-filter");
const searchInputEl = document.getElementById("search-input");

init();

async function init() {
  const { data } = await supabaseClient.auth.getSession();
  if (!data.session) {
    window.location.href = "index.html";
    return;
  }
  currentUser = data.session.user;

  await loadOrCreateProfile();
  await loadProfiles();
  renderUserPill();
  populateStageSelect();
  populateVendorSelects();
  await loadLeads();
  renderBoard();
  bindEvents();
  subscribeRealtime();
}

async function loadOrCreateProfile() {
  const { data: profile } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (profile) {
    currentProfile = profile;
    return;
  }

  const modal = document.getElementById("profile-modal");
  modal.hidden = false;

  await new Promise((resolve) => {
    document.getElementById("profile-form").addEventListener("submit", async function handler(e) {
      e.preventDefault();
      const fullName = document.getElementById("profile-name").value.trim();
      if (!fullName) return;
      const { data: created, error } = await supabaseClient
        .from("profiles")
        .insert({ id: currentUser.id, full_name: fullName })
        .select()
        .single();
      if (error) {
        alert("No se pudo crear tu perfil: " + error.message);
        return;
      }
      currentProfile = created;
      modal.hidden = true;
      e.target.removeEventListener("submit", handler);
      resolve();
    });
  });
}

async function loadProfiles() {
  const { data, error } = await supabaseClient.from("profiles").select("*").order("full_name");
  if (!error) profiles = data || [];
}

async function loadLeads() {
  const { data, error } = await supabaseClient
    .from("leads")
    .select("*, assignee:assigned_to(full_name)")
    .order("created_at", { ascending: false });
  if (error) {
    console.error(error);
    return;
  }
  leads = data || [];
}

function renderUserPill() {
  const name = currentProfile?.full_name || currentUser.email;
  document.getElementById("user-name").textContent = name;
  document.getElementById("user-avatar").textContent = initials(name);
}

function initials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}

function populateStageSelect() {
  const sel = document.getElementById("lead-stage");
  sel.innerHTML = STAGES.map((s) => `<option value="${s.key}">${s.label}</option>`).join("");
}

function populateVendorSelects() {
  const assignedSel = document.getElementById("lead-assigned");
  const options = profiles.map((p) => `<option value="${p.id}">${escapeHtml(p.full_name)}</option>`).join("");
  assignedSel.innerHTML = `<option value="">Sin asignar</option>` + options;
  vendorFilterEl.innerHTML =
    `<option value="">Todos los vendedores</option>` + options;
}

function getFilteredLeads() {
  const vendorId = vendorFilterEl.value;
  const query = searchInputEl.value.trim().toLowerCase();
  return leads.filter((lead) => {
    if (vendorId && lead.assigned_to !== vendorId) return false;
    if (query) {
      const haystack = [lead.name, lead.phone, lead.email, lead.property_interest]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

function renderBoard() {
  const filtered = getFilteredLeads();
  boardEl.innerHTML = STAGES.map((stage) => {
    const stageLeads = filtered.filter((l) => l.stage === stage.key);
    return `
      <section class="column" data-stage="${stage.key}">
        <div class="column-head">
          <h2>${stage.label}</h2>
          <span class="column-count">${stageLeads.length}</span>
        </div>
        <div class="column-cards" data-stage="${stage.key}">
          ${
            stageLeads.length
              ? stageLeads.map(renderCard).join("")
              : `<div class="column-empty">Sin leads</div>`
          }
        </div>
      </section>
    `;
  }).join("");

  bindBoardEvents();
}

function renderCard(lead) {
  const vendorName = lead.assignee?.full_name || "Sin asignar";
  const days = daysSince(lead.updated_at || lead.created_at);
  return `
    <article class="lead-card" draggable="true" data-id="${lead.id}">
      <div class="lead-name">${escapeHtml(lead.name)}</div>
      <div class="lead-meta">${escapeHtml(lead.property_interest || lead.phone || "")}</div>
      <div class="lead-foot">
        <span>${escapeHtml(vendorName)}</span>
        <span class="lead-days">${days}d</span>
      </div>
    </article>
  `;
}

function daysSince(dateStr) {
  if (!dateStr) return 0;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function bindBoardEvents() {
  document.querySelectorAll(".lead-card").forEach((card) => {
    card.addEventListener("click", () => openLeadModal(card.dataset.id));
    card.addEventListener("dragstart", (e) => {
      draggedLeadId = card.dataset.id;
      card.classList.add("dragging");
      e.dataTransfer.setData("text/plain", card.dataset.id);
    });
    card.addEventListener("dragend", () => card.classList.remove("dragging"));
  });

  document.querySelectorAll(".column").forEach((col) => {
    col.addEventListener("dragover", (e) => {
      e.preventDefault();
      col.classList.add("drag-over");
    });
    col.addEventListener("dragleave", () => col.classList.remove("drag-over"));
    col.addEventListener("drop", async (e) => {
      e.preventDefault();
      col.classList.remove("drag-over");
      const newStage = col.dataset.stage;
      const leadId = draggedLeadId || e.dataTransfer.getData("text/plain");
      if (!leadId) return;
      await moveLeadToStage(leadId, newStage);
    });
  });
}

async function moveLeadToStage(leadId, newStage) {
  const lead = leads.find((l) => l.id === leadId);
  if (!lead || lead.stage === newStage) return;
  const prevStage = lead.stage;
  lead.stage = newStage;
  renderBoard();

  const { error } = await supabaseClient.from("leads").update({ stage: newStage }).eq("id", leadId);
  if (error) {
    lead.stage = prevStage;
    renderBoard();
    alert("No se pudo mover el lead: " + error.message);
    return;
  }

  const stageLabel = STAGES.find((s) => s.key === newStage)?.label || newStage;
  await supabaseClient.from("lead_activities").insert({
    lead_id: leadId,
    user_id: currentProfile.id,
    type: "stage_change",
    content: `Movido a "${stageLabel}"`,
  });
}

function bindEvents() {
  document.getElementById("new-lead-btn").addEventListener("click", () => openLeadModal(null));
  document.getElementById("lead-modal-close").addEventListener("click", closeLeadModal);
  document.getElementById("cancel-lead-btn").addEventListener("click", closeLeadModal);
  document.getElementById("lead-form").addEventListener("submit", saveLead);
  document.getElementById("delete-lead-btn").addEventListener("click", deleteLead);
  document.getElementById("add-activity-btn").addEventListener("click", addActivity);
  document.getElementById("logout-btn").addEventListener("click", logout);
  vendorFilterEl.addEventListener("change", renderBoard);
  searchInputEl.addEventListener("input", renderBoard);
}

function openLeadModal(leadId) {
  activeLeadId = leadId;
  const lead = leadId ? leads.find((l) => l.id === leadId) : null;
  const modal = document.getElementById("lead-modal");
  const isAdmin = currentProfile?.role === "admin";

  document.getElementById("lead-modal-title").textContent = lead ? "Editar lead" : "Nuevo lead";
  document.getElementById("lead-id").value = lead?.id || "";
  document.getElementById("lead-name").value = lead?.name || "";
  document.getElementById("lead-phone").value = lead?.phone || "";
  document.getElementById("lead-email").value = lead?.email || "";
  document.getElementById("lead-property").value = lead?.property_interest || "";
  document.getElementById("lead-budget").value = lead?.budget ?? "";
  document.getElementById("lead-source").value = lead?.source || "";
  document.getElementById("lead-stage").value = lead?.stage || "lead";
  document.getElementById("lead-assigned").value = lead?.assigned_to || (lead ? "" : currentProfile.id);
  document.getElementById("lead-next-action").value = lead?.next_action_date || "";
  document.getElementById("delete-lead-btn").hidden = !(lead && isAdmin);

  const activitySection = document.getElementById("activity-section");
  if (lead) {
    activitySection.hidden = false;
    loadActivities(lead.id);
  } else {
    activitySection.hidden = true;
  }

  modal.hidden = false;
}

function closeLeadModal() {
  document.getElementById("lead-modal").hidden = true;
  activeLeadId = null;
}

async function saveLead(e) {
  e.preventDefault();
  const id = document.getElementById("lead-id").value;
  const payload = {
    name: document.getElementById("lead-name").value.trim(),
    phone: document.getElementById("lead-phone").value.trim() || null,
    email: document.getElementById("lead-email").value.trim() || null,
    property_interest: document.getElementById("lead-property").value.trim() || null,
    budget: document.getElementById("lead-budget").value || null,
    source: document.getElementById("lead-source").value.trim() || null,
    stage: document.getElementById("lead-stage").value,
    assigned_to: document.getElementById("lead-assigned").value || null,
    next_action_date: document.getElementById("lead-next-action").value || null,
  };

  const saveBtn = document.getElementById("save-lead-btn");
  saveBtn.disabled = true;

  try {
    if (id) {
      const { error } = await supabaseClient.from("leads").update(payload).eq("id", id);
      if (error) throw error;
    } else {
      const { error } = await supabaseClient.from("leads").insert(payload);
      if (error) throw error;
    }
    closeLeadModal();
    await loadLeads();
    renderBoard();
  } catch (err) {
    alert("No se pudo guardar el lead: " + err.message);
  } finally {
    saveBtn.disabled = false;
  }
}

async function deleteLead() {
  const id = document.getElementById("lead-id").value;
  if (!id) return;
  if (!confirm("¿Eliminar este lead? Esta acción no se puede deshacer.")) return;

  const { error } = await supabaseClient.from("leads").delete().eq("id", id);
  if (error) {
    alert("No se pudo eliminar: " + error.message);
    return;
  }
  closeLeadModal();
  await loadLeads();
  renderBoard();
}

async function loadActivities(leadId) {
  const container = document.getElementById("activity-items");
  container.innerHTML = `<p style="color:var(--gray); font-size:0.8rem;">Cargando...</p>`;

  const { data, error } = await supabaseClient
    .from("lead_activities")
    .select("*, author:user_id(full_name)")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  if (error) {
    container.innerHTML = `<p style="color:var(--gray); font-size:0.8rem;">No se pudo cargar la actividad.</p>`;
    return;
  }

  if (!data.length) {
    container.innerHTML = `<p style="color:var(--gray); font-size:0.8rem;">Sin actividad aún.</p>`;
    return;
  }

  container.innerHTML = data
    .map(
      (a) => `
      <div class="activity-item">
        <div>${escapeHtml(a.content)}</div>
        <div class="meta">${escapeHtml(a.author?.full_name || "")} · ${new Date(a.created_at).toLocaleString("es-CL")}</div>
      </div>
    `
    )
    .join("");
}

async function addActivity() {
  if (!activeLeadId) return;
  const textarea = document.getElementById("activity-note");
  const content = textarea.value.trim();
  if (!content) return;

  const { error } = await supabaseClient.from("lead_activities").insert({
    lead_id: activeLeadId,
    user_id: currentProfile.id,
    type: "note",
    content,
  });

  if (error) {
    alert("No se pudo agregar la nota: " + error.message);
    return;
  }

  textarea.value = "";
  loadActivities(activeLeadId);
}

function subscribeRealtime() {
  supabaseClient
    .channel("leads-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, async () => {
      await loadLeads();
      renderBoard();
    })
    .subscribe();
}

async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = "index.html";
}
