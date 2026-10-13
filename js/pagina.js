/* Comportamento do "site" em volta da jornada: menu, barra de progresso, destaque de seção atual,
   spotlight dos cards, contadores, linha do tempo e acordeão. Nada aqui é necessário para ler o conteúdo:
   sem JavaScript, tudo continua visível e navegável. */
(function () {
  'use strict';

  var html = document.documentElement;
  var reduzir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  var topo = $('#topo');

  /* ---------- barra de progresso da página (no cabeçalho) ---------- */
  var barra = $('#topo-prog');
  var pendente = false;
  function progresso() {
    pendente = false;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var p = max > 0 ? clamp((window.pageYOffset || 0) / max, 0, 1) : 0;
    if (barra) barra.style.transform = 'scaleX(' + p.toFixed(4) + ')';
  }
  var secMissoes = document.getElementById('missoes');
  function zona() {
    if (!secMissoes) return;
    var site = secMissoes.getBoundingClientRect().top < window.innerHeight * 0.6;
    if (site !== topo.classList.contains('zona-site')) {
      topo.classList.toggle('zona-site', site);
      if (window.Efeitos) window.Efeitos.zona(site);
    }
  }
  window.addEventListener('scroll', function () {
    if (!pendente) { pendente = true; window.requestAnimationFrame(function () { progresso(); zona(); }); }
  }, { passive: true });
  window.addEventListener('resize', progresso);
  progresso();

  /* ---------- menu no celular ---------- */
  var botao = $('#topo-menu');
  function menu(abrir) {
    topo.classList.toggle('menu-aberto', abrir);
    botao.setAttribute('aria-expanded', abrir ? 'true' : 'false');
    botao.textContent = abrir ? 'Fechar' : 'Menu';
  }
  if (botao) {
    botao.addEventListener('click', function () { menu(!topo.classList.contains('menu-aberto')); });
    $$('#topo-nav a').forEach(function (a) { a.addEventListener('click', function () { menu(false); }); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && topo.classList.contains('menu-aberto')) { menu(false); botao.focus(); }
    });
  }

  /* ---------- seção atual no menu + oculta o rótulo de capítulo fora da jornada ---------- */
  var SECOES = ['missoes', 'linha', 'numeros', 'perguntas', 'contato'];
  if ('IntersectionObserver' in window) {
    var vis = {};
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { vis[e.target.id] = e.isIntersecting ? e.intersectionRatio : 0; });
      var atual = null, mv = 0;
      SECOES.forEach(function (id) { if ((vis[id] || 0) > mv) { mv = vis[id]; atual = id; } });
      // dentro da jornada, o item "Jornada" fica marcado
      var naJornada = !atual;
      $$('#topo-nav a[data-sec]').forEach(function (a) {
        var id = a.dataset.sec;
        a.setAttribute('aria-current', (naJornada ? id === 'cena' : id === atual) ? 'true' : 'false');
      });
    }, { threshold: [0, 0.1, 0.25, 0.5, 0.75], rootMargin: '-35% 0px -35% 0px' });
    SECOES.forEach(function (id) { var el = document.getElementById(id); if (el) io.observe(el); });
  }

  /* ---------- spotlight dos cards (segue o cursor) ---------- */
  if (!reduzir && window.matchMedia('(pointer:fine)').matches) {
    $$('.card').forEach(function (c) {
      c.addEventListener('pointermove', function (e) {
        var r = c.getBoundingClientRect();
        c.style.setProperty('--mx', (e.clientX - r.left).toFixed(0) + 'px');
        c.style.setProperty('--my', (e.clientY - r.top).toFixed(0) + 'px');
      });
    });
  }

  /* ---------- contadores ---------- */
  var fmt = new Intl.NumberFormat('pt-BR');
  function escreve(el, v) {
    var dec = parseInt(el.dataset.dec || '0', 10);
    var txt = dec ? v.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec }) : fmt.format(Math.round(v));
    el.textContent = (el.dataset.prefixo || '') + txt;
  }
  var contadores = $$('.stat-num b[data-alvo]');
  function conta(el) {
    var alvo = parseFloat(el.dataset.alvo);
    if (reduzir) { escreve(el, alvo); return; }
    var t0 = performance.now(), dur = 1500;
    (function passo(t) {
      var k = clamp((t - t0) / dur, 0, 1);
      var e = 1 - Math.pow(1 - k, 3);
      escreve(el, alvo * e);
      if (k < 1) window.requestAnimationFrame(passo);
    })(t0);
  }
  if ('IntersectionObserver' in window) {
    var oc = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { conta(e.target); oc.unobserve(e.target); } });
    }, { threshold: 0.6 });
    contadores.forEach(function (el) { escreve(el, 0); oc.observe(el); });
  } else {
    contadores.forEach(function (el) { escreve(el, parseFloat(el.dataset.alvo)); });
  }

  /* ---------- linha do tempo ---------- */
  var trilha = $('#linha-trilha');
  if (trilha) {
    var marcos = $$('.marco', trilha);
    var passo = function () {
      var m = marcos[0];
      return m ? m.getBoundingClientRect().width : 320;
    };
    var ant = $('#linha-ant'), prox = $('#linha-prox');
    function estado() {
      var max = trilha.scrollWidth - trilha.clientWidth - 2;
      if (ant) ant.disabled = trilha.scrollLeft <= 2;
      if (prox) prox.disabled = trilha.scrollLeft >= max;
      // marco "atual": o primeiro que ainda aparece por inteiro à esquerda
      var r = trilha.getBoundingClientRect(), achou = null;
      marcos.forEach(function (m) {
        var b = m.getBoundingClientRect();
        if (!achou && b.left >= r.left - 4) achou = m;
      });
      marcos.forEach(function (m) { m.classList.toggle('atual', m === achou); });
    }
    function ir(d) { trilha.scrollBy({ left: d * passo(), behavior: reduzir ? 'auto' : 'smooth' }); }
    if (ant) ant.addEventListener('click', function () { ir(-1); });
    if (prox) prox.addEventListener('click', function () { ir(1); });
    trilha.addEventListener('scroll', function () { window.requestAnimationFrame(estado); }, { passive: true });
    trilha.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); ir(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); ir(-1); }
    });
    // arrastar com o mouse (desktop)
    var arrasta = false, x0 = 0, s0 = 0;
    trilha.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse') return;
      arrasta = true; x0 = e.clientX; s0 = trilha.scrollLeft;
      trilha.style.scrollSnapType = 'none'; trilha.style.cursor = 'grabbing';
    });
    window.addEventListener('pointermove', function (e) { if (arrasta) trilha.scrollLeft = s0 - (e.clientX - x0); });
    window.addEventListener('pointerup', function () {
      if (!arrasta) return;
      arrasta = false; trilha.style.scrollSnapType = ''; trilha.style.cursor = '';
    });
    window.addEventListener('resize', estado);
    estado();
  }


  /* ---------- luz que acompanha o cursor ---------- */
  var luz = $('#luz-cursor');
  if (luz && !reduzir && window.matchMedia('(pointer:fine)').matches) {
    var lx = 0, ly = 0, alvoX = 0, alvoY = 0, luzPend = false, luzVisivel = false;
    var move = function () {
      luzPend = false;
      lx += (alvoX - lx) * 0.18; ly += (alvoY - ly) * 0.18;
      luz.style.transform = 'translate3d(' + lx.toFixed(1) + 'px,' + ly.toFixed(1) + 'px,0)';
      if (Math.abs(alvoX - lx) > 0.5 || Math.abs(alvoY - ly) > 0.5) { luzPend = true; window.requestAnimationFrame(move); }
    };
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      alvoX = e.clientX; alvoY = e.clientY;
      if (!luzVisivel) { luzVisivel = true; lx = alvoX; ly = alvoY; luz.classList.add('on'); }
      if (!luzPend) { luzPend = true; window.requestAnimationFrame(move); }
    }, { passive: true });
    document.addEventListener('pointerleave', function () { luz.classList.remove('on'); luzVisivel = false; });
  }

  /* ---------- névoa cósmica: paralaxe lenta com a rolagem ---------- */
  var manchas = $$('#nevoa i');
  if (manchas.length && !reduzir) {
    var nevPend = false;
    var VEL = [-0.045, -0.075, -0.03];
    var nev = function () {
      nevPend = false;
      var y = window.pageYOffset || 0;
      for (var i = 0; i < manchas.length; i++) manchas[i].style.transform = 'translate3d(0,' + (y * VEL[i]).toFixed(1) + 'px,0)';
    };
    window.addEventListener('scroll', function () {
      if (!nevPend) { nevPend = true; window.requestAnimationFrame(nev); }
    }, { passive: true });
    nev();
  }

  /* ---------- painel de detalhes das missões ---------- */
  var MISSOES = [
    { id: 'artemis', kicker: 'Missão recente · 2026', titulo: 'Artemis II: de volta à Lua, com gente a bordo',
      resumo: 'Primeiro sobrevoo lunar tripulado em mais de 50 anos: quatro astronautas contornaram a Lua e voltaram para casa.',
      img: 'assets/img/hd/art002e021278.jpg', alt: 'A Terra se pondo sobre o horizonte da Lua, vista pela tripulação da Artemis II', cred: 'NASA · Artemis II · art002e021278',
      fatos: [['Lançamento', '1º de abril de 2026, Centro Espacial Kennedy, Flórida'], ['Retorno', '10 de abril de 2026, no oceano Pacífico'], ['Duração', '9 dias, 1 hora e 32 minutos'],
              ['Tripulação', 'Reid Wiseman, Victor Glover e Christina Koch (NASA) e Jeremy Hansen (Agência Espacial Canadense)'], ['Tipo', 'Sobrevoo lunar tripulado']],
      link: 'https://www.nasa.gov/mission/artemis-ii/' },
    { id: 'iss', kicker: 'Em órbita · desde 2000', titulo: 'Estação Espacial Internacional',
      resumo: 'Um laboratório em órbita mantido por agências espaciais de vários países, com gente a bordo sem interrupção desde 2000.',
      img: 'assets/img/missoes/iss.jpg', alt: 'Estrutura e painéis solares da Estação Espacial Internacional contra a Terra', cred: 'NASA',
      fatos: [['Presença humana', 'contínua desde 2 de novembro de 2000'], ['Altitude', 'entre cerca de 370 e 460 km, ajustada de tempos em tempos'], ['Uma volta na Terra', 'aproximadamente 90 minutos'], ['Tipo', 'Laboratório em órbita, internacional']],
      link: 'https://www.nasa.gov/international-space-station/' },
    { id: 'webb', kicker: 'Observatório · 2021', titulo: 'Telescópio Espacial James Webb',
      resumo: 'O maior espelho já lançado ao espaço, desenhado para ver a luz infravermelha de objetos muito distantes e muito antigos.',
      img: 'assets/img/missoes/webb.jpg', alt: 'Penhascos cósmicos da Nebulosa de Carina registrados pelo Webb', cred: 'NASA, ESA, CSA, STScI',
      fatos: [['Lançamento', '25 de dezembro de 2021, foguete Ariane 5, Guiana Francesa'], ['Espelho', '6,5 m de largura, 18 segmentos hexagonais'], ['Observa em', 'luz infravermelha'], ['Parceiros', 'NASA, ESA e CSA']],
      link: 'https://science.nasa.gov/mission/webb/' },
    { id: 'hubble', kicker: 'Observatório · 1990', titulo: 'Telescópio Espacial Hubble',
      resumo: 'Há mais de três décadas em órbita, mudou a forma como a humanidade enxerga galáxias, nebulosas e estrelas.',
      img: 'assets/img/missoes/hubble.jpg', alt: 'Os Pilares da Criação em infravermelho registrados pelo Hubble', cred: 'NASA, ESA, Hubble',
      fatos: [['Lançamento', '24 de abril de 1990, ônibus espacial Discovery (missão STS-31)'], ['Liberado em órbita', '25 de abril de 1990'], ['Imagem icônica', 'os Pilares da Criação']],
      link: 'https://science.nasa.gov/mission/hubble/' },
    { id: 'perseverance', kicker: 'Rover em Marte · 2021', titulo: 'Perseverance',
      resumo: 'Um geólogo robô que estuda rochas marcianas em busca de sinais de vida antiga e coleta amostras de rocha e solo.',
      img: 'assets/img/missoes/perseverance.jpg', alt: 'Autorretrato do rover Perseverance em Marte', cred: 'NASA / JPL-Caltech',
      fatos: [['Pouso', '18 de fevereiro de 2021, Cratera Jezero'], ['Objetivo', 'buscar sinais de vida antiga e coletar amostras de rocha e solo'], ['Pouso', 'reaproveitou o sistema de "guindaste aéreo" do rover Curiosity']],
      link: 'https://science.nasa.gov/mission/mars-2020-perseverance/' },
    { id: 'voyager', kicker: 'Sonda interestelar · 1977', titulo: 'Voyager 1: o ponto azul pálido',
      resumo: 'A sonda mais distante já construída. De lá, em 1990, fotografou a Terra como um pontinho de luz.',
      img: 'assets/img/missoes/voyager.jpg', alt: 'A Terra como um minúsculo ponto de luz na fotografia Pale Blue Dot', cred: 'NASA / JPL-Caltech',
      fatos: [['Lançamento', '5 de setembro de 1977 (a Voyager 2 partiu em 20 de agosto de 1977)'], ['Espaço interestelar', 'a Voyager 1 chegou lá em agosto de 2012'], ['Foto famosa', 'Pale Blue Dot, 1990'], ['Situação', 'ainda transmite dados']],
      link: 'https://science.nasa.gov/mission/voyager/' }
  ];
  var dlg = $('#missao');
  if (dlg && typeof dlg.showModal === 'function') {
    var indice = 0;
    var el = function (id) { return document.getElementById(id); };
    var preenche = function (i) {
      indice = (i + MISSOES.length) % MISSOES.length;
      var m = MISSOES[indice];
      el('missao-img').src = m.img; el('missao-img').alt = m.alt;
      el('missao-cred').textContent = m.cred;
      el('missao-k').textContent = m.kicker;
      el('missao-t').textContent = m.titulo;
      el('missao-r').textContent = m.resumo;
      el('missao-link').href = m.link;
      var f = el('missao-f'); f.textContent = '';
      m.fatos.forEach(function (par) {
        var d = document.createElement('div'), t = document.createElement('dt'), v = document.createElement('dd');
        t.textContent = par[0]; v.textContent = par[1]; d.appendChild(t); d.appendChild(v); f.appendChild(d);
      });
    };
    var abre = function (i) {
      preenche(i);
      var sbw = window.innerWidth - document.documentElement.clientWidth;
      html.style.paddingRight = sbw + 'px';
      html.classList.add('dialogo-aberto');
      if (!dlg.open) dlg.showModal();
    };
    $$('.card-abre').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var i = MISSOES.map(function (m) { return m.id; }).indexOf(a.dataset.missao);
        if (i < 0) return;
        e.preventDefault();
        abre(i);
      });
    });
    el('missao-x').addEventListener('click', function () { dlg.close(); });
    el('missao-ant').addEventListener('click', function () { preenche(indice - 1); });
    el('missao-prox').addEventListener('click', function () { preenche(indice + 1); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });   // clique no fundo fecha
    dlg.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { preenche(indice - 1); }
      if (e.key === 'ArrowRight') { preenche(indice + 1); }
    });
    dlg.addEventListener('close', function () {
      html.classList.remove('dialogo-aberto');
      html.style.paddingRight = '';
    });
  }

  /* ---------- acordeão: abre o primeiro por padrão ---------- */
  var primeiro = $('.acordeao-item');
  if (primeiro && !primeiro.hasAttribute('open')) primeiro.setAttribute('open', '');
})();
