const g = 9.81;
console.log("JS chargé (parabole complète corrigée)");

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

// géométrie du marteau
const hammer = {
  x: hammerCanvas.width * 0.25,
  y: hammerCanvas.height * 0.6,
  handleLength: 260,
  handleThickness: 26,
  headWidth: 80,
  headHeight: 120
};

// centre de gravité approximatif
const cgOffset = 0.3;
let pointT = cgOffset;

// --- marteau écran principal ---
function drawHammerScene() {
  hctx.clearRect(0, 0, hammerCanvas.width, hammerCanvas.height);

  const pivotX = hammer.x;
  const pivotY = hammer.y;

  hctx.save();
  hctx.translate(pivotX, pivotY);

  hctx.fillStyle = "#ffcc33";
  hctx.fillRect(
    0,
    -hammer.handleThickness / 2,
    hammer.handleLength,
    hammer.handleThickness
  );

  hctx.fillStyle = "#999999";
  hctx.beginPath();
  hctx.moveTo(-hammer.headWidth, -hammer.headHeight / 2);
  hctx.lineTo(0, -hammer.headHeight / 2);
  hctx.lineTo(0, hammer.headHeight / 2);
  hctx.lineTo(-hammer.headWidth * 0.6, hammer.headHeight / 4);
  hctx.lineTo(-hammer.headWidth, hammer.headHeight / 2);
  hctx.closePath();
  hctx.fill();

  const px = cgOffset * hammer.handleLength;
  const py = 0;
  hctx.fillStyle = "red";
  hctx.beginPath();
  hctx.arc(px, py, 10, 0, Math.PI * 2);
  hctx.fill();

  hctx.restore();
}

function initPoint() {
  pointT = cgOffset;
  pointPosSelect.value = "cg";
  drawHammerScene();
}

// --- trajectoire complète du centre de gravité ---
function computeTrajectoryCG() {
  const speed = parseFloat(speedSelect.value);      // 5 ou 10
  const rotFactor = parseFloat(rotationSelect.value); // 1 ou 10

  const pivotX = hammer.x;
  const pivotY = hammer.y;

  const cgX0 = pivotX + cgOffset * hammer.handleLength;
  const cgY0 = pivotY;

  // angle pas trop vertical pour une grande parabole visible
  const launchAngle = Math.PI * 0.55;  // ~99°
  const v0 = speed * 30;

  const dt = 0.03;
  const points = [];

  let t = 0;
  while (t < 6) {
    const xCG = cgX0 + v0 * Math.cos(launchAngle) * t;
    const yCG =
      cgY0 - (v0 * Math.sin(launchAngle) * t - 0.5 * g * 2.3 * t * t);

    // on garde toute la montée + descente, tant que ce n'est pas trop bas
    if (yCG > cgY0 + 260) break;

    const baseOmega = 0.5;
    const omega = baseOmega * (rotFactor / 10); // rotation très modérée
    const theta = omega * t;

    points.push({ xCG, yCG, theta });
    t += dt;
  }

  return { points };
}

// --- dessin sur le grand canvas (centré sur toute la courbe) ---
function drawTrajectoryVisual() {
  const { points } = computeTrajectoryCG();
  if (points.length === 0) return;

  // on calcule min/max pour adapter le cadrage
  let minX = points[0].xCG;
  let maxX = points[0].xCG;
  let minY = points[0].yCG;
  let maxY = points[0].yCG;

  for (const p of points) {
    if (p.xCG < minX) minX = p.xCG;
    if (p.xCG > maxX) maxX = p.xCG;
    if (p.yCG < minY) minY = p.yCG;
    if (p.yCG > maxY) maxY = p.yCG;
  }

  const margin = 40;
  const widthWorld = maxX - minX || 1;
  const heightWorld = maxY - minY || 1;

  const scaleX = (trajectoryCanvas.width - 2 * margin) / widthWorld;
  const scaleY = (trajectoryCanvas.height - 2 * margin) / heightWorld;
  const scale = Math.min(scaleX, scaleY); // pour que tout tienne

  tctx.clearRect(0, 0, trajectoryCanvas.width, trajectoryCanvas.height);
  tctx.fillStyle = "#66a3ff";
  tctx.fillRect(0, 0, trajectoryCanvas.width, trajectoryCanvas.height);

  const n = points.length;
  for (let i = 0; i < n; i++) {
    const p = points[i];

    // centre de gravité transformé dans le canvas
    const cgx =
      margin + (p.xCG - minX) * scale;
    const cgy =
      margin + (p.yCG - minY) * scale;

    const progress = i / n;
    const angle = p.theta;

    const alphaGhost = 0.03 + 0.22 * progress;
    const alphaHandle = 0.10 + 0.55 * progress;

    // tête grise
    tctx.save();
    tctx.translate(cgx, cgy);
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
    tctx.translate(cgx, cgy);
    tctx.rotate(angle);
    tctx.fillStyle = `rgba(255,204,51,${alphaHandle})`;
    tctx.fillRect(
      -cgOffset * hammer.handleLength,
      -hammer.handleThickness / 2,
      hammer.handleLength,
      hammer.handleThickness
    );
    tctx.restore();

    // point rouge (centre de gravité)
    tctx.beginPath();
    tctx.fillStyle = `rgba(255,0,0,${0.5 + 0.4 * progress})`;
    tctx.arc(cgx, cgy, 6, 0, Math.PI * 2);
    tctx.fill();
  }
}

// --- navigation ---
btnTrajectoire.addEventListener("click", () => {
  trajectoryScreen.style.display = "flex";
  drawTrajectoryVisual();
});

btnRetour.addEventListener("click", () => {
  trajectoryScreen.style.display = "none";
});

btnQuitter.addEventListener("click", () => {
  window.location.reload();
});

// on force la position sur le centre de gravité
pointPosSelect.value = "cg";
pointPosSelect.disabled = true;
initPoint();
