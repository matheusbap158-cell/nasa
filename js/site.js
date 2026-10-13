/* Capítulos 02 a 05, campo de estrelas, navegação e revelações.
   O capítulo 01 (vídeo na rolagem) está em cena.js; as cenas de vídeo dos demais, em scrub.js.
   Tudo aqui degrada para uma página estática se o gsap não carregar ou se a pessoa pedir movimento reduzido. */
(function () {
  'use strict';

  var html = document.documentElement;
  var reduzir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
  var anima = !!(gsap && ScrollTrigger && window.CenaVideo) && !reduzir;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var por = function (p, a, b) { return clamp((p - a) / (b - a), 0, 1); };

  if (!anima) html.classList.add('sem-mov');

  /* ---------- campo de estrelas (canvas leve, desenhado só quando algo muda) ---------- */
  var reduzirEstrelas = reduzir;
  var Estrelas = (function () {
    var cv = document.getElementById('estrelas');
    if (!cv || !cv.getContext) return { opacidade: function () {} };
    var ctx = cv.getContext('2d');
    var W = 0, H = 0, dpr = 1, lista = [], op = 0, pendente = false;
    var warp = 0, ultimoY = window.pageYOffset || 0, ultimoT = performance.now();
    var CORES = ['#ffffff', '#ffffff', '#ffffff', '#cfe0ff', '#9ec2ff', '#ffe3bd'];

    function gerar() {
      var n = clamp(Math.round(W * H / 8500), 90, 280);
      lista = [];
      for (var i = 0; i < n; i++) {
        var z = Math.pow(Math.random(), 1.6);              // poucas estrelas "próximas", muitas distantes
        lista.push({
          x: Math.random() * W, y: Math.random() * H, z: z,
          r: 0.35 + z * 1.15, a: 0.3 + z * 0.7,
          c: CORES[(Math.random() * CORES.length) | 0]
        });
      }
    }
    function medir() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      W = window.innerWidth; H = window.innerHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      gerar();
      pedir();
    }
    function desenhar() {
      pendente = false;
      ctx.clearRect(0, 0, W, H);
      if (op <= 0.01) return;
      var sy = window.pageYOffset || 0;
      var risca = warp > 0.6;
      for (var i = 0; i < lista.length; i++) {
        var s = lista[i];
        var y = (s.y - sy * (0.04 + s.z * 0.34)) % H;
        if (y < 0) y += H;
        ctx.globalAlpha = op * s.a;
        if (risca) {
          // rastro vertical proporcional à velocidade e à "proximidade" da estrela
          var len = Math.min(70, warp * (0.6 + s.z * 2.4));
          ctx.strokeStyle = s.c;
          ctx.lineWidth = Math.max(0.6, s.r * 0.9);
          ctx.beginPath(); ctx.moveTo(s.x, y); ctx.lineTo(s.x, y + len * (dir >= 0 ? 1 : -1)); ctx.stroke();
        } else {
          ctx.fillStyle = s.c;
          if (s.r < 0.9) ctx.fillRect(s.x, y, s.r * 1.6, s.r * 1.6);
          else { ctx.beginPath(); ctx.arc(s.x, y, s.r, 0, 6.2832); ctx.fill(); }
        }
      }
      ctx.globalAlpha = 1;
      // o rastro some sozinho, em poucos quadros, depois que a rolagem para
      if (warp > 0.6) { warp *= 0.86; pedir(); } else { warp = 0; }
    }
    function pedir() {
      if (pendente) return;
      pendente = true;
      window.requestAnimationFrame(desenhar);
    }
    medir();
    window.addEventListener('resize', function () {
      if (Math.abs(window.innerWidth - W) > 40 || Math.abs(window.innerHeight - H) > 120) medir();
    });
    var dir = 1;
    window.addEventListener('scroll', function () {
      var y = window.pageYOffset || 0, t = performance.now();
      var dt = Math.max(8, t - ultimoT);
      var v = Math.abs(y - ultimoY) / dt * 16;        // px por quadro de 16 ms
      if (y !== ultimoY) dir = y > ultimoY ? 1 : -1;
      ultimoY = y; ultimoT = t;
      if (!reduzirEstrelas) warp = Math.max(warp, Math.min(48, v * 0.9));
      pedir();
    }, { passive: true });
    return {
      opacidade: function (v) { v = clamp(v, 0, 1); if (Math.abs(v - op) > 0.004) { op = v; pedir(); } }
    };
  })();

  /* ---------- navegação ---------- */
  var topo = $('#topo');
  function atualizaTopo() {
    var limite = Math.max(260, window.innerHeight * 0.9);
    topo.classList.toggle('on', (window.pageYOffset || 0) > limite || html.classList.contains('sem-mov') && (window.pageYOffset || 0) > 80);
  }
  window.addEventListener('scroll', atualizaTopo, { passive: true });
  atualizaTopo();

  // seções do capítulo 03 contam como o mesmo item do menu
  var CAP = { cena: 'cena', leave: 'leave', unknown: 'unknown', afastar: 'unknown', saturno: 'unknown', humanity: 'humanity', manifesto: 'humanity', frontier: 'frontier' };
  var ids = Object.keys(CAP);
  var NOMES = {
    cena: ['01', 'Ignição'], leave: ['02', 'Deixe a Terra'], unknown: ['03', 'Rumo ao desconhecido'],
    humanity: ['04', 'A humanidade além da Terra'], frontier: ['05', 'A próxima fronteira']
  };
  var capNum = $('#cap-num'), capNome = $('#cap-nome');
  function marcaCap(id) {
    var c = CAP[id];
    $$('.pontos a').forEach(function (a) { a.setAttribute('aria-current', a.dataset.cap === c ? 'true' : 'false'); });
    if (capNum && NOMES[c]) { capNum.textContent = NOMES[c][0]; capNome.textContent = NOMES[c][1]; }
    if (window.Efeitos) window.Efeitos.acento(c);
  }
  if ('IntersectionObserver' in window) {
    var visiveis = {};
    var obsCap = new IntersectionObserver(function (es) {
      es.forEach(function (e) { visiveis[e.target.id] = e.intersectionRatio; });
      var melhor = null, mv = 0;
      ids.forEach(function (id) { if ((visiveis[id] || 0) > mv) { mv = visiveis[id]; melhor = id; } });
      if (melhor) marcaCap(melhor);
    }, { threshold: [0, 0.05, 0.15, 0.3, 0.5, 0.75, 1], rootMargin: '-40% 0px -40% 0px' });
    ids.forEach(function (id) { var el = document.getElementById(id); if (el) obsCap.observe(el); });
  }

  /* ---------- revelações simples ---------- */
  var rvs = $$('.rv');
  if ('IntersectionObserver' in window && !html.classList.contains('sem-mov')) {
    var obs = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('on'); obs.unobserve(e.target); } });
    }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
    rvs.forEach(function (el) { obs.observe(el); });
  } else {
    rvs.forEach(function (el) { el.classList.add('on'); });
  }

  var leave = $('#leave');
  var afastar = $('#afastar');
  var saturno = $('#saturno');
  var frontier = $('#frontier');

  var ARQ = {
    subida: { desktop: 'assets/video/subida.mp4', mobile: 'assets/video/subida-m.mp4' },
    afastar: { desktop: 'assets/video/afastar.mp4', mobile: 'assets/video/afastar-m.mp4' },
    saturno: { desktop: 'assets/video/saturno.mp4', mobile: 'assets/video/saturno-m.mp4' },
    marte: { desktop: 'assets/video/marte.mp4', mobile: 'assets/video/marte-m.mp4' }
  };

  if (!anima) {
    // sem rolagem controlada: estado final do capítulo 02 (órbita, 420 km) e vídeos com controles
    Estrelas.opacidade(1);
    var seg = document.getElementById('fro-seguir');
    if (seg) seg.classList.add('on');
    var n = document.getElementById('alt-num');
    if (n) n.textContent = '420';
    $$('.alt-nota').forEach(function (el, k) { el.classList.toggle('on', k === 2); });
    if (window.CenaVideo) {
      window.CenaVideo({ secao: afastar, video: $('#v-afastar'), desktop: ARQ.afastar.desktop, mobile: ARQ.afastar.mobile }).reproduzivel();
      window.CenaVideo({ secao: saturno, video: $('#v-saturno'), desktop: ARQ.saturno.desktop, mobile: ARQ.saturno.mobile }).reproduzivel();
      window.CenaVideo({ secao: frontier, video: $('#v-marte'), desktop: ARQ.marte.desktop, mobile: ARQ.marte.mobile }).reproduzivel();
    }
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  // a posição do vídeo segue o relógio real, mesmo em aparelhos lentos (sem "câmera lenta" do gsap)
  gsap.ticker.lagSmoothing(0);

  // enquanto uma cena de vídeo cobre a tela inteira, o campo de estrelas e a névoa não precisam ser pintados
  var cobrindo = 0;
  [$('#cena'), leave, afastar, saturno, frontier].forEach(function (secao) {
    ScrollTrigger.create({
      trigger: secao, start: 'top top', end: 'bottom bottom',
      onToggle: function (self) { cobrindo = Math.max(0, cobrindo + (self.isActive ? 1 : -1)); html.classList.toggle('cena-cobre', cobrindo > 0); }
    });
  });

  /* ---------- estrelas: aparecem quando as cenas de vídeo deixam de cobrir a tela ---------- */
  function estrelasPorRolagem() {
    var topoAbs = leave.getBoundingClientRect().top + (window.pageYOffset || 0);
    Estrelas.opacidade((window.pageYOffset || 0) > topoAbs ? 1 : 0);
  }
  window.addEventListener('scroll', estrelasPorRolagem, { passive: true });
  window.addEventListener('resize', estrelasPorRolagem);
  estrelasPorRolagem();

  /* ---------- utilitários ---------- */
  // títulos por máscara (linhas que sobem)
  function titulo(sel, gatilho, inicio) {
    var linhas = $$(sel + ' .ln>span');
    if (!linhas.length) return;
    gsap.set(linhas, { yPercent: 108 });
    ScrollTrigger.create({
      trigger: gatilho, start: inicio || 'top 70%', once: true,
      onEnter: function () { gsap.to(linhas, { yPercent: 0, duration: 1.1, ease: 'power3.out', stagger: 0.12 }); }
    });
  }
  // posição suavizada da rolagem (o gsap só roda enquanto há tween)
  function suave(proxy, alvo, fn) {
    gsap.to(proxy, { p: alvo, duration: 0.3, ease: 'power2.out', overwrite: true, onUpdate: function () { fn(proxy.p); } });
  }
  // legenda "Agora em vista": troca o texto conforme uma placa passa pelo centro
  function legendaViva(txtEl) {
    var atual = '';
    return function (t) {
      if (t === atual) return;
      atual = t;
      txtEl.classList.add('troca');
      setTimeout(function () { txtEl.textContent = t; txtEl.classList.remove('troca'); }, 180);
    };
  }
  // placas: profundidade (cada uma anda numa velocidade) + entrada + legenda
  function placas(raiz, fala) {
    $$('.placa', raiz).forEach(function (p) {
      var v = parseFloat(p.dataset.v) || 0.7;
      gsap.fromTo(p, { y: window.innerHeight * 0.22 * v }, {
        y: -window.innerHeight * 0.22 * v, ease: 'none',
        scrollTrigger: { trigger: p, start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true }
      });
      gsap.fromTo(p.querySelector('img'), { opacity: 0 }, {
        opacity: 1, ease: 'none',
        scrollTrigger: { trigger: p, start: 'top 94%', end: 'top 62%', scrub: true }
      });
      ScrollTrigger.create({
        trigger: p, start: 'top 58%', end: 'bottom 42%',
        onToggle: function (self) { if (self.isActive && p.dataset.txt) fala(p.dataset.txt); }
      });
    });
  }

  // fundo de cada cena emerge do vazio ao entrar e volta a ele ao sair (sem corte seco entre cenas)
  function bordas(secao, onde, opc) {
    opc = opc || {};
    if (opc.topo !== false) {
      var t = document.createElement('div');
      t.className = 'borda borda--topo'; t.setAttribute('aria-hidden', 'true');
      onde.appendChild(t);
      gsap.fromTo(t, { opacity: 1 }, {
        opacity: 0, ease: 'none',
        scrollTrigger: {
          trigger: secao, scrub: true, invalidateOnRefresh: true, start: 'top top',
          end: function () { return '+=' + Math.round(window.innerHeight * 0.6); }
        }
      });
    }
    if (opc.base !== false) {
      var b = document.createElement('div');
      b.className = 'borda borda--base'; b.setAttribute('aria-hidden', 'true');
      onde.appendChild(b);
      gsap.fromTo(b, { opacity: 0 }, {
        opacity: 1, ease: 'none',
        scrollTrigger: {
          trigger: secao, scrub: true, invalidateOnRefresh: true,
          start: function () { return 'bottom bottom+=' + Math.round(window.innerHeight * 0.75); },
          end: 'bottom bottom'
        }
      });
    }
  }
  bordas(leave, $('.leave-palco'), { topo: false });                 // o topo do 02 já nasce do azul-noite do 01
  bordas($('#unknown'), $('#unknown .unk-fixo'), { base: false });  // a Terra à noite emerge do escuro
  bordas(afastar, $('#afastar .neb-palco'));
  bordas(saturno, $('#saturno .neb-palco'));
  bordas(frontier, $('.fro-palco'), { base: false });               // o fim de Marte já tem o próprio fade

  /* ---------- 02 · Deixe a Terra: o vídeo da subida + altitude + nascer do sol ---------- */
  (function () {
    var altNum = $('#alt-num');
    var notas = $$('.alt-nota');
    var cred = $('#leave-cred');
    var orbita = $('#orbita');
    var entra = $('#leave-entra');
    var vazio = $('#leave-vazio');
    var notaAtual = -1, altUltimo = -1;
    var cena = window.CenaVideo({ secao: leave, video: $('#v-subida'), desktop: ARQ.subida.desktop, mobile: ARQ.subida.mobile });

    titulo('.leave-topo', '#leave', 'top 72%');

    function alt(vp) {
      var km = Math.round(420 * Math.pow(vp, 1.9));
      if (km !== altUltimo) { altUltimo = km; altNum.textContent = String(km); }
      var i = km < 50 ? 0 : km < 300 ? 1 : 2;
      if (i !== notaAtual) {
        notaAtual = i;
        notas.forEach(function (el, k) { el.classList.toggle('on', k === i); });
      }
    }
    function atualiza(p) {
      var vp = clamp(p / 0.84, 0, 1);              // 84% da rolagem: a subida; o resto: nascer do sol
      cena.definir(vp);
      alt(vp);
      var o = por(p, 0.84, 0.98);
      orbita.style.opacity = o.toFixed(3);
      orbita.style.transform = 'scale(' + (1.14 - 0.14 * o).toFixed(4) + ')';
      cred.classList.toggle('on', p > 0.9);
      if (window.Efeitos) window.Efeitos.leave(p);
      entra.style.opacity = (1 - por(p, 0.02, 0.16)).toFixed(3);
      vazio.style.opacity = (por(p, 0.18, 0.8) * 0.95).toFixed(3);
    }
    var proxy = { p: 0 };
    ScrollTrigger.create({
      trigger: leave, start: 'top top', end: 'bottom bottom', invalidateOnRefresh: true,
      onUpdate: function (self) { suave(proxy, self.progress, atualiza); }
    });
    atualiza(0);
  })();

  /* ---------- 03a · Rumo ao desconhecido: última vista, Lua e eclipse ---------- */
  (function () {
    var unk = $('#unknown');
    var ticker = $('#ticker');
    var fala = legendaViva($('#ticker-txt'));

    titulo('.unk-titulo', '#unknown', function () { return 'top+=' + Math.round(window.innerHeight * 0.85) + ' top'; });

    // a última vista de casa se afasta e dá lugar ao título
    var fase = function () { return window.innerHeight * 1.35; };
    gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: unk, start: 'top top', end: function () { return '+=' + fase(); }, scrub: true, invalidateOnRefresh: true,
        onUpdate: function (self) { ticker.classList.toggle('on', self.progress > 0.7); }
      }
    })
      .fromTo('#ultima img', { scale: 1 }, { scale: 1.22, duration: 1 }, 0)
      .to('#ultima', { opacity: 0, duration: 0.4 }, 0.6)
      .fromTo('#unk-titulo-box', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.35 }, 0.62);

    placas($('#unk-placas'), fala);
    fala('Sistema Terra–Lua');
  })();

  /* ---------- 03b e 03c · A Terra fica pequena e a sonda diante de Saturno: vídeos na rolagem ---------- */
  [[afastar, '#v-afastar', ARQ.afastar], [saturno, '#v-saturno', ARQ.saturno]].forEach(function (c) {
    var secao = c[0];
    var cena = window.CenaVideo({ secao: secao, video: $(c[1]), desktop: c[2].desktop, mobile: c[2].mobile });
    var proxy = { p: 0 };
    ScrollTrigger.create({
      trigger: secao, start: 'top top', end: 'bottom bottom', invalidateOnRefresh: true,
      onUpdate: function (self) { suave(proxy, self.progress, function (p) { cena.definir(p); }); }
    });
    var texto = $('.neb-texto', secao);
    gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: secao, start: 'top top', end: 'bottom bottom', scrub: true, invalidateOnRefresh: true }
    })
      .fromTo(texto, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.1 }, 0.04)
      .to(texto, { opacity: 0, y: -20, duration: 0.1 }, 0.84)
      .to({}, { duration: 0 }, 1);
  });

  /* ---------- 04 · A humanidade além da Terra ---------- */
  (function () {
    $$('.hp img').forEach(function (img) {
      gsap.fromTo(img, { yPercent: -6, scale: 1.14 }, {
        yPercent: 6, scale: 1.14, ease: 'none',
        scrollTrigger: { trigger: img.closest('.hp'), start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
    gsap.fromTo('.hum-fundo', { xPercent: 4 }, {
      xPercent: -10, ease: 'none',
      scrollTrigger: { trigger: '#humanity', start: 'top bottom', end: 'bottom top', scrub: true }
    });
  })();

  /* ---------- 05 · A próxima fronteira: aproximação de Marte ---------- */
  (function () {
    var cena = window.CenaVideo({ secao: frontier, video: $('#v-marte'), desktop: ARQ.marte.desktop, mobile: ARQ.marte.mobile });
    var proxy = { p: 0 };
    ScrollTrigger.create({
      trigger: frontier, start: 'top top', end: 'bottom bottom', invalidateOnRefresh: true,
      onUpdate: function (self) { suave(proxy, self.progress, function (p) { cena.definir(clamp(p / 0.78, 0, 1)); }); }
    });
    gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: frontier, start: 'top top', end: 'bottom bottom', scrub: true, invalidateOnRefresh: true }
    })
      .fromTo('#fro-texto', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.16 }, 0.6)
      .fromTo('#fro-leg', { opacity: 0 }, { opacity: 1, duration: 0.12 }, 0.74)
      .fromTo('#fro-fade', { opacity: 0 }, { opacity: 1, duration: 0.14 }, 0.86)
      .to({}, { duration: 0 }, 1);
    ScrollTrigger.create({
      trigger: frontier, start: 'top top', end: 'bottom bottom',
      onUpdate: function (self) { $('#fro-seguir').classList.toggle('on', self.progress > 0.88); }
    });
  })();

  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
