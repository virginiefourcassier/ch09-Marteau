const g = 9.81;
console.log("JS chargé (parabole + boucles)");

// canvas marteau
const hammerCanvas = document.getElementById("hammerCanvas");
const hctx = hammerCanvas.getContext("2d");

// UI
const rotationSelect = document.getElementById("rotation");
const speedSelect = document.getElementById("speed");
const pointPosSelect = document.getElementById("pointPos");
const btnTrajectoire = document.getElementById("btnTrajectoire");
const btnQuitter = document.getElementById("btnQuitter");

// écran trajectoire
const trajectoryScreen = document.getElementById("trajectoryScreen");
const trajectoryCanvas = document.getElementById("trajectoryCanvas");
const tctx = trajectoryCanvas.getContext("2d");
const btnRetour = document.getElementById("btnRetour");

// géométrie du marteau dans le canvas vert
const hammer = {
  x: hammerCanvas.width * 0.25,
  y: hammerCanvas.height * 0.7,
  handleLength: 260,
  handleThickness: 26,
  headWidth: 80,
  headHeight: 120
};

// centre de gravité plus proche de la tête
const cgOffset = 0.15;

// animation
let animationId = null;
let trajectoryData = null;
let currentIndex = 0;

// point rouge : t (0..1 sur le manche, <0 légèrement côté tête)
let pointT = 1;

// --- dessin marteau sur l'écran principal ---
function drawHammerScene() {
  hctx.clearRect(0, 0, hammerCanvas.width, hammerCanvas.height);

  const pivotX = hammer.x;
  const pivotY = hammer.y;

  hctx.save();
  hctx.translate(pivotX, pivotY);

  // manche
  hctx.fillStyle = "#ffcc33";
  hctx.fillRect(
    0,
    -hammer.handleThickness / 2,
    hammer.handleLength,
    hammer.handleThickness
  );

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

// mettre pointT selon le select
function updatePointTFromSelect() {
  const val = pointPosSelect.value;
  if (val === "cg") {
    pointT = cgOffset;          // centre de gravité
  } else if (val === "middle") {
    pointT = 0.5;               // milieu du manche bien au centre
  } else if (val === "head") {
    pointT = -0.15;             // sur la tête, un peu avant le pivot
  } else {
    pointT = 1.0;               // extrémité du manche
  }
  drawHammerScene();
}

// --- calcul de la trajectoire globale ---
//  - CG suit une parabole complète (montée + descente).
//  - Point rouge = CG + rotation (faible si CG, forte sinon).

function computeFullTrajectory() {
  const speed = parseFloat(speedSelect.value);      // 5 ou 10
  const rotFactor = parseFloat(rotationSelect.value); // 1 ou 10

  const pivotX = hammer.x;
  const pivotY = hammer.y;

  const cgX0 = pivotX + cgOffset * hammer.handleLength;
  const cgY0 = pivotY;

  // lancer vers le haut : angle 70°
  const launchAngle = Math.PI * 0.7;
  const v0 = speed * 38;

  const dt = 0.05; // moins de points -> traces moins denses
  const raw = [];

  let t = 0;
  while (t < 7) {
    const xCG = cgX0 + v0 * Math.cos(launchAngle) * t;
    const yCG =
      cgY0 - (v0 * Math.sin(launchAngle) * t - 0.5 * g * 2.0 * t * t);

    // on garde montée + sommet + descente plus longue
    if (yCG > cgY0 + 280) break;

    // rotation :
    // - si point au CG : rotation douce
    // - sinon : rotation plus forte → boucles
    const baseOmegaCG = 0.35;
    const baseOmegaOther = 1.8;
    const isCG = Math.abs(pointT - cgOffset) < 0.001;
    const baseOmega = isCG ? baseOmegaCG : baseOmegaOther;
    const omega = baseOmega * (rotFactor / 10);

    const theta = omega * t;

    // point rouge en coordonnées marteau (distance au CG)
    const dxLocal = (pointT - cgOffset) * hammer.handleLength;
    const dyLocal = 0;

    const cosTh = Math.cos(theta);
    const sinTh = Math.sin(theta);

    const dxP = dxLocal * cosTh - dyLocal * sinTh;
    const dyP = dxLocal * sinTh + dyLocal * cosTh;

    const xP = xCG + dxP;
    const yP = yCG + dyP;

    raw.push({ t, xCG, yCG, xP, yP, theta });
    t += dt;
  }

  if (raw.length === 0) return null;

  // cadrage : on utilise min/max de toute la trajectoire
  let minX = raw[0].xCG;
  let maxX = raw[0].xCG;
  let minY = raw[0].yCG;
  let maxY = raw[0].yCG;

  for (const p of raw) {
    if (p.xCG < minX) minX = p.xCG;
    if (p.xCG > maxX) maxX = p.xCG;
    if (p.yCG < minY) minY = p.yCG;
    if (p.yCG > maxY) maxY = p.yCG;
  }

  const margin = 70;
  const widthWorld = maxX - minX || 1;
  const heightWorld = maxY - minY || 1;
  const scaleX = (trajectoryCanvas.width - 2 * margin) / widthWorld;
  const scaleY = (trajectoryCanvas.height - 2 * margin) / heightWorld;
  const scale = Math.min(scaleX, scaleY);

  const points = raw.map((p) => {
    const cgx = margin + (p.xCG - minX) * scale;
    const cgy = margin + (p.yCG - minY) * scale;
    const px = margin + (p.xP - minX) * scale;
    const py = margin + (p.yP - minY) * scale;
    return { ...p, cgx, cgy, px, py, scale };
  });

  return { points, margin, minX, minY, scale };
}

// --- animation progressive ---
function startAnimation() {
  if (animationId !== null) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }

  trajectoryData = computeFullTrajectory();
  if (!trajectoryData) return;

  currentIndex = 0;
  tctx.clearRect(0, 0, trajectoryCanvas.width, trajectoryCanvas.height);
  tctx.fillStyle = "#66a3ff";
  tctx.fillRect(0, 0, trajectoryCanvas.width, trajectoryCanvas.height);

  animateStep();
}

function animateStep() {
  if (!trajectoryData) return;
  const { points } = trajectoryData;

  const n = points.length;
  if (currentIndex >= n) {
    animationId = null;
    return;
  }

  // fond
  tctx.clearRect(0, 0, trajectoryCanvas.width, trajectoryCanvas.height);
  tctx.fillStyle = "#66a3ff";
  tctx.fillRect(0, 0, trajectoryCanvas.width, trajectoryCanvas.height);

  // on ne dessine qu'une position sur 3 pour limiter la superposition
  const stepDraw = 3;

  for (let i = 0; i <= currentIndex; i += stepDraw) {
    const p = points[i];
    const progress = i / (n - 1);
    const angle = p.theta;

    const alphaGhost = 0.04 + 0.22 * progress;
    const alphaHandle = 0.12 + 0.55 * progress;
    const alphaPointTrace = 0.15 + 0.5 * progress;

    // tête grise
    tctx.save();
    tctx.translate(p.cgx, p.cgy);
    tctx.rotate(angle);
    tctx.fillStyle = `rgba(150,150,150,${alphaGhost})`;
    tctx.beginPath();
    tctx.moveTo(
      -cgOffset * hammer.handleLength - hammer.headWidth,
      -hammer.headHeight * 0.45
    );
    tctx.lineTo(-cgOffset * hammer.handleLength, -hammer.headHeight * 0.45);
    tctx.lineTo(-cgOffset * hammer.handleLength, hammer.headHeight * 0.45);
    tctx.lineTo(
      -cgOffset * hammer.handleLength - hammer.headWidth * 0.6,
      hammer.headHeight * 0.25
    );
    tctx.lineTo(
      -cgOffset * hammer.handleLength - hammer.headWidth,
      hammer.headHeight * 0.45
    );
    tctx.closePath();
    tctx.fill();
    tctx.restore();

    // manche jaune
    tctx.save();
    tctx.translate(p.cgx, p.cgy);
    tctx.rotate(angle);
    tctx.fillStyle = `rgba(255,204,51,${alphaHandle})`;
    tctx.fillRect(
      -cgOffset * hammer.handleLength,
      -hammer.handleThickness / 2,
      hammer.handleLength,
      hammer.handleThickness
    );
    tctx.restore();

    // trace du point rouge
    tctx.beginPath();
    tctx.fillStyle = `rgba(255,0,0,${alphaPointTrace})`;
    tctx.arc(p.cgx, p.cgy, 3, 0, Math.PI * 2);
    tctx.fill();
  }

  // point rouge courant au premier plan
  const pCur = points[currentIndex];
  tctx.beginPath();
  tctx.fillStyle = "rgba(255,0,0,1)";
  tctx.arc(pCur.cgx, pCur.cgy, 5, 0, Math.PI * 2);
  tctx.fill();

  currentIndex++;
  animationId = requestAnimationFrame(animateStep);
}

// --- navigation ---
btnTrajectoire.addEventListener("click", () => {
  trajectoryScreen.style.display = "flex";
  startAnimation();
});

btnRetour.addEventListener("click", () => {
  trajectoryScreen.style.display = "none";
  if (animationId !== null) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
});

btnQuitter.addEventListener("click", () => {
  window.location.reload();
});

// changement de position du point rouge
pointPosSelect.addEventListener("change", () => {
  updatePointTFromSelect();
});

// initialisation
updatePointTFromSelect();
