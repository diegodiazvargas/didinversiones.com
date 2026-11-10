init();

async function init() {
  const { data } = await supabaseClient.auth.getSession();
  if (!data.session) {
    window.location.href = "index.html";
    return;
  }

  const { data: profile } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", data.session.user.id)
    .maybeSingle();

  const name = profile?.full_name || data.session.user.email;
  document.getElementById("user-name").textContent = name;
  document.getElementById("user-avatar").textContent = initials(name);

  document.getElementById("logout-btn").addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    window.location.href = "index.html";
  });

  const hito2Stages = STAGES.filter((s) => s.hito === 2).map((s) => s.key);

  const { data: leads, error } = await supabaseClient
    .from("leads")
    .select("stage, budget, commission_didi, commission_jose, commission_nico, created_at")
    .in("stage", hito2Stages);

  if (error) {
    document.querySelector(".dashboard-wrap").innerHTML = `<p style="color:#B3261E;">No se pudo cargar el resumen: ${error.message}</p>`;
    return;
  }

  renderKpis(leads, hito2Stages);
  renderCommissionBars(leads);
  renderStageBars(leads, hito2Stages);
  renderMonthTable(leads);
}

function initials(name) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("");
}

function fmtUF(n) {
  return n.toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtCLP(n) {
  return "$" + Math.round(n).toLocaleString("es-CL");
}

function renderKpis(leads, hito2Stages) {
  const totalUF = leads.reduce((sum, l) => sum + (Number(l.budget) || 0), 0);
  const withUF = leads.filter((l) => l.budget != null).length;
  const sinUF = leads.length - withUF;

  document.getElementById("kpi-uf").textContent = fmtUF(totalUF) + " UF";
  document.getElementById("kpi-uf-sub").textContent = sinUF > 0 ? `${sinUF} venta(s) sin UF registrada` : "";
  document.getElementById("kpi-count").textContent = leads.length;

  const escrituradas = leads.filter((l) => l.stage === "escritura" || l.stage === "arriendo");
  const ufEscrituradas = escrituradas.reduce((sum, l) => sum + (Number(l.budget) || 0), 0);
  document.getElementById("kpi-escrituradas").textContent = escrituradas.length;
  document.getElementById("kpi-escrituradas-sub").textContent = fmtUF(ufEscrituradas) + " UF";
}

function renderBarList(container, items, formatValue) {
  const max = Math.max(1, ...items.map((i) => i.value));
  container.innerHTML = items
    .map(
      (i) => `
      <div class="bar-row">
        <span class="bar-label">${i.label}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${(i.value / max) * 100}%"></div></div>
        <span class="bar-value">${formatValue(i.value)}</span>
      </div>
    `
    )
    .join("");
}

function renderCommissionBars(leads) {
  const totals = { "DIDI": 0, "Jose": 0, "Nico": 0 };
  leads.forEach((l) => {
    totals["DIDI"] += Number(l.commission_didi) || 0;
    totals["Jose"] += Number(l.commission_jose) || 0;
    totals["Nico"] += Number(l.commission_nico) || 0;
  });
  const items = Object.entries(totals).map(([label, value]) => ({ label, value }));
  renderBarList(document.getElementById("comision-bars"), items, fmtCLP);
}

function renderStageBars(leads, hito2Stages) {
  const items = hito2Stages.map((key) => {
    const stage = STAGES.find((s) => s.key === key);
    const value = leads.filter((l) => l.stage === key).length;
    return { label: stage.label, value };
  });
  renderBarList(document.getElementById("stage-bars"), items, (v) => String(v));
}

function renderMonthTable(leads) {
  const byMonth = {};
  leads.forEach((l) => {
    const d = new Date(l.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!byMonth[key]) byMonth[key] = { count: 0, uf: 0, didi: 0, jose: 0, nico: 0 };
    byMonth[key].count += 1;
    byMonth[key].uf += Number(l.budget) || 0;
    byMonth[key].didi += Number(l.commission_didi) || 0;
    byMonth[key].jose += Number(l.commission_jose) || 0;
    byMonth[key].nico += Number(l.commission_nico) || 0;
  });

  const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const rows = Object.keys(byMonth)
    .sort()
    .map((key) => {
      const [year, month] = key.split("-");
      const label = `${monthNames[Number(month) - 1]} ${year}`;
      const m = byMonth[key];
      return `
        <tr>
          <td>${label}</td>
          <td>${m.count}</td>
          <td>${fmtUF(m.uf)}</td>
          <td>${fmtCLP(m.didi)}</td>
          <td>${fmtCLP(m.jose)}</td>
          <td>${fmtCLP(m.nico)}</td>
        </tr>
      `;
    })
    .join("");

  document.getElementById("month-table-body").innerHTML =
    rows || `<tr><td colspan="6" style="text-align:center; color:var(--gray);">Sin datos todavía</td></tr>`;
}
