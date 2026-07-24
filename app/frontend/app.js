/* Outil d'aide à la décision — logique frontend (vanilla JS + fetch API) */
const API = "";  // même origine que le backend
let META = null, SCHEMA = null, COMMUNES = null, shapChart = null;

/* ---------- Navigation ---------- */
function goto(page){
  document.querySelectorAll(".page").forEach(s=>s.classList.toggle("active", s.id===page));
  document.querySelectorAll(".nav a").forEach(a=>a.classList.toggle("active", a.dataset.page===page));
  if(page==="carte" && !COMMUNES) loadMap();
  if(page==="ciblage") initCiblage();
  window.scrollTo(0,0);
}
document.querySelectorAll(".nav a").forEach(a=>a.onclick=()=>goto(a.dataset.page));
document.querySelectorAll("[data-goto]").forEach(c=>c.onclick=()=>goto(c.dataset.goto));

/* ---------- Utilitaires ---------- */
const fmt = (n,d=1)=>Number(n).toLocaleString("fr-FR",{minimumFractionDigits:d,maximumFractionDigits:d});
const kpi = (v,l,d="")=>`<div class="kpi"><div class="v">${v}</div><div class="l">${l}</div>${d?`<div class="d">${d}</div>`:""}</div>`;
async function jget(u){return (await fetch(API+u)).json();}
async function jpost(u,b){return (await fetch(API+u,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(b)})).json();}

/* ---------- Chargement initial ---------- */
async function init(){
  META = await jget("/api/metadata");
  document.getElementById("kpis").innerHTML =
    kpi(META.n_analytique.toLocaleString("fr-FR"),"Ménages (échantillon)")+
    kpi(fmt(META.auroc,3),"AUROC (hors échantillon)")+
    kpi((META.recall*100).toFixed(0)+" %","Rappel (ménages détectés)")+
    kpi(META.prevalence_pct.toFixed(1)+" %","Prévalence nationale");
  document.getElementById("apropos-content").innerHTML = `
    <p><b>Baromètre Alimentaire</b> est une solution d'aide à la décision pour le ciblage de
    l'insécurité alimentaire des ménages au Bénin. Conçue par <i>Pinel Baudelaire DAHOUI</i>
    (Data Scientist · Économètre · Statisticien), elle encapsule un modèle prédictif calibré pour
    la prédiction du risque et la cartographie communale.</p>
    <ul>
      <li><b>Algorithme</b> : XGBoost recalibré par régression isotonique</li>
      <li><b>Données</b> : enquête AGVSAN Bénin 2017 (${META.n_analytique.toLocaleString("fr-FR")} ménages)</li>
      <li><b>Performance</b> : AUROC ${fmt(META.auroc,3)} · Rappel ${(META.recall*100).toFixed(0)} % · Brier ${fmt(META.brier_calibre,3)}</li>
    </ul>
    <div class="note">Fondé sur des données de 2017 ; les prédictions appuient sans le remplacer le jugement de terrain.</div>`;
  await buildForm();
  loadDeterminants();
}

/* ---------- Formulaire (déterminants OS1) ---------- */
async function buildForm(){
  SCHEMA = await jget("/api/form-schema");
  const wrap = document.getElementById("form-groups");
  wrap.innerHTML = SCHEMA.map((g,gi)=>`
    <details class="fgroup" ${gi<2?"open":""}>
      <summary>${g.icon} ${g.capital}</summary>
      <div class="fields">${g.fields.map(fieldHTML).join("")}</div>
    </details>`).join("");
}
function orBadge(f){
  if(f.or!==undefined){
    const cls = f.or>1 ? "or-agg":"or-pro";
    const arrow = f.or>1 ? "↑":"↓";
    return `<span class="orbadge ${cls}" title="Odds ratio (OS1), p=${f.p}">OR ${fmt(f.or,2)} ${arrow}</span>`;
  }
  if(f.or_note) return `<span class="or-note">${f.or_note}</span>`;
  return "";
}
function fieldHTML(f){
  const id="f_"+f.key; let input="";
  if(f.type==="number") input=`<input id="${id}" type="number" min="${f.min}" max="${f.max}" value="${f.default}" ${f.step?`step="${f.step}"`:""}>${f.unit?`<span class="hint">${f.unit}</span>`:""}`;
  else if(f.type==="slider") input=`<input id="${id}" type="range" min="${f.min}" max="${f.max}" step="${f.step}" value="${f.default}" oninput="document.getElementById('${id}_v').textContent=this.value"><span class="hint" id="${id}_v">${f.default}</span>`;
  else if(f.type==="binary") input=`<select id="${id}"><option value="0"${f.default==0?" selected":""}>Non</option><option value="1"${f.default==1?" selected":""}>Oui</option></select>`;
  else if(f.type==="select"||f.type==="select_cat") input=`<select id="${id}">${f.options.map(o=>`<option value="${o[0]}"${String(o[0])===String(f.default)?" selected":""}>${o[1]}</option>`).join("")}</select>`;
  return `<div class="field"><label>${f.label} ${orBadge(f)}</label>${input}</div>`;
}
function collectFields(){
  const out={};
  SCHEMA.forEach(g=>g.fields.forEach(f=>{
    const el=document.getElementById("f_"+f.key);
    if(el) out[f.key]= (f.type==="select_cat") ? el.value : Number(el.value);
  }));
  return out;
}

/* ---------- Prédiction individuelle ---------- */
document.getElementById("btn-predict").onclick = async ()=>{
  const r = await jpost("/api/predict",{fields:collectFields()});
  document.getElementById("result").classList.remove("hidden");
  document.getElementById("risk-card").style.background=r.couleur;
  document.getElementById("risk-val").textContent=r.proba_pct.toFixed(1)+" %";
  document.getElementById("risk-cls").textContent="Risque "+r.classe;
  drawShap(r.contributions);
};
function drawShap(contrib){
  const c=[...contrib].reverse();
  const data=c.map(x=>x.value), labels=c.map(x=>x.label);
  const colors=data.map(v=>v>0?"#c0392b":"#2471a3");
  if(shapChart) shapChart.destroy();
  shapChart=new Chart(document.getElementById("shap-chart"),{
    type:"bar",
    data:{labels,datasets:[{data,backgroundColor:colors,borderRadius:3}]},
    options:{indexAxis:"y",plugins:{legend:{display:false},
      tooltip:{callbacks:{label:x=>`contribution : ${x.raw>0?"+":""}${x.raw.toFixed(3)}`}}},
      scales:{x:{title:{display:true,text:"Contribution au risque (log-cote)"}},
              y:{ticks:{font:{size:11}}}}}
  });
}

/* ---------- Prédiction par lot ---------- */
document.getElementById("btn-template").onclick=()=>window.location=API+"/api/template";
let batchCSV=null, batchProba=null;
document.getElementById("file-batch").onchange=async (e)=>{
  const f=e.target.files[0]; if(!f) return;
  const fd=new FormData(); fd.append("file",f);
  const r=await (await fetch(API+"/api/predict/batch",{method:"POST",body:fd})).json();
  if(r.detail){alert("Erreur : "+r.detail);return;}
  batchCSV=r.csv; batchProba=r.rows.map(x=>x.proba_insecurite);
  const s=r.summary;
  document.getElementById("batch-summary").innerHTML=
    kpi(s.n,"Ménages évalués")+kpi(s.risque_moyen+" %","Risque moyen")+
    kpi(s.tres_eleve,"Très élevé")+kpi(s.eleve,"Élevé")+kpi(s.modere+s.faible,"Modéré + Faible");
  document.getElementById("batch-target").classList.remove("hidden");
  renderBatchTable(r.rows);
  updateSeuil();
};
function renderBatchTable(rows){
  const cols=["proba_insecurite","classe_risque",...Object.keys(rows[0]).filter(k=>!["proba_insecurite","classe_risque"].includes(k)).slice(0,6)];
  document.getElementById("batch-table").innerHTML=
    "<tr>"+cols.map(c=>`<th>${c}</th>`).join("")+"</tr>"+
    rows.slice(0,200).map(r=>"<tr>"+cols.map(c=>`<td>${c==="proba_insecurite"?(r[c]*100).toFixed(1)+" %":r[c]}</td>`).join("")+"</tr>").join("");
}
function updateSeuil(){
  const s=+document.getElementById("seuil").value;
  document.getElementById("seuil-val").textContent=s+" %";
  if(!batchProba) return;
  const n=batchProba.filter(p=>p*100>=s).length;
  document.getElementById("seuil-info").innerHTML=
    `🎯 Au seuil ${s} %, <b>${n} ménages</b> (${(n/batchProba.length*100).toFixed(1)} %) seraient ciblés comme prioritaires.`;
}
document.getElementById("seuil").oninput=updateSeuil;
document.getElementById("btn-dl-batch").onclick=()=>{
  if(!batchCSV)return; const b=new Blob([batchCSV],{type:"text/csv"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(b); a.download="menages_scores.csv"; a.click();
};

/* ---------- Cartographie ---------- */
let map=null;
async function loadMap(){
  COMMUNES=await jget("/api/communes");
  map=L.map("map").setView([9.5,2.3],6.4);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    {attribution:"© OpenStreetMap, © CARTO",subdomains:"abcd"}).addTo(map);
  const B=COMMUNES.bands;
  const color=r=> r==null?"#e0e0e0": r>B[2]?"#bd0026": r>B[1]?"#f03b20": r>B[0]?"#feb24c":"#ffffb2";
  L.geoJSON(COMMUNES.geojson,{
    style:f=>({fillColor:color(f.properties.risk),color:"#888",weight:.5,fillOpacity:.82}),
    onEachFeature:(f,l)=>{const r=f.properties.risk;
      l.bindTooltip(`<b>${f.properties.nom}</b><br>Risque : ${r==null?"n.d.":(r*100).toFixed(1)+" %"}`,{sticky:true});}
  }).addTo(map);
  const lg=L.control({position:"bottomright"});
  lg.onAdd=()=>{const d=L.DomUtil.create("div","legend");
    d.innerHTML=`<b>Risque prédit</b><br>
      <i style="background:#ffffb2"></i>&lt; ${(B[0]*100).toFixed(0)} %<br>
      <i style="background:#feb24c"></i>${(B[0]*100).toFixed(0)}–${(B[1]*100).toFixed(0)} %<br>
      <i style="background:#f03b20"></i>${(B[1]*100).toFixed(0)}–${(B[2]*100).toFixed(0)} %<br>
      <i style="background:#bd0026"></i>&gt; ${(B[2]*100).toFixed(0)} %`;
    return d;};
  lg.addTo(map);
  document.getElementById("top-communes").innerHTML=
    "<tr><th>Commune</th><th>Risque</th><th>n</th></tr>"+
    COMMUNES.top.slice(0,15).map(c=>`<tr><td>${c.nom_commune}</td><td><b>${c.risk_pct} %</b></td><td>${c.n}</td></tr>`).join("");
}

/* ---------- Ciblage & simulation ---------- */
const SIM_BASE={taille_menage:9,instruction_cm:0,taux_scolarisation:0.5,statut_matrimonial:"1",
  departement:"2",electricite:0,indice_logement:1,toilette_amelioree:0,log_depenses_alim:9000,
  log_revenu:8000,diversification_revenus:1,activite_principale:"Agriculture",pratique_agriculture:1,
  superficie_emblavee:0,tlu:0,securite_fonciere:0,vente_actifs_productifs:1,assistance_recue:1,capacite_relevement:2};
let ciblageReady=false;
async function initCiblage(){
  if(ciblageReady) return; ciblageReady=true;
  if(!COMMUNES) COMMUNES=await jget("/api/communes");
  document.querySelectorAll("[data-sim]").forEach(cb=>cb.onchange=runSim);
  document.getElementById("cseuil").oninput=runCiblage;
  await runSim(); runCiblage();
}
async function runSim(){
  const base=await jpost("/api/predict",{fields:SIM_BASE});
  const mod={...SIM_BASE};
  const on=k=>document.querySelector(`[data-sim="${k}"]`).checked;
  if(on("elec")){mod.electricite=1;mod.indice_logement=Math.min(3,mod.indice_logement+1);}
  if(on("eau")){mod.toilette_amelioree=1;}
  if(on("revenu")){mod.log_revenu=16000;mod.diversification_revenus=Math.min(3,mod.diversification_revenus+1);}
  if(on("instr")){mod.instruction_cm=1;mod.taux_scolarisation=1;}
  const after=await jpost("/api/predict",{fields:mod});
  const p0=base.proba_pct,p1=after.proba_pct;
  document.getElementById("sim-kpis").innerHTML=
    kpi(p0.toFixed(1)+" %","Risque initial")+
    kpi(p1.toFixed(1)+" %","Après intervention",(p1-p0>=0?"+":"")+fmt(p1-p0,1)+" pts")+
    kpi(p0>0?((p0-p1)/p0*100).toFixed(0)+" %":"—","Réduction relative");
}
function runCiblage(){
  const s=+document.getElementById("cseuil").value;
  document.getElementById("cseuil-val").textContent=s+" %";
  const cible=COMMUNES.top.filter(c=>c.risk_pct>=s);
  const pop=cible.reduce((a,c)=>a+c.n,0);
  document.getElementById("ciblage-kpis").innerHTML=
    kpi(cible.length+" / 77","Communes ciblées")+kpi(pop.toLocaleString("fr-FR"),"Ménages enquêtés couverts");
  document.getElementById("ciblage-table").innerHTML=
    "<tr><th>Commune</th><th>Risque</th><th>Ménages</th></tr>"+
    cible.map(c=>`<tr><td>${c.nom_commune}</td><td><b>${c.risk_pct} %</b></td><td>${c.n}</td></tr>`).join("");
}

/* ---------- Déterminants (à propos) ---------- */
async function loadDeterminants(){
  const d=await jget("/api/determinants");
  document.getElementById("det-table").innerHTML=
    "<tr><th>Déterminant</th><th>Odds ratio</th><th>IC 95 %</th><th>p</th><th>Sens</th></tr>"+
    d.map(x=>`<tr><td>${x.label}</td><td><b>${fmt(x.or,3)}</b></td><td>[${fmt(x.ic[0],3)} ; ${fmt(x.ic[1],3)}]</td>
      <td>${x.p}</td><td><span class="pill" style="background:${x.sens==='aggravant'?'#b71c1c':'#2e7d32'}">${x.sens}</span></td></tr>`).join("");
}

init();
