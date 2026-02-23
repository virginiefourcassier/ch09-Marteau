const g = 9.81;
console.log("JS chargé (rotation réduite + parabole complète)");

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

// géométrie du marteau (dans le canvas vert)
const hammer = {
  x: hammerCanvas.width * 0.25,
  y: hammerCanvas.height * 0.6,
  handleLength: 260,
  handleThickness: 26,
  headWidth: 80,
  headHeight: 120
};

// centre de gravité approximatif à 30 % du manche depuis le pivot
const cgOffset = 0.3;

// le point rouge est le centre de gravité
let pointT = cgOffset;

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

  // point rouge au centre de gravité
  const px = cgOffset * hammer.handleLength;
  const py = 0;
  hctx.fillStyle = "red";
  hctx.beginPath();
  hctx.arc(px, py, 10, 0, Math.PI * 2);
  hctx.fill();

  hctx.restore();
}

function updatePointTFromSelect() {
  pointT = cgOffset;
  pointPosSelect.value = "cg";
  drawHammerScene();
}

// --- trajectoire du centre de gravité (parabole complète) ---
function computeTrajectoryCG() {
  const speed = parseFloat(speedSelect.value);      // 5 ou 10
  const rotFactor = parseFloat(rotationSelect.value); // 1 ou 10

  const pivotX = hammer.x;
  const pivotY = hammer.y;

  const cgX0 = pivotX + cgOffset * hammer.handleLength;
  const cgY0 = pivotY;

  // lancer vers le haut, angle plus modéré pour allonger la parabole
  const launchAngle = Math.PI * 0.6; // 108°
  const v0 = speed * 32;             // un peu moins vertical

  const dt = 0.03;
  const points = [];

  let t = 0;
  while (t < 5.2) {
    const xCG = cgX0 + v0 * Math.cos(launchAngle) * t;
    const yCG =
      cgY0 - (v0 * Math.sin(launchAngle) * t - 0.5 * g * 2.5 * t * t);

    if (yCG > cgY0 + 220) break; // on s'arrête quand ça retombe assez bas

    // rotation très limitée : dépend de rotFactor mais avec petit coefficient
    const baseOmega = 0.8;          // rotation de base
    const omega = baseOmega * (rotFactor / 10); // 0.08 à 0.8 rad/s
    const theta = omega * t;

    points.push({ xCG, yCG, theta });
    t += dt;
  }

  return { points };
}

// --- dessin sur le grand canvas ---
function drawTrajectoryVisual() {
  const { points } = computeTrajectoryCG();
  if (points.length === 0) return;

  const first = points[0];

  // décalage et zoom pour voir la parabole entière
  const offsetX = trajectoryCanvas.width * 0.15;  // décale à droite
  const baselineY = trajectoryCanvas.height * 0.75; // parabole plus centrée
  const scale = 0.9;                               // un peu plus grand

  tctx.clearRect(0, 0, trajectoryCanvas.width, trajectoryCanvas.height);

  tctx.fillStyle = "#66a3ff";
  tctx.fillRect(0, 0, trajectoryCanvas.width, trajectoryCanvas.height);

  const n = points.length;
  for (let i = 0; i < n; i++) {
    const p = points[i];

    const cgx = offsetX + (p.xCG - first.xCG) * scale;
    const cgy = baselineY + (p.yCG - first.yCG) * scale;

    const progress = i / n;
    const angle = p.theta;

    // transparence douce
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

// on force la position sur "centre de gravité"
pointPosSelect.value = "cg";
pointPosSelect.disabled = true;
updatePointTFromSelect();
