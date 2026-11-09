// Simulation décorative d'une caméra événementielle : seuls les bords en mouvement
// produisent des points, bleus quand la luminosité augmente, rouges quand elle baisse.
(function () {
  "use strict";

  var canvas = document.getElementById("event-canvas");
  if (!canvas) return;

  var CELL = 4; // taille d'un pixel simulé, en px CSS
  var LIFE = 650; // durée de vie d'un événement, en ms
  var STEP = 16;

  var ctx = canvas.getContext("2d");
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var darkMode = window.matchMedia("(prefers-color-scheme: dark)");
  var events = [];
  var width = 0;
  var height = 0;
  var colors = {};
  var visible = true;
  var frame = 0;
  var lastTime = 0;

  function readColors() {
    var style = getComputedStyle(document.documentElement);
    colors.on = style.getPropertyValue("--on").trim();
    colors.off = style.getPropertyValue("--off").trim();
  }

  function resize() {
    var ratio = window.devicePixelRatio || 1;
    var rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function emit(x, y, on, time) {
    events.push({
      x: Math.floor(x / CELL) * CELL,
      y: Math.floor(y / CELL) * CELL,
      on: on,
      time: time
    });
  }

  // Un disque en trajectoire de Lissajous : le bord avant et le bord arrière ont des polarités opposées.
  function emitDisc(time, phase, radius) {
    var speed = 0.0006;
    var angleX = time * speed + phase;
    var angleY = time * speed * 1.6 + phase * 2;
    var x = width * (0.5 + 0.34 * Math.sin(angleX));
    var y = height * (0.5 + 0.34 * Math.sin(angleY));
    var vx = Math.cos(angleX);
    var vy = 1.6 * Math.cos(angleY) * (height / width);

    for (var i = 0; i < 26; i++) {
      var theta = Math.random() * Math.PI * 2;
      var nx = Math.cos(theta);
      var ny = Math.sin(theta);
      var strength = nx * vx + ny * vy;
      if (Math.random() < Math.abs(strength)) {
        emit(x + nx * radius, y + ny * radius, strength > 0, time);
      }
    }
  }

  // Une barre en rotation : les bords s'activent d'autant plus qu'ils sont loin de l'axe.
  function emitBar(time) {
    var angle = time * 0.0009;
    var length = Math.min(width, height) * 0.42;
    var cos = Math.cos(angle);
    var sin = Math.sin(angle);

    for (var i = 0; i < 34; i++) {
      var s = (Math.random() * 2 - 1) * length;
      var side = Math.random() < 0.5 ? 1 : -1;
      if (Math.random() < Math.abs(s) / length) {
        emit(
          width / 2 + s * cos - side * 5 * sin,
          height / 2 + s * sin + side * 5 * cos,
          s * side > 0,
          time
        );
      }
    }
  }

  function emitNoise(time) {
    if (Math.random() < 0.35) {
      emit(Math.random() * width, Math.random() * height, Math.random() < 0.5, time);
    }
  }

  function step(time) {
    emitDisc(time, 0, Math.min(width, height) * 0.13);
    emitDisc(time, 2.3, Math.min(width, height) * 0.07);
    emitBar(time);
    emitNoise(time);
    while (events.length && time - events[0].time > LIFE) {
      events.shift();
    }
  }

  function draw(time) {
    ctx.clearRect(0, 0, width, height);
    for (var i = 0; i < events.length; i++) {
      var event = events[i];
      ctx.globalAlpha = Math.max(0, 1 - (time - event.time) / LIFE);
      ctx.fillStyle = event.on ? colors.on : colors.off;
      ctx.fillRect(event.x, event.y, CELL - 1, CELL - 1);
    }
    ctx.globalAlpha = 1;
  }

  // Sans animation : une seule image, équivalente à un court temps d'accumulation.
  function drawStill() {
    var time = 4000;
    events = [];
    for (var t = time - LIFE; t <= time; t += STEP) {
      step(t);
    }
    draw(time);
  }

  function loop(time) {
    frame = requestAnimationFrame(loop);
    if (time - lastTime < STEP) return;
    lastTime = time;
    step(time);
    draw(time);
  }

  function refresh() {
    cancelAnimationFrame(frame);
    frame = 0;
    if (reducedMotion.matches) {
      drawStill();
    } else if (visible && !document.hidden) {
      frame = requestAnimationFrame(loop);
    }
  }

  readColors();
  resize();
  refresh();

  new ResizeObserver(function () {
    resize();
    events = [];
    refresh();
  }).observe(canvas);

  new IntersectionObserver(function (entries) {
    visible = entries[0].isIntersecting;
    refresh();
  }).observe(canvas);

  document.addEventListener("visibilitychange", refresh);
  reducedMotion.addEventListener("change", refresh);
  darkMode.addEventListener("change", function () {
    readColors();
    refresh();
  });
})();
