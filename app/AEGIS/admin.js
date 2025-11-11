/* AEGIS Admin — vanilla JS (no frameworks) */
(() => {
  const $ = (s,c=document)=>c.querySelector(s);
  const $$ = (s,c=document)=>Array.from(c.querySelectorAll(s));
  const toast = $('#toast');
  const modal = $('#modal'), modalTitle=$('#modalTitle'), modalBody=$('#modalBody');

  // ---------- Storage helpers ----------
  const store = {
    get(k, d){ try{ return JSON.parse(localStorage.getItem(k) || JSON.stringify(d)); }catch(_){ return d; } },
    set(k, v){ localStorage.setItem(k, JSON.stringify(v)); },
  };
  const nowISO = () => new Date().toISOString();
  const rnd = (n)=>Math.floor(Math.random()*n);

  // ---------- Event Bus ----------
  const bus = {
    events:{},
    on(ev, fn){ (this.events[ev] = this.events[ev] || []).push(fn); },
    emit(ev, data){ (this.events[ev]||[]).forEach(fn=>fn(data)); }
  };

  // ---------- Data Keys ----------
  const K = {
    events:'aegis_events',
    incidents:'aegis_incidents',
    users:'aegis_users',
    devices:'aegis_devices',
    connectors:'aegis_connectors',
    rules:'aegis_rules',
    policies:'aegis_policies',
    role:'aegis_role',
    audit:'aegis_audit',
    webhook:'aegis_webhook'
  };

  // ---------- RBAC ----------
  const roleSelect = $('#roleSelect');
  const ROLES = ['Owner','Admin','Staf','Auditor','ReadOnly'];
  function currentRole(){ return localStorage.getItem(K.role) || 'Owner'; }
  function applyRBAC(){
    const role = currentRole();
    roleSelect.value = role;
    // Disable/enable buttons by data-role
    $$('[data-roles]').forEach(btn => {
      const allow = btn.getAttribute('data-roles').split(',').map(s=>s.trim());
      btn.disabled = !allow.includes(role);
    });
    // ReadOnly / Auditor read-only: add pointer-events none to destructive
    if (role==='ReadOnly' || role==='Auditor'){
      $$('[data-destructive]').forEach(b=> b.disabled = true);
    }
  }
  roleSelect.addEventListener('change', ()=>{
    localStorage.setItem(K.role, roleSelect.value);
    logAudit(`Switch role → ${roleSelect.value}`);
    applyRBAC();
  });

  // ---------- Utils ----------
  const toKM = (lat1,lon1,lat2,lon2) => {
    const R=6371, dLat=(lat2-lat1)*Math.PI/180, dLon=(lon2-lon1)*Math.PI/180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return 2*R*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };
  const ms = (h=0,m=0)=> (h*3600 + m*60)*1000;
  const fmtTime = (iso)=> new Date(iso).toLocaleString();
  const badgeUpdate = ()=>{
    const open = store.get(K.incidents,[]).filter(i=>i.status==='Open').length;
    $('#incBadge').textContent = open;
    // Also broadcast for index page badge
    localStorage.setItem('aegis_incidents', JSON.stringify(store.get(K.incidents,[])));
  };
  const showToast = (msg)=>{
    toast.textContent = msg; toast.classList.add('show');
    setTimeout(()=> toast.classList.remove('show'), 2400);
  };
  function openModal(title, bodyHTML){
    modalTitle.textContent = title; modalBody.innerHTML = bodyHTML;
    modal.style.display='grid'; modal.setAttribute('aria-hidden','false');
  }
  function closeModal(){ modal.style.display='none'; modal.setAttribute('aria-hidden','true'); }
  modal.addEventListener('click', (e)=>{ if(e.target.matches('.modal-backdrop,[data-close]')) closeModal(); });

  // ---------- Rendering ----------
  const feedEl = $('#feed');
  const incList = $('#incList');
  const userList = $('#userList');
  const connGrid = $('#connGrid');
  const pbList = $('#pbList');
  const auditList = $('#auditList');
  const reportPreview = $('#reportPreview');

  function renderOverview(){
    const evs = store.get(K.events,[]);
    const incs = store.get(K.incidents,[]);
    const conns = store.get(K.connectors,[]);
    const anoms = evs.filter(e => (e.threatScore||0) >= 60).length;
    const score = Math.min(99, Math.round((evs.reduce((s,e)=>s+(e.threatScore||0),0)/(evs.length||1)) ));
    $('#kpiThreat').textContent = score;
    $('#barThreat').style.setProperty('--v', score+'%');
    $('#kpiAnom').textContent = anoms;
    $('#barAnom').style.setProperty('--v', Math.min(100, anoms*10)+'%');
    $('#kpiInc').textContent = incs.filter(i=>i.status!=='Resolved').length;
    $('#barInc').style.setProperty('--v', Math.min(100, incs.length*20)+'%');
    $('#kpiConn').textContent = conns.filter(c=>c.status==='Connected').length;
    $('#barConn').style.setProperty('--v', Math.min(100, conns.length? (conns.filter(c=>c.status==='Connected').length/conns.length*100):0)+'%');
  }

  function iconForAction(a){
    if(a.includes('login')) return 'assets/admin/radar.svg';
    if(a.includes('invoice')) return 'assets/invoice.svg';
    if(a.includes('email')) return 'assets/mail.svg';
    if(a.includes('api_key')) return 'assets/admin/plug.svg';
    if(a.includes('privileged')) return 'assets/admin/lock.svg';
    return 'assets/admin/bell.svg';
  }

  
function renderFeed(filter='all'){
  const all = store.get(K.events,[]).slice(-300).reverse();
  const evs = all.filter(e => {
    if(filter==='all') return true;
    if(filter==='login') return (e.action||'').startsWith('login');
    if(filter==='invoice') return (e.action||'').includes('invoice');
    if(filter==='email') return (e.action||'').includes('email');
    if(filter==='priv') return (e.action||'').includes('privileged');
    if(filter==='integration') return ['api_key_use'].includes(e.action);
  });
  feedEl.innerHTML = evs.map(e => {
    const risk = (e.severity||'Low').toLowerCase();
    const riskCls = risk==='critical'?'risk-critical':risk==='high'?'risk-high':risk==='med'?'risk-med':'risk-low';
    const riskEmoji = risk==='critical'?'🔴':risk==='high'?'🟠':risk==='med'?'🟡':'🟢';
    const geo = e.geo || e.context?.geo || {};
    const user = e.userName || e.userEmail || e.userId || '-';
    const device = e.deviceLabel || e.browser || e.deviceId || '-';
    const asn = e.asn || e.asnName || '-';
    const city = e.city || e.country || '-';
    const ip = e.ip || '-';
    const ts = new Date(e.ts).toLocaleString();
    const rSignals = (e.riskSignals||[]).map(s=>`<span class="chip">${s}</span>`).join(' ');
    return `
    <article class="feed-item" data-id="${e.id}" tabindex="0">
      <div class="feed-head">
        <div class="feed-title">
          <span aria-hidden="true">🧷</span>
          <span>${e.action||'-'}</span>
          <span class="risk-pill ${riskCls}">${riskEmoji} ${(e.severity||'Low')}</span>
        </div>
        <div class="feed-actions">
          <button class="btn sm btn-outline" data-act="detail" aria-label="Detail pengguna">Detail</button>
          <button class="btn sm" data-act="incident" aria-label="Buka/Buat Incident">Incident</button>
        </div>
      </div>
      <div class="feed-grid">
        <div class="feed-kv"><small>User</small><div><b>${user}</b><div>${e.userEmail||''}${e.userRole?` • ${e.userRole}`:''}</div></div></div>
        <div class="feed-kv"><small>Device</small><div>${device}</div></div>
        <div class="feed-kv"><small>IP / ASN</small><div><span class="badge-ip" data-ip="${ip}">${ip}</span> — ${asn}</div></div>
        <div class="feed-kv"><small>Lokasi</small><div>${city}</div></div>
      </div>
      <div class="feed-badges">${rSignals}</div>
      <div class="feed-foot">
        <div>TS ${e.threatScore??'—'}</div>
        <div>•</div>
        <div>${ts}</div>
        <div>•</div>
        <div>res:${e.resource||'-'}</div>
        ${e.deviceId?`<div>•</div><div>dev:${e.deviceId}</div>`:''}
      </div>
    </article>`;
  }).join('');
  // rebind row IP copy
  feedEl.querySelectorAll('[data-ip]').forEach(el=>{
    el.addEventListener('click', ()=>{ navigator.clipboard.writeText(el.dataset.ip||''); showToast('IP disalin'); });
  });
}

  $$('#live .chip').forEach(ch => ch.addEventListener('click',()=>{
    $$('#live .chip').forEach(c=>c.classList.remove('active')); ch.classList.add('active');
    renderFeed(ch.dataset.filter);
  }));

  function renderIncidents(){
    const incs = store.get(K.incidents,[]).slice().reverse();
    incList.innerHTML = incs.map(inc => `
      <div class="inc-card" data-id="${inc.id}">
        <div class="row" style="justify-content:space-between">
          <div class="inc-title">${inc.title}</div>
          <span class="badge sev-${inc.severity}">${inc.severity}</span>
        </div>
        <div class="row" style="gap:.4rem"><span class="badge">Status: ${inc.status}</span><span class="badge">Events: ${inc.events.length}</span></div>
        <div class="row inc-actions">
          <button class="btn btn-soft" data-open="${inc.id}">Detail</button>
          <button class="btn btn-soft" data-ack="${inc.id}" data-roles="Owner,Admin,Staf">Tandai In Review</button>
          <button class="btn btn-soft" data-resolve="${inc.id}" data-roles="Owner,Admin">Resolve</button>
          <button class="btn btn-soft" data-download="${inc.id}">Unduh Bukti (JSON)</button>
        </div>
      </div>
    `).join('');
    applyRBAC();
    // Bind
    $$('[data-open]').forEach(b=> b.addEventListener('click', ()=> openIncident(b.getAttribute('data-open')) ));
    $$('[data-ack]').forEach(b=> b.addEventListener('click', ()=> setIncidentStatus(b.getAttribute('data-ack'),'In Review')) );
    $$('[data-resolve]').forEach(b=> b.addEventListener('click', ()=> setIncidentStatus(b.getAttribute('data-resolve'),'Resolved')) );
    $$('[data-download]').forEach(b=> b.addEventListener('click', ()=> downloadIncident(b.getAttribute('data-download')) ));
  }

  function renderUsers(){
    const users = store.get(K.users,[]);
    userList.innerHTML = users.map(u=>`
      <div class="user-card">
        <div class="row" style="justify-content:space-between">
          <b>${u.email}</b>
          <span class="user-meta">last: ${fmtTime(u.lastSeen||nowISO())}</span>
        </div>
        <div class="user-meta">role: ${u.role||'User'} • risk: ${u.risk||0}</div>
        <div class="user-badges">
          ${u.locked?'<span class="badge sev-High">Locked</span>':''}
          ${u.mfaRequired?'<span class="badge sev-Med">MFA Required</span>':''}
          <span class="badge">${(u.devices||[]).length} perangkat</span>
        </div>
        <div class="row">
          <button class="btn btn-soft" data-roles="Owner,Admin,Staf" data-isolate="${u.id}">Isolasi user ini</button>
        </div>
      </div>
    `).join('');
    applyRBAC();
    $$('[data-isolate]').forEach(b=> b.addEventListener('click', ()=> {
      const id = b.getAttribute('data-isolate');
      updateUser(id, {locked:true}); showToast('User di-lock (mock)'); logAudit(`Isolate user ${id}`);
    }));
  }

  function renderConnectors(){
    const conns = store.get(K.connectors,[]);
    connGrid.innerHTML = conns.map(c=>`
      <div class="conn-card">
        <div class="row" style="justify-content:space-between">
          <div class="row" style="gap:.5rem">
            <img src="assets/admin/plug.svg" width="18" height="18" alt="" aria-hidden="true">
            <b>${c.name}</b>
          </div>
          <span class="conn-status ${c.status}">${c.status}</span>
        </div>
        <div class="conn-actions">
          <button class="btn btn-soft" data-toggle="${c.id}" data-roles="Owner,Admin,Staf">${c.status==='Connected'?'Putuskan':'Hubungkan'}</button>
          ${c.id==='sdk' ? '<button class="btn btn-outline" data-sdk>SDK (Mock)</button>':''}
        </div>
      </div>
    `).join('');
    applyRBAC();
    $$('[data-toggle]').forEach(b=> b.addEventListener('click', ()=>{
      const id = b.getAttribute('data-toggle'); toggleConnector(id);
    }));
    $$('[data-sdk]').forEach(b=> b.addEventListener('click', ()=>{
      openModal('SDK JS (Mock)', `<pre style="white-space:pre-wrap">` + escapeHtml(SDK_SNIPPET) + `</pre>`);
    }));
  }

  function renderPlaybooks(){
    const pbs = [
      {id:'pb1', name:'Akun Dibajak', steps:['Logout semua sesi','Lockdown 15m','Force reset password','Kirim notifikasi owner']},
      {id:'pb2', name:'Invoice Palsu', steps:['Revoke tokens','Lock account','Notify owner','Audit invoice perubahan']},
      {id:'pb3', name:'Brute Force', steps:['Lock account','Force MFA','Rate limit','Notify owner']},
      {id:'pb4', name:'Token Pencurian', steps:['Revoke tokens','Quarantine device','Force reset key','Notify owner']},
    ];
    pbList.innerHTML = pbs.map(pb=>`
      <div class="pb-card">
        <div class="row" style="justify-content:space-between">
          <b>${pb.name}</b>
          <button class="btn btn-primary" data-roles="Owner,Admin,Staf" data-runpb="${pb.id}">Jalankan</button>
        </div>
        <ol>${pb.steps.map(s=>`<li>${s}</li>`).join('')}</ol>
      </div>
    `).join('');
    applyRBAC();
    $$('[data-runpb]').forEach(b=> b.addEventListener('click', ()=> runPlaybook(b.getAttribute('data-runpb')) ));
  }

  function renderAudit(){
    const logs = store.get(K.audit,[]).slice(-200).reverse();
    auditList.innerHTML = logs.map(l=>`<div class="audit-item">${fmtTime(l.ts)} — ${l.msg}</div>`).join('');
  }

  function renderReport(){
    const period = $('#reportPeriod').value;
    const incs = store.get(K.incidents,[]);
    const summary = {
      total: incs.length,
      open: incs.filter(i=>i.status==='Open').length,
      high: incs.filter(i=>['High','Critical'].includes(i.severity)).length,
      mttd: (rnd(10)+1)+' mnt',
      mttr: (20+rnd(60))+' mnt'
    };
    reportPreview.innerHTML = `
      <div class="card">
        <h3>Ringkasan ${period==='weekly'?'Mingguan':'Bulanan'}</h3>
        <ul class="bullets">
          <li>Total insiden: <b>${summary.total}</b> (Open: ${summary.open})</li>
          <li>High/Critical: <b>${summary.high}</b></li>
          <li>MTTD: <b>${summary.mttd}</b> • MTTR: <b>${summary.mttr}</b></li>
          <li>Top risk users: ${store.get(K.users,[]).slice(0,3).map(u=>u.email).join(', ')}</li>
        </ul>
      </div>
    `;
  }

  // ---------- Rules Engine & Anomaly ----------
  function baselineFor(userId){
    const users = store.get(K.users,[]);
    return users.find(u=>u.id===userId) || null;
  }

  function evalAnomaly(evt){
    let score = 0;
    (evt.riskSignals||[]).forEach(sig => {
      if (sig==='new_ip' || sig==='device_unknown' || sig==='geo_new') score += 25;
      if (sig==='impossible_travel') score += 50;
      if (sig==='invoice_beneficiary_changed' || sig==='phishing_domain_match') score += 40;
    });
    const bl = baselineFor(evt.userId);
    if (bl){
      // Time of day deviation (mock): if hour < 5 or > 22
      const h = new Date(evt.ts).getHours();
      if (h < 5 || h > 22) score += 10;
      // Unknown device
      if (!(bl.devices||[]).includes(evt.deviceId)) score += 20;
    }
    evt.threatScore = Math.min(100, score);
    evt.severity = score>=80?'Critical':score>=60?'High':score>=30?'Med':'Low';
  }

  function getRules(){
    try{ return JSON.parse($('#rulesEditor').value); }catch(_){ return []; }
  }

  function lastLoginEvt(userId){
    const evs = store.get(K.events,[]).filter(e=>e.userId===userId && e.action==='login_success');
    return evs.length ? evs[evs.length-1] : null;
  }

  function evalRules(evt){
    const rules = getRules();
    const fires = [];
    for (const r of rules){
      try{
        if (r.name==='Impossible Travel' && evt.action==='login_success'){
          const last = lastLoginEvt(evt.userId);
          if (last){
            const dist = toKM(last.context.geo.lat,last.context.geo.lon, evt.context.geo.lat,evt.context.geo.lon);
            const tdiff = Math.abs(new Date(evt.ts) - new Date(last.ts));
            if (dist > 1000 && tdiff < ms(2,0)){
              fires.push({rule:r, severity:'High', actions:['lock_account','force_mfa','notify_owner'], title:'Impossible Travel'});
            }
          }
        }
        if (r.name==='Brute Force' && evt.action==='login_failed'){
          const windowMs = ms(0,2);
          const evs = store.get(K.events,[]).filter(e=> e.action==='login_failed' && e.ip===evt.ip && (new Date(evt.ts)-new Date(e.ts))<windowMs);
          const newIp = (evt.riskSignals||[]).includes('new_ip');
          if (newIp && evs.length >= 4){ // current is 5th
            fires.push({rule:r, severity:'High', actions:['lock_account','force_mfa','notify_owner'], title:'Brute Force'});
          }
        }
        if (r.name==='Invoice Fraud' && evt.action==='invoice_update'){
          if ((evt.riskSignals||[]).includes('invoice_beneficiary_changed')){
            fires.push({rule:r, severity:'Critical', actions:['revoke_tokens','notify_owner'], title:'Invoice Fraud'});
          }
        }
        if (r.name==='Token Theft' && evt.action==='api_key_use'){
          if ((evt.riskSignals||[]).includes('device_unknown')){
            fires.push({rule:r, severity:'High', actions:['revoke_tokens','quarantine_device','notify_owner'], title:'Token Theft'});
          }
        }
        if (r.name==='Phishing' && evt.action==='email_click'){
          const isAdmin = (baselineFor(evt.userId)?.role || '').toLowerCase()==='admin';
          fires.push({rule:r, severity: isAdmin?'High':'Med', actions: isAdmin?['force_mfa','notify_owner']:['notify_owner'], title:'Phishing'});
        }
      }catch(e){ console.warn('rule error', r, e); }
    }
    return fires;
  }

  function createIncident({title, severity, events, actions}){
    const incs = store.get(K.incidents,[]);
    const id = 'inc_'+Date.now();
    const inc = {id, title, severity, status:'Open', events, actions, createdAt: nowISO(), updatedAt: nowISO()};
    incs.push(inc);
    store.set(K.incidents, incs);
    badgeUpdate();
    renderIncidents();
    logAudit(`Incident created: ${title} (${severity})`);
    showToast(`Incident: ${title} (${severity})`);
    $('#attackBanner').hidden = false;
    return inc;
  }

  function setIncidentStatus(id, status){
    const incs = store.get(K.incidents,[]);
    const inc = incs.find(i=>i.id===id);
    if (!inc) return;
    inc.status = status; inc.updatedAt = nowISO();
    store.set(K.incidents, incs);
    renderIncidents(); badgeUpdate();
    logAudit(`Incident ${id} → ${status}`);
  }

  function downloadIncident(id){
    const inc = store.get(K.incidents,[]).find(i=>i.id===id);
    const blob = new Blob([JSON.stringify(inc, null, 2)], {type:'application/json'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = id + '.json'; a.click();
  }

  function applyActions(incident){
    (incident.actions||[]).forEach(act => {
      if (act==='lock_account'){ updateUser(incident.events[0].userId, {locked:true}); }
      if (act==='force_mfa'){ updateUser(incident.events[0].userId, {mfaRequired:true}); }
      if (act==='revoke_tokens'){ /* mock */ logAudit('Tokens revoked for '+incident.events[0].userId); }
      if (act==='quarantine_device'){ logAudit('Device quarantined: '+incident.events[0].deviceId); }
      if (act==='notify_owner'){ logAudit('Owner notified'); }
    });
  }

  function updateUser(id, patch){
    const users = store.get(K.users,[]);
    const u = users.find(x=>x.id===id);
    if (!u) return;
    Object.assign(u, patch, {lastSeen: nowISO()});
    store.set(K.users, users); renderUsers();
  }

  // ---------- Event ingestion ----------
  function ingestEvent(evt){
    evt.id = evt.id || ('evt_'+Date.now()+'_'+rnd(999));
    evt.ts = evt.ts || nowISO();
    evalAnomaly(evt);
    const evs = store.get(K.events,[]); evs.push(evt); store.set(K.events, evs);
    renderFeed($('#live .chip.active')?.dataset.filter || 'all');
    // Rules
    const fires = evalRules(evt);
    if (fires.length){
      const f = fires[0];
      const inc = createIncident({title:`${f.title} — ${evt.userEmail}`, severity:f.severity, events:[evt], actions:f.actions});
      applyActions(inc);
    }
    renderOverview();
  }

  // ---------- Seeder ----------
  function seed(){
    const users = [
      {id:'u_owner', email:'owner@umkm.id', role:'Owner', devices:['dev_o1'], locked:false, mfaRequired:true, risk:12, lastSeen: nowISO()},
      {id:'u_admin', email:'admin@umkm.id', role:'Admin', devices:['dev_a1'], locked:false, mfaRequired:true, risk:18, lastSeen: nowISO()},
      {id:'u_cashier', email:'kasir@toko-umkm.id', role:'Staf', devices:['dev_c1','dev_c2'], locked:false, mfaRequired:false, risk:8, lastSeen: nowISO()},
    ];
    const connectors = [
      {id:'tokopedia', name:'Tokopedia', status:'Connected'},
      {id:'shopee', name:'Shopee', status:'Connected'},
      {id:'gmail', name:'Gmail', status:'Connected'},
      {id:'bank', name:'Banking', status:'Disconnected'},
      {id:'sdk', name:'SDK (Mock)', status:'Connected'},
      {id:'webhook', name:'Webhook Kustom', status:'Disconnected'}
    ];
    const defaultRules = [
      {"name":"Impossible Travel"},
      {"name":"Brute Force"},
      {"name":"Invoice Fraud"},
      {"name":"Token Theft"},
      {"name":"Phishing"}
    ];
    store.set(K.users, users);
    store.set(K.devices, []);
    store.set(K.connectors, connectors);
    store.set(K.events, []);
    store.set(K.incidents, []);
    store.set(K.rules, defaultRules);
    $('#rulesEditor').value = JSON.stringify(defaultRules, null, 2);
    // policies
    store.set(K.policies, {mfa_admin:true, impossible:true, rate:true, invoice:true, homoglyph:true});
    $('#pol_mfa_admin').checked = true; $('#pol_impossible').checked = true; $('#pol_rate').checked = true; $('#pol_invoice').checked = true; $('#pol_homoglyph').checked = true;
    renderOverview(); renderFeed(); renderIncidents(); renderUsers(); renderConnectors(); renderPlaybooks(); renderAudit(); renderReport(); badgeUpdate();
    showToast('Data contoh dimuat.');
    logAudit('Seeder loaded');
  }

  // ---------- Attack Simulator ----------
  function runScenario(key){
    if (key==='A'){
      // 1) admin login Jakarta
      const admin = store.get(K.users,[]).find(u=>u.email==='admin@umkm.id') || {id:'u_admin', email:'admin@umkm.id'};
      ingestEvent({ userId:admin.id, userEmail:admin.email, ip:'103.12.34.56', country:'ID', asn:'ISP-XYZ', deviceId:'dev_a1', browser:'Chrome 142', action:'login_success', resource:'dashboard', context:{geo:{lat:-6.2, lon:106.8}}, riskSignals:[] });
      setTimeout(()=>{
        // 2) login sukses Frankfurt (impossible travel)
        ingestEvent({ userId:admin.id, userEmail:admin.email, ip:'91.1.2.3', country:'DE', asn:'ISP-DE', deviceId:'dev_new', browser:'Chrome 142', action:'login_success', resource:'dashboard', context:{geo:{lat:50.1, lon:8.6}}, riskSignals:['new_ip','device_unknown','impossible_travel','geo_new'] });
      }, 900);
      setTimeout(()=>{
        // 3) privileged action
        ingestEvent({ userId:admin.id, userEmail:admin.email, ip:'91.1.2.3', country:'DE', deviceId:'dev_new', browser:'Chrome 142', action:'privileged_action', resource:'dashboard', context:{}, riskSignals:['device_unknown'] });
        $('#attackBanner').hidden = false;
      }, 1800);
    }
    if (key==='B'){
      const kasir = store.get(K.users,[]).find(u=>u.email==='kasir@toko-umkm.id') || {id:'u_cashier', email:'kasir@toko-umkm.id'};
      ingestEvent({ userId:kasir.id, userEmail:kasir.email, ip:'103.45.67.89', country:'ID', deviceId:'dev_c1', browser:'Chrome 142', action:'invoice_update', resource:'dashboard', context:{beneficiary_old:'BCA 123', beneficiary_new:'BCA 124'}, riskSignals:['invoice_beneficiary_changed'] });
    }
    if (key==='C'){
      const kasir = store.get(K.users,[]).find(u=>u.email==='kasir@toko-umkm.id') || {id:'u_cashier', email:'kasir@toko-umkm.id'};
      // 5 login_failed in 2 minutes from new ip
      for (let i=0;i<5;i++){
        setTimeout(()=> ingestEvent({ userId:kasir.id, userEmail:kasir.email, ip:'185.22.11.90', country:'RU', deviceId:'dev_x', browser:'Chrome', action:'login_failed', resource:'dashboard', context:{geo:{lat:55.7, lon:37.6}}, riskSignals:['new_ip','geo_new','device_unknown'] }), i*250);
      }
    }
    if (key==='D'){
      const admin = store.get(K.users,[]).find(u=>u.email==='admin@umkm.id') || {id:'u_admin', email:'admin@umkm.id'};
      ingestEvent({ userId:admin.id, userEmail:admin.email, ip:'66.77.88.99', country:'US', deviceId:'dev_hacker', browser:'curl/8.2', action:'api_key_use', resource:'api', context:{key_id:'k_live_123'}, riskSignals:['device_unknown','new_ip'] });
    }
  }

  // Attack banner quick actions
  $('#simulator').addEventListener('click', (e)=>{
    const btn = e.target.closest('[data-run]'); if (btn){ runScenario(btn.getAttribute('data-run')); }
    const act = e.target.closest('[data-action]'); if (act){
      const action = act.getAttribute('data-action');
      if (action==='panic'){ startLockdown(15); }
      if (action==='lock'){ const inc = lastIncident(); if (inc) applyActions({...inc, actions:['lock_account']}); }
      if (action==='mfa'){ const inc = lastIncident(); if (inc) applyActions({...inc, actions:['force_mfa']}); }
      if (action==='revoke'){ const inc = lastIncident(); if (inc) applyActions({...inc, actions:['revoke_tokens']}); }
      if (action==='open-inc'){ const inc = lastIncident(); if (inc) openIncident(inc.id); }
    }
  });

  function lastIncident(){
    const incs = store.get(K.incidents,[]);
    return incs[incs.length-1];
  }

  function startLockdown(mins){
    const until = Date.now() + mins*60*1000;
    const timerEl = $('#lockdownTimer');
    timerEl.hidden = false;
    const tick = ()=>{
      const left = until - Date.now();
      if (left <= 0){ timerEl.hidden = true; $('#attackBanner').hidden=true; return; }
      const m = Math.floor(left/60000), s = Math.floor((left%60000)/1000);
      timerEl.textContent = `System Lockdown: ${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    showToast('System lockdown aktif (mock)');
    logAudit('System lockdown 15m (mock)');
  }

  // ---------- Incidents detail modal ----------
  function openIncident(id){
    const inc = store.get(K.incidents,[]).find(i=>i.id===id);
    if (!inc) return;
    const ev = inc.events[0];
    const actions = `
      <div class="row" style="gap:.5rem; margin:.5rem 0">
        <button class="btn btn-soft" data-inc-act="lock" data-roles="Owner,Admin,Staf">Lock Account</button>
        <button class="btn btn-soft" data-inc-act="revoke" data-roles="Owner,Admin,Staf">Revoke Tokens</button>
        <button class="btn btn-soft" data-inc-act="mfa" data-roles="Owner,Admin,Staf">Force 2FA</button>
        <button class="btn btn-soft" data-inc-act="quarantine" data-roles="Owner,Admin">Quarantine Device</button>
      </div>`;
    openModal('Incident Detail', `
      <p><b>${inc.title}</b> <span class="badge sev-${inc.severity}">${inc.severity}</span></p>
      <p>Status: ${inc.status} • Dibuat: ${fmtTime(inc.createdAt)}</p>
      <h4>Timeline</h4>
      <ul class="bullets">
        ${inc.events.map(e=>`<li>${fmtTime(e.ts)} — ${e.action} — ${e.userEmail} — TS ${e.threatScore}</li>`).join('')}
      </ul>
      ${actions}
    `);
    applyRBAC();
    $('#modalBody').addEventListener('click', (e)=>{
      const act = e.target.closest('[data-inc-act]'); if (!act) return;
      const a = act.getAttribute('data-inc-act');
      if (a==='lock') applyActions({...inc, actions:['lock_account']});
      if (a==='revoke') applyActions({...inc, actions:['revoke_tokens']});
      if (a==='mfa') applyActions({...inc, actions:['force_mfa']});
      if (a==='quarantine') applyActions({...inc, actions:['quarantine_device']});
      showToast('Aksi dijalankan (mock)'); logAudit('Incident action: '+a);
    }, {once:true});
  }

  // ---------- Policies & Rules ----------
  function loadPolicies(){
    const p = store.get(K.policies, {mfa_admin:true, impossible:true, rate:true, invoice:true, homoglyph:true});
    $('#pol_mfa_admin').checked = !!p.mfa_admin;
    $('#pol_impossible').checked = !!p.impossible;
    $('#pol_rate').checked = !!p.rate;
    $('#pol_invoice').checked = !!p.invoice;
    $('#pol_homoglyph').checked = !!p.homoglyph;
    $('#rulesEditor').value = JSON.stringify(store.get(K.rules,[{"name":"Impossible Travel"},{"name":"Brute Force"},{"name":"Invoice Fraud"},{"name":"Token Theft"},{"name":"Phishing"}]), null, 2);
  }
  $('#savePolicies').addEventListener('click', ()=>{
    const prev = store.get(K.policies,{});
    const cur = {
      mfa_admin: $('#pol_mfa_admin').checked,
      impossible: $('#pol_impossible').checked,
      rate: $('#pol_rate').checked,
      invoice: $('#pol_invoice').checked,
      homoglyph: $('#pol_homoglyph').checked
    };
    store.set(K.policies, cur);
    const risky = prev.mfa_admin && !cur.mfa_admin;
    $('#policyWarning').hidden = !risky;
    showToast('Kebijakan disimpan'); logAudit('Policies saved');
  });
  $('#formatRules').addEventListener('click', ()=>{
    try{ const obj = JSON.parse($('#rulesEditor').value); $('#rulesEditor').value = JSON.stringify(obj, null, 2); }catch(e){ showToast('JSON tidak valid'); }
  });
  $('#saveRules').addEventListener('click', ()=>{ try{
    const obj = JSON.parse($('#rulesEditor').value); store.set(K.rules, obj); showToast('Rules disimpan'); logAudit('Rules saved');
  }catch(e){ showToast('JSON tidak valid'); }});

  // ---------- Connectors ----------
  function toggleConnector(id){
    const conns = store.get(K.connectors,[]);
    const c = conns.find(x=>x.id===id); if(!c) return;
    c.status = (c.status==='Connected')?'Disconnected':'Connected';
    store.set(K.connectors, conns); renderConnectors(); renderOverview();
    logAudit(`Connector ${c.name}: ${c.status}`);
  }
  $('#saveWebhook').addEventListener('click', ()=>{
    const cfg = {url: $('#whUrl').value, secret: $('#whSecret').value};
    store.set(K.webhook, cfg); showToast('Endpoint webhook disimpan'); logAudit('Webhook saved');
  });
  $('#sendWebhook').addEventListener('click', ()=>{
    const cfg = store.get(K.webhook,{});
    openModal('Webhook Tes', `<p>Mengirim ke <b>${(cfg.url||'-')}</b> dengan secret <code>${(cfg.secret||'-')}</code></p><p><b>200 OK</b> (MOCK)</p>`);
    logAudit('Webhook test sent (mock)');
  });

  // ---------- Playbooks ----------
  function runPlaybook(id){
    if (id==='pb1'){ showToast('Playbook: Akun Dibajak dijalankan'); logAudit('Playbook pb1 run'); }
    if (id==='pb2'){ showToast('Playbook: Invoice Palsu dijalankan'); logAudit('Playbook pb2 run'); }
    if (id==='pb3'){ showToast('Playbook: Brute Force dijalankan'); logAudit('Playbook pb3 run'); }
    if (id==='pb4'){ showToast('Playbook: Token Pencurian dijalankan'); logAudit('Playbook pb4 run'); }
  }

  // ---------- Audit ----------
  function logAudit(msg){
    const logs = store.get(K.audit,[]); logs.push({ts: nowISO(), msg}); store.set(K.audit, logs); renderAudit();
  }
  function exportJson(arr, name){
    const blob = new Blob([JSON.stringify(arr, null, 2)], {type:'application/json'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name+'.json'; a.click();
  }
  function exportCsv(arr, name){
    const keys = Object.keys(arr[0]||{});
    const rows = [keys.join(','), ...arr.map(o=> keys.map(k=> JSON.stringify(o[k]||'')).join(','))];
    const blob = new Blob([rows.join('\n')], {type:'text/csv'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name+'.csv'; a.click();
  }
  $('#exportLogJson').addEventListener('click', ()=> exportJson(store.get(K.audit,[]),'audit') );
  $('#exportLogCsv').addEventListener('click', ()=> exportCsv(store.get(K.audit,[]),'audit') );

  // ---------- Reports ----------
  $('#reportPeriod').addEventListener('change', renderReport);
  $('#downloadReport').addEventListener('click', ()=>{
    // Print-friendly
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Laporan AEGIS</title>
      <style>body{font:14px/1.5 ui-sans-serif,system-ui;margin:2rem;color:#111} h1{font-size:20px} .sec{margin:1rem 0} table{border-collapse:collapse;width:100%} td,th{border:1px solid #ddd;padding:6px}</style>
      </head><body>
      <h1>Laporan AEGIS (${new Date().toLocaleDateString()})</h1>
      <div class="sec"><h2>Ringkasan</h2>${$('#reportPreview').innerHTML}</div>
      <div class="sec"><h2>Insiden</h2><table><tr><th>ID</th><th>Judul</th><th>Severity</th><th>Status</th></tr>${
        store.get(K.incidents,[]).map(i=>`<tr><td>${i.id}</td><td>${i.title}</td><td>${i.severity}</td><td>${i.status}</td></tr>`).join('')
      }</table></div>
      </body></html>`;
    const w = window.open('','_blank'); w.document.write(html); w.document.close(); w.focus(); w.print();
  });

  // ---------- Keyboard & Theater ----------
  $('#theaterBtn').addEventListener('click', ()=>{
    document.body.classList.toggle('theater');
  });
  document.addEventListener('keydown', (e)=>{
    if (e.key === '.'){
      const users = store.get(K.users,[]);
      const u = users[rnd(users.length)] || {id:'u_cashier', email:'kasir@toko-umkm.id'};
      const acts = ['login_success','login_failed','email_click','invoice_update'];
      const act = acts[rnd(acts.length)];
      ingestEvent({ userId:u.id, userEmail:u.email, ip:'103.'+rnd(200)+'.'+rnd(200)+'.'+rnd(200), country:'ID', deviceId:'dev_'+rnd(9), browser:'Chrome', action:act, resource:'dashboard', context:{geo:{lat:-6.2, lon:106.8}}, riskSignals:['new_ip'] });
    }
  });

  // ---------- SDK Snippet ----------
  const SDK_SNIPPET = `<script>
window.AEGIS = window.AEGIS || {
  sendEvent: (evt) => {
    localStorage.setItem('aegis_event_' + Date.now(), JSON.stringify(evt));
  }
};
</script>
// Contoh:
AEGIS.sendEvent({
  ts: new Date().toISOString(),
  userId: "u_cashier_7",
  userEmail: "kasir@warungberkah.id",
  ip: "185.22.11.90",
  action: "invoice_update",
  resource: "dashboard",
  context: { beneficiary_old: "BCA 123", beneficiary_new: "BCA 124" },
  riskSignals: ["invoice_beneficiary_changed"]
});`;

  // Listen for external SDK events via storage
  window.addEventListener('storage', (e)=>{
    if (e.key && e.key.startsWith('aegis_event_')){
      try { const evt = JSON.parse(e.newValue||'{}'); ingestEvent(evt); } catch(_){}
      localStorage.removeItem(e.key);
    }
  });

  function escapeHtml(s){ return s.replace(/[&<>]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }

  // ---------- Bootstrap ----------
  
function openFeedDetail(evtId){
  const e = store.get(K.events,[]).find(x=>x.id===evtId);
  if(!e){ showToast('Event tidak ditemukan'); return; }
  const geo = e.geo || e.context?.geo;
  const loc = `${e.city||'-'}, ${e.country||''}`;
  const mapEmbed = `<div style="aspect-ratio:16/9;border:1px solid #E5E7EB;border-radius:10px;overflow:hidden">
  <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15838.755287111553!2d110.43812550000001!3d-7.045806349999999!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e708c02787187c9%3A0x29bcf60b2c20aec!2sDiponegoro%20University!5e0!3m2!1sen!2sid!4v1762676415695!5m2!1sen!2sid" width="100%" height="100%" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
  </div>`;
  openModal('Detail Aktivitas', `
    <div class="row" style="gap:.6rem;flex-wrap:wrap">
      <span class="badge-ip">User: ${e.userName||''} ${e.userEmail?`&lt;${e.userEmail}&gt;`:''}</span>
      ${e.userRole?`<span class="badge-ip">Role: ${e.userRole}</span>`:''}
      <span class="badge-ip">IP: ${e.ip||'-'}</span>
      ${e.asn?`<span class="badge-ip">ASN: ${e.asn}</span>`:''}
      ${loc?`<span class="badge-ip">Lokasi: ${loc}</span>`:''}
    </div>
    <div style="margin:.75rem 0">${mapEmbed}</div>
    <div class="card" style="margin-top:.5rem">
      <h4>Ringkasan</h4>
      <ul class="bullets">
        <li>Aksi: ${e.action||'-'}; Resource: ${e.resource||'-'}</li>
        <li>Device: ${e.deviceLabel||e.browser||e.deviceId||'-'}</li>
        <li>Threat Score: ${e.threatScore??'—'}; Sinyal: ${(e.riskSignals||[]).join(', ')||'-'}</li>
        ${geo?`<li>Koordinat: ${geo.lat}, ${geo.lon}</li>`:''}
      </ul>
    </div>
  `);
}
function init(){
    applyRBAC();
    loadPolicies();
    renderOverview(); renderFeed(); renderIncidents(); renderUsers(); renderConnectors(); renderPlaybooks(); renderAudit(); renderReport(); badgeUpdate();
    $('#seedBtn').addEventListener('click', seed);
    $('#reportPeriod').value='weekly';
  
  // Live Feed: delegation for Detail & Incident buttons
  feedEl.addEventListener('click', (ev)=>{
    const row = ev.target.closest('.feed-item'); if(!row) return;
    const btn = ev.target.closest('[data-act]'); if(!btn) return;
    const id = row.getAttribute('data-id');
    const act = btn.getAttribute('data-act');
    if (act==='detail') return openFeedDetail(id);
    if (act==='incident'){
      const e = (store.get(K.events,[])||[]).find(x=>x.id===id);
      if (e){ const inc = createIncident({title:`Manual Incident — ${e.userEmail||e.userId||'-'}`, severity:e.severity||'Med', events:[e], actions:['notify_owner']}); applyActions(inc); }
    }
  });
}

  init();
})();
