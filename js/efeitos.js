/* EFEITOS · camada de cinema e interação.
   Carrega antes de site.js e expõe window.Efeitos (acento por capítulo, linhas de velocidade, modo automático).
   Nada aqui é necessário para ler o conteúdo; sem JavaScript o site continua inteiro. */
(function () {
  'use strict';

  var html = document.documentElement;
  var reduzir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fino = window.matchMedia('(pointer: fine)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var raf = window.requestAnimationFrame.bind(window);

  var Efeitos = window.Efeitos = {};

  /* ---------- cor de acento por capítulo ---------- */
  var CORES = { cena: '#7db4ff', leave: '#ffc27a', unknown: '#a78bfa', humanity: '#6fe0d0', frontier: '#ff8a5c', site: '#7db4ff' };
  var atual = '', capitulo = 'cena', naZonaSite = false;
  function aplica(k) {
    if (!CORES[k] || k === atual) return;
    atual = k;
    html.style.setProperty('--dyn', CORES[k]);
  }
  Efeitos.acento = function (k) { capitulo = k; if (!naZonaSite) aplica(k); };   // chamado a cada capítulo
  Efeitos.zona = function (site) { naZonaSite = site; aplica(site ? 'site' : capitulo); };

  /* ---------- molduras de visor nas cenas de vídeo ---------- */
  ['.palco', '.leave-palco', '.neb-palco', '.fro-palco'].forEach(function (sel) {
    $$(sel).forEach(function (p) {
      var m = document.createElement('div');
      m.className = 'moldura'; m.setAttribute('aria-hidden', 'true');
      p.appendChild(m);
    });
  });

  /* ---------- cursor próprio, botões magnéticos e cards em 3D (só com mouse) ---------- */
  if (fino && !reduzir) {
    var ponto = document.createElement('div'); ponto.className = 'cursor-ponto';
    var anel = document.createElement('div'); anel.className = 'cursor-anel';
    anel.innerHTML = '<span class="cursor-rotulo"></span>';
    var rotulo = anel.firstChild;
    ponto.setAttribute('aria-hidden', 'true'); anel.setAttribute('aria-hidden', 'true');
    document.body.appendChild(ponto); document.body.appendChild(anel);

    var mx = 0, my = 0, ax = 0, ay = 0, visivel = false, pend = false;
    var segue = function () {
      pend = false;
      ax += (mx - ax) * 0.22; ay += (my - ay) * 0.22;
      anel.style.transform = 'translate3d(' + ax.toFixed(1) + 'px,' + ay.toFixed(1) + 'px,0)';
      if (Math.abs(mx - ax) > 0.3 || Math.abs(my - ay) > 0.3) { pend = true; raf(segue); }
    };
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      mx = e.clientX; my = e.clientY;
      ponto.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0)';
      if (!visivel) {
        visivel = true; ax = mx; ay = my;
        ponto.style.opacity = '1'; anel.style.opacity = '1';
        html.classList.add('cursor-on');
      }
      if (!pend) { pend = true; raf(segue); }
    }, { passive: true });
    document.addEventListener('pointerleave', function () {
      visivel = false; ponto.style.opacity = '0'; anel.style.opacity = '0'; html.classList.remove('cursor-on');
    });
    // estados do anel: link/botão e card com rótulo
    $$('.card--missao').forEach(function (c) { c.setAttribute('data-cursor', 'Ver'); });
    document.addEventListener('pointerover', function (e) {
      var t = e.target.closest ? e.target.closest('a,button,summary,[data-cursor]') : null;
      var r = t && t.closest('[data-cursor]');
      anel.classList.toggle('rotulo', !!r);
      anel.classList.toggle('link', !!t && !r);
      if (r) rotulo.textContent = r.getAttribute('data-cursor');
    });

    // botões magnéticos
    var imas = $$('.btn--primario,.btn--secundario,.topo-cta,.tour');
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      imas.forEach(function (el) {
        var r = el.getBoundingClientRect();
        var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        var dx = e.clientX - cx, dy = e.clientY - cy;
        var d = Math.sqrt(dx * dx + dy * dy), raio = Math.max(r.width, r.height) * 0.9 + 30;
        if (d < raio) {
          el.style.transform = 'translate3d(' + (dx * 0.22).toFixed(1) + 'px,' + (dy * 0.3).toFixed(1) + 'px,0)';
          el.dataset.ima = '1';
        } else if (el.dataset.ima) {
          el.style.transform = ''; delete el.dataset.ima;
        }
      });
    }, { passive: true });

    // cards inclinam em 3D e a foto desliza no sentido contrário
    $$('.card--missao').forEach(function (c) {
      var img = $('.card-media img', c);
      var cp = 0;
      c.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse') return;
        var r = c.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        if (cp) return;
        cp = raf(function () {
          cp = 0;
          c.classList.add('inclina');
          c.style.transform = 'perspective(1000px) rotateX(' + (-py * 5).toFixed(2) + 'deg) rotateY(' + (px * 6).toFixed(2) + 'deg) translateZ(0)';
          if (img) img.style.translate = (-px * 14).toFixed(1) + 'px ' + (-py * 10).toFixed(1) + 'px';
        });
      });
      c.addEventListener('pointerleave', function () {
        c.style.transform = ''; c.classList.remove('inclina');
        if (img) img.style.translate = '';
      });
    });
  }

  /* ---------- faixas gigantes + manifesto, movidos pela rolagem ---------- */
  var linhas = $$('.faixa-linha');
  var manifesto = $('#manifesto');
  var palavras = [];
  var txt = $('#manifesto-txt');
  if (txt) {
    var fortes = (txt.getAttribute('data-fortes') || '').split('|');
    var partes = txt.textContent.trim().split(/\s+/);
    txt.setAttribute('aria-label', txt.textContent.trim());
    txt.textContent = '';
    partes.forEach(function (w, i) {
      var s = document.createElement('span');
      s.className = 'pal' + (fortes.indexOf(w.replace(/[.,?!]/g, '')) >= 0 ? ' forte' : '');
      s.textContent = w; s.setAttribute('aria-hidden', 'true');
      txt.appendChild(s);
      if (i < partes.length - 1) txt.appendChild(document.createTextNode(' '));
      palavras.push(s);
    });
  }
  var ultimoY = window.pageYOffset || 0, vel = 0, pendS = false;
  function frame() {
    pendS = false;
    var y = window.pageYOffset || 0;
    var v = y - ultimoY; ultimoY = y;
    vel = vel * 0.8 + v * 0.2;
    var skew = clamp(vel * 0.35, -9, 9);
    if (!reduzir) linhas.forEach(function (l, i) {
      var dir = i % 2 ? 1 : -1;
      var meio = l.scrollWidth / 2 || 1;
      var x = ((y * 0.45 * dir) % meio);
      if (dir > 0) x -= meio;
      l.style.transform = 'translate3d(' + x.toFixed(1) + 'px,0,0) skewX(' + (-skew * dir).toFixed(2) + 'deg)';
    });
    if (manifesto && palavras.length && !html.classList.contains('sem-mov')) {
      var r = manifesto.getBoundingClientRect();
      var total = Math.max(1, r.height - window.innerHeight);
      var p = clamp(-r.top / total, 0, 1);
      var alvo = clamp((p - 0.06) / 0.78, 0, 1) * (palavras.length + 1);
      for (var k = 0; k < palavras.length; k++) palavras[k].classList.toggle('on', k < alvo);
    }
    if (Math.abs(vel) > 0.2) { pendS = true; raf(frame); }
  }
  window.addEventListener('scroll', function () { if (!pendS) { pendS = true; raf(frame); } }, { passive: true });
  window.addEventListener('resize', function () { raf(frame); });
  raf(frame);

  /* ---------- linhas de velocidade (capítulo 02) ---------- */
  var lc = null, lctx = null, streaks = [];
  function criaLinhas() {
    var palco = $('.leave-palco');
    if (!palco || reduzir) return;
    lc = document.createElement('canvas');
    lc.className = 'leave-linhas'; lc.setAttribute('aria-hidden', 'true');
    palco.insertBefore(lc, palco.querySelector('.leave-sombra'));
    lctx = lc.getContext('2d');
    var medir = function () {
      lc.width = Math.round(window.innerWidth * 0.75); lc.height = Math.round(window.innerHeight * 0.75);
      streaks = [];
      var n = window.innerWidth < 700 ? 26 : 54;
      for (var i = 0; i < n; i++) {
        var lado = Math.random();
        // longe do centro: o foguete e o título ficam livres
        var x = lado < 0.5 ? Math.random() * 0.30 : 0.70 + Math.random() * 0.30;
        streaks.push({ x: x * lc.width, y: Math.random(), l: 40 + Math.random() * 150, v: 0.6 + Math.random() * 1.8, a: 0.08 + Math.random() * 0.22 });
      }
    };
    medir();
    window.addEventListener('resize', medir);
  }
  criaLinhas();
  var forca = function (p) { return clamp((p - 0.06) / 0.2, 0, 1) * (1 - clamp((p - 0.6) / 0.28, 0, 1)); };
  Efeitos.leave = function (p) {
    if (!lc) return;
    var f = forca(p);
    lc.style.opacity = f.toFixed(3);
    if (f < 0.02) return;
    var W = lc.width, H = lc.height;
    lctx.clearRect(0, 0, W, H);
    for (var i = 0; i < streaks.length; i++) {
      var s = streaks[i];
      var y = ((s.y * (H + s.l) + p * H * s.v * 7) % (H + s.l)) - s.l;
      var g = lctx.createLinearGradient(0, y, 0, y + s.l);
      g.addColorStop(0, 'rgba(200,225,255,0)');
      g.addColorStop(1, 'rgba(210,230,255,' + s.a.toFixed(3) + ')');
      lctx.fillStyle = g;
      lctx.fillRect(s.x, y, 1.2, s.l);
    }
  };

  /* ---------- modo automático: rola o site sozinho em ritmo de cinema ---------- */
  var botao = $('#tour');
  var tourAtivo = false, tourRaf = 0, tourT = 0, tourY = 0;
  function zonaVideo(y) {
    var ids = ['cena', 'leave', 'afastar', 'saturno', 'frontier'];
    for (var i = 0; i < ids.length; i++) {
      var el = document.getElementById(ids[i]);
      if (!el) continue;
      var t = el.getBoundingClientRect().top + window.pageYOffset;
      if (y >= t && y < t + el.offsetHeight) return true;
    }
    return false;
  }
  function paraTour() {
    tourAtivo = false;
    if (tourRaf) cancelAnimationFrame(tourRaf);
    tourRaf = 0;
    if (botao) { botao.setAttribute('aria-pressed', 'false'); $('span', botao).textContent = 'Automático'; }
    html.classList.remove('modo-tour');
  }
  function passoTour(t) {
    if (!tourAtivo) return;
    var dt = Math.min(0.05, (t - tourT) / 1000); tourT = t;
    var vel = zonaVideo(tourY) ? 300 : 620;                 // px por segundo: vídeos mais devagar
    tourY += vel * dt;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    if (tourY >= max) { window.scrollTo({ top: max, behavior: 'instant' }); paraTour(); return; }
    window.scrollTo({ top: tourY, behavior: 'instant' });
    tourRaf = raf(passoTour);
  }
  function iniciaTour() {
    tourAtivo = true; tourY = window.pageYOffset || 0; tourT = performance.now();
    html.classList.add('modo-tour');
    if (botao) { botao.setAttribute('aria-pressed', 'true'); $('span', botao).textContent = 'Parar'; }
    tourRaf = raf(passoTour);
  }
  Efeitos.tour = function () { if (tourAtivo) paraTour(); else iniciaTour(); };
  if (botao) botao.addEventListener('click', Efeitos.tour);
  // qualquer gesto da pessoa interrompe o modo automático
  ['wheel', 'touchstart', 'keydown'].forEach(function (ev) {
    window.addEventListener(ev, function (e) {
      if (!tourAtivo) return;
      if (ev === 'keydown' && (e.key === 'h' || e.key === 'H' || e.key === 't' || e.key === 'T')) return;
      paraTour();
    }, { passive: true });
  });
  // atalhos para quem grava: T liga/desliga o modo automático, H esconde a interface
  window.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var alvo = e.target && e.target.tagName;
    if (alvo === 'INPUT' || alvo === 'TEXTAREA') return;
    if (e.key === 't' || e.key === 'T') Efeitos.tour();
    if (e.key === 'h' || e.key === 'H') html.classList.toggle('modo-limpo');
  });
})();
