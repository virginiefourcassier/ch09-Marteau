const g = 9.81;
console.log("JS chargé (parabole + cycloïde + descente complète)");

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
    pointT = 0.5;               // milieu du manche
  } else if (val === "head") {
    pointT = -0.15;             // sur la tête
  } else {
    pointT = 1.0;               // extrémité du manche
  }
  drawHammerScene();
}

// --- calcul de la trajectoire globale ---
//  - CG suit une parabole complète (montée + descente).
//  - si point = CG → trajectoire du point = parabole pure.
//  - sinon → trajectoire du point = parabole CG + cycloïde autour du CG.

function computeFullTrajectory() {
  const speed = parseFloat(speedSelect.value);        // 5 ou 10
  const rotFactor = parseFloat(rotationSelect.value); // 1 ou 10

  const pivotX = hammer.x;
  const pivotY = hammer.y;

  const cgX0 = pivotX + cgOffset * hammer.handleLength;
  const cgY0 = pivotY;

  // lancer vers le haut : angle 70°, vitesse réduite pour raccourcir la portée
  const launchAngle = Math.PI * 0.7;
  const v0 = speed * 30;   // moins que précédemment

  const dt = 0.06;         // pas de temps plus grand → moins de points
  const raw = [];

  let t = 0;
  while (t < 7) {
    const xCG = cgX0 + v0 * Math.cos(launchAngle) * t;
    const yCG =
      cgY0 - (v0 * Math.sin(launchAngle) * t - 0.5 * g * 1.8 * t * t);

    // on garde montée + sommet + descente
    if (yCG > cgY0 + 260) break;

    const isCG = Math.abs(pointT - cgOffset) < 0.001;

    // trajectoire du point rouge
    let xP, yP;

    if (isCG) {
      // CAS 1 : point = centre de gravité → trajectoire parabolique pure
      xP = xCG;
      yP = yCG;
    } else {
      // CAS 2 : point ≠ CG → cycloïde "par-dessus" la parabole
      // rayon de la cycloïde proportionnel à la distance au CG
      const R = Math.abs(pointT - cgOffset) * hammer.handleLength;

      // vitesse de "roulement" dépendant de rotFactor
      const vCycle = (5 + 10 * (rotFactor / 10)) * (pointT > cgOffset ? 1 : -1);

      // paramètre cycloïde
      const s = vCycle * t / R; // ~angle du rouleau

      // cycloïde standard : x = R(s - sin s), y = R(1 - cos s)
      const xCyc = R * (s - Math.sin(s));
      const yCyc = R * (1 - Math.cos(s));

      // orientation globale du lancer : on projette la cycloïde
      const cosA = Math.cos(launchAngle - Math.PI / 2);
      const sinA = Math.sin(launchAngle - Math.PI / 2);

      const dx = xCyc * cosA - yCyc * sinA;
      const dy = xCyc * sinA + yCyc * cosA;

      xP = xCG + dx;
      yP = yCG + dy;
    }

    // orientation du marteau : légère rotation, plus forte si point ≠ CG
    const baseOmegaCG = 0.25;
    const baseOmegaOther = 1.5;
    const baseOmega = isCG ? baseOmegaCG : baseOmegaOther;
    const omega = baseOmega * (rotFactor / 10);
    const theta = omega * t;

    raw.push({ t, xCG, yCG, xP, yP, theta, isCG });
    t += dt;
  }

  if (raw.length === 0) return null;

  // cadrage : min/max sur la trajectoire du centre de gravité
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
let animationId = null;
let currentIndex = 0;

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

  // on dessine une position sur 3 pour limiter la superposition
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
    tctx.arc(p.px, p.py, 3, 0, Math.PI * 2);
    tctx.fill();
  }

  // point rouge courant au premier plan
  const pCur = points[currentIndex];
  tctx.beginPath();
  tctx.fillStyle = "rgba(255,0,0,1)";
  tctx.arc(pCur.px, pCur.py, 5, 0, Math.PI * 2);
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
