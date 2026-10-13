/* Capítulo 01 · Ignition: o progresso do vídeo acompanha a rolagem da página.
   - o vídeo nunca toca sozinho; só recebe currentTime
   - uma busca por vez: a posição mais recente vence (evita fila de seeks)
   - sem loop permanente de requestAnimationFrame
   - o relógio da missão mostra o tempo do próprio vídeo (T-0 = ignição, em 1,0 s) */
(function () {
  'use strict';

  var secao = document.getElementById('cena');
  var video = document.getElementById('video');
  var carregando = document.getElementById('carregando');
  var carregandoTxt = document.getElementById('carregando-txt');
  var botao = document.getElementById('reproduzir');
  var relogio = document.getElementById('relogio');
  var relT = document.getElementById('rel-t');
  var relS = document.getElementById('rel-s');
  var barra = document.getElementById('trilho-barra');
  var reduzir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var toqueFino = window.matchMedia('(pointer: coarse)').matches;

  var PASSO = 1 / 48;          // ignora diferenças menores que meio quadro
  var FIM_FOLGA = 0.04;        // não encosta no último instante (alguns navegadores mostram preto)
  var T_ZERO = 1.0;            // segundo do vídeo em que os motores acendem
  var duracao = 0;
  var quer = 0;                // posição desejada (s)
  var ultimo = -1;             // última posição pedida ao vídeo
  var ocupado = false;
  var simples = false;
  var gatilhoCriado = false;
  var destravado = false;
  var statusAtual = '';

  // esconde o título até a entrada animada (se o gsap não carregar, o texto fica visível)
  if (window.gsap && !reduzir) document.documentElement.classList.add('anima');
  if (reduzir) document.documentElement.classList.add('sem-mov');

  function modoSimples(motivo) {
    if (simples) return;
    simples = true;
    document.documentElement.classList.remove('anima');
    document.documentElement.classList.add('sem-mov');
    secao.classList.add('simples');
    video.pause();
    if (motivo === 'reduzido') {
      // movimento reduzido: quadro estático + reprodução convencional, sob demanda
      botao.hidden = false;
      botao.addEventListener('click', function () {
        if (video.paused) { video.play(); botao.textContent = 'Pausar vídeo'; }
        else { video.pause(); botao.textContent = 'Reproduzir vídeo'; }
      });
      video.addEventListener('ended', function () { botao.textContent = 'Reproduzir vídeo'; });
    }
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  }

  // ---------- busca no vídeo ----------
  function bombear() {
    if (Math.abs(quer - ultimo) < PASSO) { ocupado = false; return; }
    ocupado = true;
    ultimo = quer;
    if (typeof video.fastSeek === 'function' && !video.seeking) {
      try { video.fastSeek(quer); return; } catch (e) { /* cai no currentTime */ }
    }
    video.currentTime = quer;
  }
  function buscar(t) {
    desejado = t;
    var lim = typeof limiteBuffer === 'function' ? limiteBuffer() : 0;
    var completo = typeof fracaoBuffer === 'function' && fracaoBuffer() >= 0.985;
    quer = (!completo && lim > 0) ? Math.min(t, Math.max(0, lim - 0.12)) : t;
    if (!ocupado) bombear();
  }
  video.addEventListener('seeked', function () {
    ocupado = false;
    if (Math.abs(quer - ultimo) >= PASSO) bombear();
  });

  // o vídeo nunca deve tocar por conta própria no modo controlado
  video.addEventListener('play', function () {
    if (!simples && !destravado) video.pause();
  });

  // ---------- tremor de câmera na ignição (determinístico: depende só da posição, vai e volta com a rolagem) ----------
  function tremor(p, t) {
    var k = Math.max(0, Math.min(1, (p - 0.125) / 0.36));
    var env = Math.sin(Math.PI * k);
    if (env < 0.01) { if (video.style.transform) video.style.transform = ''; return; }
    var dx = env * 2.6 * (Math.sin(t * 41.3) + 0.6 * Math.sin(t * 97.1));
    var dy = env * 2.2 * (Math.sin(t * 37.7 + 1.3) + 0.5 * Math.sin(t * 83.9));
    video.style.transform = 'translate3d(' + dx.toFixed(2) + 'px,' + dy.toFixed(2) + 'px,0) scale(1.025)';
  }

  // ---------- relógio da missão ----------
  function fmt(s) {
    s = Math.abs(s);
    var m = Math.floor(s / 60), r = s - m * 60;
    return (m < 10 ? '0' : '') + m + ':' + (r < 10 ? '0' : '') + r.toFixed(1);
  }
  function atualizaRelogio(t) {
    var T = t - T_ZERO;
    relT.textContent = (T < 0 ? 'T−' : 'T+') + fmt(T);
    var s = T < -0.05 ? 'Contagem final' : T < 2 ? 'Ignição' : T < 4 ? 'Decolagem' : 'Ascensão';
    if (s !== statusAtual) { statusAtual = s; relS.textContent = s; }
    relogio.classList.toggle('zero', T >= -0.05 && T < 0.8);
  }

  // ---------- carregamento: "pronto" vem dos dados que realmente chegaram, nunca de um tempo fixo ----------
  var liberado = false, falhou = false, desejado = 0;
  var pctEl = document.getElementById('carregando-pct');
  function duracaoReal() { return duracao || (isFinite(video.duration) ? video.duration : 0); }
  function limiteBuffer() {            // até onde já existem quadros: a busca não passa disso enquanto o resto chega
    var d = duracaoReal();
    if (!d || !video.buffered.length) return 0;
    return Math.min(d, video.buffered.end(video.buffered.length - 1));
  }
  function fracaoBuffer() { var d = duracaoReal(); return d ? limiteBuffer() / d : 0; }
  function checa() {
    if (liberado || falhou) return;
    var f = fracaoBuffer(), pct = Math.round(f * 100);
    if (liberado && f < 0.985) buscar(desejado);
    carregando.style.setProperty('--pct', pct + '%');
    if (pctEl) pctEl.textContent = pct + '%';
    // pronto: tudo em buffer, ou o bastante para começar com o restante chegando
    if (f >= 0.985 || (video.readyState >= 3 && f >= 0.35)) aoTerQuadro();
  }

  // aviso informativo (não libera nada): rede lenta, o título precisa estar legível mesmo sem o vídeo
  var avisoLento = setTimeout(function () {
    if (!liberado && !falhou) {
      carregando.classList.add('aviso');
      carregandoTxt.textContent = 'O vídeo está demorando para carregar…';
      entrada();
    }
  }, 9000);
  var sonda = setInterval(checa, 250);   // "progress" é esparso; isto só lê o buffer real para o percentual

  function aoTerQuadro() {
    if (liberado) return;
    liberado = true;
    clearTimeout(avisoLento); clearInterval(sonda);
    carregando.classList.remove('aviso');
    carregando.classList.add('fim');
    entrada();
    buscar(desejado);
  }
  function aoFalhar() {
    if (liberado || falhou) return;
    falhou = true;
    clearTimeout(avisoLento); clearInterval(sonda);
    carregando.classList.remove('fim');
    carregando.classList.add('aviso');
    carregandoTxt.textContent = 'Não foi possível carregar o vídeo.';
    entrada();
    modoSimples('erro');
  }
  ['loadedmetadata', 'loadeddata', 'progress', 'canplay', 'canplaythrough', 'suspend'].forEach(function (ev) {
    video.addEventListener(ev, checa);
  });
  // nem os metadados chegaram: falha de verdade (a página segue utilizável)
  setTimeout(function () { if (!liberado && video.readyState < 1) aoFalhar(); }, 25000);
  video.addEventListener('error', aoFalhar);
  // com mais de uma fonte, só a última falhar significa que nada carregou
  var fontes = video.querySelectorAll('source');
  if (fontes.length) fontes[fontes.length - 1].addEventListener('error', aoFalhar);

  // ---------- sincronia com a rolagem ----------
  function criarGatilho() {
    if (gatilhoCriado || simples || !window.gsap || !window.ScrollTrigger) return;
    gatilhoCriado = true;
    var gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
    gsap.registerPlugin(ScrollTrigger);
    gsap.ticker.lagSmoothing(0);
    ScrollTrigger.config({ ignoreMobileResize: true });

    var proxy = { p: 0 };
    var alvo = function () { return Math.max(0, duracao - FIM_FOLGA); };

    ScrollTrigger.create({
      trigger: secao,
      start: 'top top',
      end: 'bottom bottom',
      invalidateOnRefresh: true,
      onUpdate: function (self) {
        // suaviza a posição sem criar um loop próprio: o gsap só roda enquanto há tween
        gsap.to(proxy, {
          p: self.progress, duration: 0.3, ease: 'power2.out', overwrite: true,
          onUpdate: function () {
            var t = proxy.p * alvo();
            buscar(t);
            atualizaRelogio(t);
            tremor(proxy.p, t);
          }
        });
        barra.style.transform = 'scaleY(' + self.progress.toFixed(4) + ')';
      }
    });

    // textos: o título some antes da ignição, a frase final entra com o foguete já em ascensão
    var tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: secao, start: 'top top', end: 'bottom bottom', scrub: true, invalidateOnRefresh: true }
    });
    tl.to('#intro', { opacity: 0, y: -30, duration: 0.08 }, 0.15)
      .to('#indicador', { opacity: 0, duration: 0.05 }, 0.01)
      .fromTo('#estria', { opacity: 0, scaleX: 0.15 }, { opacity: 1, scaleX: 1, duration: 0.03 }, 0.125)
      .to('#estria', { opacity: 0, duration: 0.12 }, 0.17)
      .fromTo('#ignicao', { opacity: 0 }, { opacity: 1, duration: 0.05 }, 0.125)
      .to('#ignicao', { opacity: 0.25, duration: 0.5 }, 0.2)
      .to('#ignicao', { opacity: 0, duration: 0.2 }, 0.78)
      .fromTo('#beat-b', { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.08 }, 0.5)
      .to('#relogio', { opacity: 0, duration: 0.06 }, 0.93)
      .to({}, { duration: 0 }, 1);

    atualizaRelogio(0);
    ScrollTrigger.refresh();
  }

  // entrada do título: roda uma vez, quando o vídeo já tem o primeiro quadro
  var entrou = false;
  function entrada() {
    if (entrou) return;
    entrou = true;
    var html = document.documentElement;
    if (!window.gsap || simples || !html.classList.contains('anima')) { html.classList.remove('anima'); return; }
    var gsap = window.gsap;
    html.classList.remove('anima');
    gsap.set('.titulo .ln>span', { yPercent: 108 });
    gsap.set('#kicker', { opacity: 0, y: 10 });
    gsap.timeline({ delay: 0.25, defaults: { ease: 'power3.out' } })
      .to('#kicker', { opacity: 1, y: 0, duration: 0.8 })
      .to('.titulo .ln>span', { yPercent: 0, duration: 1.1, stagger: 0.12 }, '-=0.45');
  }

  function aoTerMetadados() {
    if (!isFinite(video.duration) || video.duration <= 0) return;
    duracao = video.duration;
    if (reduzir) { modoSimples('reduzido'); return; }
    criarGatilho();
    // layout final (fontes, altura da viewport) pode mudar depois do primeiro quadro
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { if (window.ScrollTrigger) window.ScrollTrigger.refresh(); });
    }
  }
  if (video.readyState >= 1) aoTerMetadados();
  else video.addEventListener('loadedmetadata', aoTerMetadados, { once: true });
  video.addEventListener('loadedmetadata', function () { if (toqueFino) destravar(); }, { once: true });
  if (video.readyState >= 4) aoTerQuadro();

  // iOS/Android: o vídeo só aceita busca depois de um gesto; faz um play/pause imediato
  function destravar() {
    if (destravado || simples || !toqueFino) return;
    destravado = true;
    var p = video.play();
    var voltar = function () {
      video.pause();
      destravado = false;
      if (Math.abs(video.currentTime - quer) > PASSO) { ultimo = -1; buscar(quer); }
    };
    if (p && p.then) p.then(voltar, function () { destravado = false; });
    else voltar();
  }
  ['touchstart', 'pointerdown', 'wheel', 'scroll', 'keydown'].forEach(function (ev) {
    window.addEventListener(ev, function once() {
      window.removeEventListener(ev, once);
      destravar();
    }, { passive: true });
  });

  // se o usuário mudar a preferência de movimento com a página aberta, recarrega o estado
  var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  var mudou = function () { window.location.reload(); };
  if (mq.addEventListener) mq.addEventListener('change', mudou);

  // limpeza
  window.addEventListener('pagehide', function () {
    if (window.ScrollTrigger) window.ScrollTrigger.getAll().forEach(function (st) { st.kill(); });
    if (window.gsap) window.gsap.killTweensOf('*');
    video.pause();
  });
})();
