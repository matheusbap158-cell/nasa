/* TRILHA SINTETIZADA · reage à rolagem.
   Nenhum arquivo de áudio: tudo é gerado na hora pelo Web Audio (osciladores e ruído filtrado), então não há
   direitos autorais, nem peso extra. Fica desligada até a pessoa clicar em "Som" (regra dos navegadores).
   - zumbido grave ("o vazio") cuja altura e brilho mudam a cada capítulo;
   - estrondo de motor que sobe na ignição e some conforme a altitude cresce;
   - sopro que acompanha a velocidade da rolagem;
   - brilho agudo e lento no espaço profundo. */
(function () {
  'use strict';

  var botao = document.getElementById('som');
  var AC = window.AudioContext || window.webkitAudioContext;
  if (!botao || !AC) { if (botao) botao.hidden = true; return; }

  var ctx = null, ligado = false, N = {};
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var SECOES = ['cena', 'leave', 'unknown', 'afastar', 'saturno', 'humanity', 'manifesto', 'frontier', 'missoes'];
  // altura do zumbido (Hz) e abertura do filtro por zona
  var ZONA = {
    cena: { f: 55, lp: 240, d: 0.34, br: 0 }, leave: { f: 55, lp: 520, d: 0.3, br: 0 }, unknown: { f: 65.4, lp: 700, d: 0.34, br: 0.5 },
    afastar: { f: 49, lp: 640, d: 0.34, br: 0.8 }, saturno: { f: 55, lp: 760, d: 0.32, br: 1 }, humanity: { f: 73.4, lp: 540, d: 0.36, br: 0.4 },
    manifesto: { f: 73.4, lp: 480, d: 0.36, br: 0.3 }, frontier: { f: 55, lp: 620, d: 0.34, br: 0.8 }, missoes: { f: 61.7, lp: 380, d: 0.3, br: 0.15 }
  };

  function ruido(tipo) {
    var n = ctx.sampleRate * 3, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0), last = 0;
    for (var i = 0; i < n; i++) {
      var w = Math.random() * 2 - 1;
      if (tipo === 'marrom') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w * 0.5;
    }
    var s = ctx.createBufferSource(); s.buffer = b; s.loop = true; return s;
  }

  function monta() {
    ctx = new AC();
    N.master = ctx.createGain(); N.master.gain.value = 0; N.master.connect(ctx.destination);

    // zumbido: quatro osciladores levemente desafinados passando por um filtro que respira devagar
    N.drone = ctx.createGain(); N.drone.gain.value = 0.3;
    N.lp = ctx.createBiquadFilter(); N.lp.type = 'lowpass'; N.lp.frequency.value = 260; N.lp.Q.value = 0.8;
    N.osc = [];
    [[1, 'sawtooth', 0.15], [1.5, 'triangle', 0.1], [2, 'triangle', 0.1], [3, 'sine', 0.05]].forEach(function (c) {
      var o = ctx.createOscillator(); o.type = c[1]; o.frequency.value = 55 * c[0]; o.detune.value = (Math.random() - 0.5) * 16;
      var g = ctx.createGain(); g.gain.value = c[2];
      o.connect(g); g.connect(N.lp); o.start(); N.osc.push({ o: o, mult: c[0] });
    });
    var lfo = ctx.createOscillator(); lfo.frequency.value = 0.06;
    var lg = ctx.createGain(); lg.gain.value = 90; lfo.connect(lg); lg.connect(N.lp.frequency); lfo.start();
    N.lp.connect(N.drone); N.drone.connect(N.master);

    // estrondo do motor
    N.rumble = ctx.createGain(); N.rumble.gain.value = 0;
    var rl = ctx.createBiquadFilter(); rl.type = 'lowpass'; rl.frequency.value = 150; rl.Q.value = 0.9;
    var rs = ruido('marrom'); rs.connect(rl); rl.connect(N.rumble); N.rumble.connect(N.master); rs.start();

    // sopro da rolagem
    N.sopro = ctx.createGain(); N.sopro.gain.value = 0;
    N.bp = ctx.createBiquadFilter(); N.bp.type = 'bandpass'; N.bp.frequency.value = 600; N.bp.Q.value = 0.7;
    var ss = ruido('branco'); ss.connect(N.bp); N.bp.connect(N.sopro); N.sopro.connect(N.master); ss.start();

    // brilho agudo no espaço profundo (dois tons lentos com tremolo)
    N.brilho = ctx.createGain(); N.brilho.gain.value = 0;
    [[440, 0.11], [659.3, 0.083]].forEach(function (c) {
      var o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = c[0];
      var t = ctx.createOscillator(); t.frequency.value = c[1];
      var tg = ctx.createGain(); tg.gain.value = 0.5; var base = ctx.createGain(); base.gain.value = 0.5;
      t.connect(tg); tg.connect(base.gain); o.connect(base); base.connect(N.brilho); o.start(); t.start();
    });
    N.brilho.connect(N.master);
  }

  var ultimoY = window.pageYOffset || 0, vel = 0, pend = false, tempo = 0;
  var topos = null;
  function mede() {
    topos = SECOES.map(function (id) {
      var e = document.getElementById(id);
      if (!e) return null;
      return { id: id, top: e.getBoundingClientRect().top + window.pageYOffset, h: e.offsetHeight };
    }).filter(Boolean);
  }
  function prog(id, y) {
    for (var i = 0; i < topos.length; i++) if (topos[i].id === id) {
      return clamp((y - topos[i].top) / Math.max(1, topos[i].h - window.innerHeight), 0, 1);
    }
    return 0;
  }

  function atualiza() {
    pend = false;
    if (!ligado || !ctx) return;
    if (!topos) mede();
    var y = window.pageYOffset || 0, vh = window.innerHeight;
    var v = Math.abs(y - ultimoY); ultimoY = y;
    vel = vel * 0.75 + v * 0.25;

    // zona atual: a última seção cujo topo já passou do meio da tela
    var zona = 'cena';
    for (var i = 0; i < topos.length; i++) if (topos[i].top <= y + vh * 0.5) zona = topos[i].id;
    var z = ZONA[zona] || ZONA.cena;
    var p1 = prog('cena', y), p2 = prog('leave', y);

    // motor: sobe na ignição (12,5% a ~70% do capítulo 1) e se dissolve com a altitude no capítulo 2
    var env1 = 0;
    if (zona === 'cena') { var k = clamp((p1 - 0.12) / 0.6, 0, 1); env1 = Math.sin(Math.PI * Math.pow(k, 0.8)) * 0.9; if (p1 > 0.7) env1 = Math.max(env1, 0.55 * (1 - clamp((p1 - 0.7) / 0.3, 0, 1)) + 0.2); }
    if (zona === 'leave') env1 = 0.6 * (1 - clamp(p2 / 0.55, 0, 1));
    var t = ctx.currentTime;
    N.rumble.gain.setTargetAtTime(env1 * 0.85, t, 0.25);
    // sopro conforme a velocidade da rolagem
    var s = clamp(vel / 70, 0, 1);
    N.sopro.gain.setTargetAtTime(s * 0.2, t, 0.12);
    N.bp.frequency.setTargetAtTime(380 + s * 1400, t, 0.15);
    // zumbido: altura e brilho de cada capítulo (planando entre eles)
    var lpAlvo = z.lp + (zona === 'leave' ? 500 * p2 : 0);
    N.lp.frequency.setTargetAtTime(lpAlvo, t, 0.8);
    N.drone.gain.setTargetAtTime(z.d, t, 0.8);
    N.osc.forEach(function (c) { c.o.frequency.setTargetAtTime(z.f * c.mult, t, 1.2); });
    N.brilho.gain.setTargetAtTime(z.br * 0.045, t, 1.4);

    if (vel > 0.3 || env1 > 0.01) { pend = true; window.requestAnimationFrame(atualiza); }
  }
  function pede() { if (!pend) { pend = true; window.requestAnimationFrame(atualiza); } }

  function sincroniza() {
    // o botão sempre mostra o que o áudio está realmente fazendo
    var tocando = !!ctx && ctx.state === 'running' && ligado;
    botao.setAttribute('aria-pressed', tocando ? 'true' : 'false');
    botao.title = tocando ? 'Desligar o som (M)' : 'Ligar o som (M)';
  }
  function liga() {
    if (!ctx) { monta(); ctx.onstatechange = function () { if (ctx.state !== 'running' && ligado && !document.hidden) { ligado = false; } sincroniza(); }; }
    ligado = true; mede();
    var depois = function () {
      if (!ligado) return;
      N.master.gain.setTargetAtTime(0.7, ctx.currentTime, 0.4);
      sincroniza(); pede();
    };
    if (ctx.state === 'suspended') ctx.resume().then(depois, function () { ligado = false; sincroniza(); });
    else depois();
  }
  function desliga() {
    ligado = false;
    if (ctx) N.master.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
    sincroniza();
  }
  botao.addEventListener('click', function () { if (ligado) desliga(); else liga(); });
  window.addEventListener('scroll', pede, { passive: true });
  window.addEventListener('resize', function () { topos = null; pede(); });
  window.addEventListener('load', function () { topos = null; });
  window.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var a = e.target && e.target.tagName;
    if (a === 'INPUT' || a === 'TEXTAREA') return;
    if (e.key === 'm' || e.key === 'M') { if (ligado) desliga(); else liga(); }
  });
  document.addEventListener('visibilitychange', function () {
    if (!ctx) return;
    if (document.hidden) ctx.suspend(); else if (ligado) ctx.resume();
  });
})();
