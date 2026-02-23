const g = 9.81;

// canvas marteau
const hammerCanvas = document.getElementById("hammerCanvas");
const hctx = hammerCanvas.getContext("2d");

// UI
const rotationSelect = document.getElementById("rotation");
const speedSelect = document.getElementById("speed");
const btnTrajectoire = document.getElementById("btnTrajectoire");
const btnQuitter = document.getElementById("btnQuitter");

// écran trajectoire
const trajectoryScreen = document.getElementById("trajectoryScreen");
const trajectoryCanvas = document.getElementById("trajectoryCanvas");
const tctx = trajectoryCanvas.getContext("2d");
const btnRetour = document.getElementById("btnRetour");

// géométrie du marteau (dans le canvas vert)
const hammer = {
  x: hammerCanvas.width * 0.25,
  y: hammerCanvas.height * 0.6,
  handleLength: 260,
  handleThickness: 26,
  headWidth: 80,
  headHeight: 120
};

// point rouge (0..1 sur le manche)
let pointT = 1;
let draggingPoint = false;

// --- dessin marteau à l'écran principal ---
function drawHammerScene() {
  hctx.clearRect(0, 0, hammerCanvas.width, hammerCanvas.height);

  const pivotX = hammer.x;
  const pivotY = hammer.y;

  hctx.save();
  hctx.translate(pivotX, pivotY);

  // manche
  hctx.fillStyle = "#ffcc33";
  hctx.fillRect(0, -hammer.handleThickness / 2, hammer.handleLength, hammer.handleThickness);

  // tête
  hctx.fillStyle = "#999999";
  hctx.beginPath();
  hctx.moveTo(-hammer.headWidth, -hammer.headHeight / 2);
  hctx.lineTo(0, -hammer.headHeight / 2);
  hctx.lineTo(0, hammer.headHeight / 2);
  hctx.lineTo(-hammer.headWidth * 0.6, hammer.headHeight / 4);
  hctx.lineTo(-hammer.headWidth, hammer.headHeight / 2);
  hctx.closePath();
  hctx.fill();

  // point rouge
  const px = pointT * hammer.handleLength;
  const py = 0;
  hctx.fillStyle = "red";
  hctx.beginPath();
  hctx.arc(px, py, 10, 0, Math.PI * 2);
  hctx.fill();

  hctx.restore();
}

function canvasToLocalHandle(x, y) {
  const rect = hammerCanvas.getBoundingClientRect();
  const mx = x - rect.left;
  const my = y - rect.top;

  const pivotX = hammer.x;
  const pivotY = hammer.y;

  const localX = mx - pivotX;
  const localY = my - pivotY;

  return { localX, localY };
}

function updatePointFromMouse(evt) {
  const { localX, localY } = canvasToLocalHandle(evt.clientX, evt.clientY);

  if (Math.abs(localY) < hammer.handleThickness * 2) {
    let t = localX / hammer.handleLength;
    t = Math.max(0, Math.min(1, t));
    pointT = t;
    drawHammerScene();
  }
}

hammerCanvas.addEventListener("mousedown", (evt) => {
  draggingPoint = true;
  updatePointFromMouse(evt);
});

window.addEventListener("mousemove", (evt) => {
  if (draggingPoint) {
    updatePointFromMouse(evt);
  }
});

window.addEventListener("mouseup", () => {
  draggingPoint = false;
});

// --- calcul simplifié pour la trajectoire ---
function computeVisualTrajectory() {
  const speed = parseFloat(speedSelect.value);   // 2..10
  const rotFactor = parseFloat(rotationSelect.value); // 1..10

  const startX = hammer.x + pointT * hammer.handleLength;
  const startY = hammer.y;

  // angle de base (en rad)
  const baseAngle = Math.PI * 0.6; // ~108°
  // plus le point est excentré, plus l’angle varie avec rotFactor
  const angleOffset = (pointT - 0.5) * (Math.PI / 3) * (rotFactor / 10);
  const angle = baseAngle - angleOffset;

  const v0 = 25 * speed; // juste pour remplir l’écran

  const dt = 0.04;
  const points = [];
  let t = 0;

  while (t < 4) {
    const x = startX + v0 * Math.cos(angle) * t;
    const y =
      startY -
      (v0 * Math.sin(angle) * t - 0.5 * g * 2 * t * t); // échelle verticale “visuelle”

    if (y > trajectoryCanvas.height + 100) break;
    points.push({ x, y, t });
    t += dt;
  }

  return { startX, startY, points };
}

// --- dessin style SWF sur le grand canvas ---
function drawTrajectoryVisual() {
  const { startX, startY, points } = computeVisualTrajectory();

  const offsetX = trajectoryCanvas.width * 0.05;
  const baselineY = trajectoryCanvas.height * 0.8;
  const scale = 0.8;

  tctx.clearRect(0, 0, trajectoryCanvas.width, trajectoryCanvas.height);

  // fond bleu
  tctx.fillStyle = "#66a3ff";
  tctx.fillRect(0, 0, trajectoryCanvas.width, trajectoryCanvas.height);

  const n = points.length;
  for (let i = 0; i < n; i++) {
    const p = points[i];

    const hx = offsetX + (p.x - startX) * scale;
    const hy = baselineY + (p.y - startY) * scale;

    const progress = i / n;

    const alphaHandle = 0.1 + 0.5 * progress;
    const alphaGhost = 0.08 + 0.3 * progress;

    // "ombre" du marteau (gris clair transparent)
