/* AEGIS Mockup Interactions — No frameworks */
(() => {
  const $ = (sel, ctx=document) => ctx.querySelector(sel);
  const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));

  // ===== Navbar scroll state =====
  const header = $('.site-header');
  const navMenu = $('#navmenu');
  const navToggle = $('.nav-toggle');
  navToggle?.addEventListener('click', () => {
    const open = navMenu.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(open));
  });
  const onScroll = () => {
    header.classList.toggle('scrolled', window.scrollY > 10);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, {passive:true});

  // ===== Active link highlighting =====
  const navLinks = $$('[data-nav]');
  const sections = navLinks.map(a => $(a.getAttribute('href'))).filter(Boolean);
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(entry => {
      const id = '#' + entry.target.id;
      const link = navLinks.find(l => l.getAttribute('href') === id);
      if (entry.isIntersecting) {
        navLinks.forEach(l => l.classList.remove('active'));
        link?.classList.add('active');
      }
    });
  }, { rootMargin: '-50% 0px -49% 0px', threshold: [0, .01, 1] });
  sections.forEach(sec => io.observe(sec));

  // ===== Modal Demo Scan =====
  const modal = $('#demoModal');
  const openModalBtns = $$('[data-open-modal]');
  const closeModalEls = $$('[data-close-modal]');
  const scanBtn = $('#scanBtn');
  const scanState = $('#scanState');
  const toast = $('#toast');
  let lastFocused = null;

  const focusable = () => $$('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])', modal)
                            .filter(el => !el.hasAttribute('disabled'));
  const trapFocus = (e) => {
    const items = focusable();
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length-1];
    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === first) {
        last.focus(); e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === last) {
        first.focus(); e.preventDefault();
      }
    } else if (e.key === 'Escape') {
      hideModal();
    }
  };

  function showModal(){
    lastFocused = document.activeElement;
    modal.setAttribute('aria-hidden', 'false');
    modal.style.display = 'grid';
    document.body.style.overflow='hidden';
    modal.addEventListener('keydown', trapFocus);
    // focus first focusable
    setTimeout(()=> focusable()[0]?.focus(), 0);
  }
  function hideModal(){
    modal.setAttribute('aria-hidden', 'true');
    modal.style.display = 'none';
    document.body.style.overflow='';
    modal.removeEventListener('keydown', trapFocus);
    lastFocused?.focus();
  }
  openModalBtns.forEach(btn => btn.addEventListener('click', showModal));
  closeModalEls.forEach(el => el.addEventListener('click', hideModal));
  modal.addEventListener('click', (e)=>{
    if (e.target.matches('.modal-backdrop')) hideModal();
  });

  // ===== Scan simulation =====
  const results = [
    { type:'invoice', ok:true, title:'✅ INVOICE ASLI', bullets:['Tanda tangan valid','Supplier dikenal','Metadata sesuai'], tone:'ok' },
    { type:'invoice', ok:false, title:'🚨 INVOICE PALSU!', bullets:['Tanda tangan tidak valid','Rekening tidak cocok','Nomor seri duplikat'], tone:'bad' },
    { type:'email', ok:false, title:'🚨 PHISHING DITEMUKAN!', bullets:['Domain mencurigakan','Tautan berbahaya','SPF/DKIM gagal'], tone:'bad' },
  ];
  function setLoading(){
    scanState.innerHTML = `<div class="skeleton">
      <div class="s-anim"></div><p>Memindai dokumen...</p>
    </div>`;
  }
  function showResult(r){
    scanState.innerHTML = `
      <article class="card ${r.tone==='ok'?'ok':'bad'}">
        <h4>${r.title}</h4>
        <ul>${r.bullets.map(b=>`<li>${b}</li>`).join('')}</ul>
        <div class="row">
          <button class="btn btn-primary" id="recoBtn">Lihat Rekomendasi</button>
        </div>
      </article>
    `;
    $('#recoBtn')?.addEventListener('click', ()=>{
      toast.textContent = 'Rekomendasi dibuka (mock). Lihat tab “Cara Kerja” untuk pencegahan.';
      toast.classList.add('show');
      setTimeout(()=> toast.classList.remove('show'), 2500);
    });
  }
  scanBtn?.addEventListener('click', ()=>{
    setLoading();
    const t = ($('#scanType')?.value || '').toLowerCase().includes('email') ? 'email' : 'invoice';
    // choose a result matching type (bias toward safe)
    const pool = results.filter(r => r.type === t);
    const pick = pool[Math.random() < 0.5 ? 0 : Math.floor(Math.random()*pool.length)];
    setTimeout(()=> showResult(pick), 1600 + Math.random()*500);
  });

  // ===== Tabs =====
  const tabButtons = $$('.tab');
  const panels = $$('.tab-panel');
  tabButtons.forEach(btn => btn.addEventListener('click', ()=>{
    tabButtons.forEach(b=>{ b.classList.remove('active'); b.setAttribute('aria-selected','false'); });
    panels.forEach(p=> p.classList.remove('active'));
    btn.classList.add('active'); btn.setAttribute('aria-selected','true');
    const panel = $('#' + btn.getAttribute('aria-controls'));
    panel?.classList.add('active');
  }));

  // ===== Accordion (single open) =====
  const accBtns = $$('.acc-btn');
  accBtns.forEach((btn,i)=>{
    btn.addEventListener('click', ()=>{
      accBtns.forEach(b=>{
        const expanded = b === btn ? !(b.getAttribute('aria-expanded')==='true') : false;
        b.setAttribute('aria-expanded', expanded);
        const panel = $('#' + b.getAttribute('aria-controls'));
        if (panel) panel.hidden = !expanded;
      });
    });
  });

  // ===== Counters on view =====
  const nums = $$('.num');
  let countersStarted = false;
  const io2 = new IntersectionObserver((entries) => {
    if (countersStarted) return;
    entries.forEach(e => {
      if (e.isIntersecting) {
        countersStarted = true;
        nums.forEach(el => animateCount(el, parseInt(el.dataset.count,10)));
        io2.disconnect();
      }
    });
  }, {rootMargin:'-20% 0px -20% 0px'});
  const dampak = $('#dampak');
  if (dampak) io2.observe(dampak);
  function animateCount(el, to){
    const start = 0;
    const dur = 1200;
    const t0 = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - t0)/dur);
      const val = Math.round(start + (to-start) * (p*p*(3-2*p))); // easeInOut
      el.textContent = val + (to>100 ? '' : (el.dataset.count==='5' ? ' ' : '%'));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // ===== Contact form (light validation) =====
  $('.contact')?.addEventListener('submit', (e)=>{
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const ok = [...fd.values()].every(v => String(v).trim().length > 1);
    toast.textContent = ok ? 'Terima kasih! Kami akan menghubungi Anda.' : 'Harap lengkapi form dengan benar.';
    toast.classList.add('show');
    setTimeout(()=> toast.classList.remove('show'), 2500);
  });

  // Year
  $('#year').textContent = new Date().getFullYear();
})();
