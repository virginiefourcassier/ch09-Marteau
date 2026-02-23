const g = 9.81;
console.log("JS chargé (parabole complète + point rouge net)");

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
  y: hammerCanvas.height * 0.7,
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

  // point rouge au centre de gravité
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

  // lancer franchement vers le haut (75°)
  const launchAngle = Math.PI * 0.75;
  const v0 = speed * 40; // vitesse assez grande pour une grande parabole

  const dt = 0.03;
  const points = [];

  let t = 0;
  while (t < 6) {
    const xCG = cgX0 + v0 * Math.cos(launchAngle) * t;
    const yCG =
      cgY0 - (v0 * Math.sin(launchAngle) * t - 0.5 * g * 2.0 * t * t);

    // on arrête quand c'est largement retombé sous la position initiale
    if (yCG > cgY0 + 250) break;

    const baseOmega = 0.4; // rotation très modérée
    const omega = baseOmega * (rotFactor / 10);
    const theta = omega * t;

    points.push({ xCG, yCG, theta });
    t += dt;
  }

  return { points, cgX0, cgY0 };
}

// --- dessin sur le grand canvas ---
function drawTrajectoryVisual() {
  const { points, cgX0, cgY0 } = computeTrajectoryCG();
  if (points.length === 0) return;

  // on centre la scène autour de la trajectoire entière
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

  const margin = 60;
  const widthWorld = maxX - minX || 1;
  const heightWorld = maxY - minY || 1;

  const scaleX = (trajectoryCanvas.width - 2 * margin) / widthWorld;
  const scaleY = (trajectoryCanvas.height - 2 * margin) / heightWorld;
  const scale = Math.min(scaleX, scaleY);

  tctx.clearRect(0, 0, trajectoryCanvas.width, trajectoryCanvas.height);
  tctx.fillStyle = "#66a3ff";
  tctx.fillRect(0, 0, trajectoryCanvas.width, trajectoryCanvas.height);

  const n = points.length;

  // d'abord toutes les copies de marteau + point rouge semi-transparent
  for (let i = 0; i < n; i++) {
    const p = points[i];

    const cgx =
      margin + (p.xCG - minX) * scale;
    const cgy =
      margin + (p.yCG - minY) * scale;

    const progress = i / n;
    const angle = p.theta;

    const alphaGhost = 0.04 + 0.26 * progress;
    const alphaHandle = 0.12 + 0.6 * progress;
    const alphaPoint = 0.25 + 0.5 * progress;

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

    // point rouge semi-transparent (trace)
    tctx.beginPath();
    tctx.fillStyle = `rgba(255,0,0,${alphaPoint})`;
    tctx.arc(cgx, cgy, 4, 0, Math.PI * 2);
    tctx.fill();
  }

  // puis, en dernier, le point rouge au **premier plan**, bien net
  const last = points[points.length - 1];
  for (const p of points) {
    const cgx =
      margin + (p.xCG - minX) * scale;
    const cgy =
      margin + (p.yCG - minY) * scale;

    tctx.beginPath();
    tctx.fillStyle = "rgba(255,0,0,0.9)";
    tctx.arc(cgx, cgy, 3, 0, Math.PI * 2);
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
