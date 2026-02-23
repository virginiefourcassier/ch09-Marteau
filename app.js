const g = 9.81;
console.log("JS chargé (centre de gravité pur)");

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

// t du point rouge sur le manche (0..1) — on va en pratique fixer sur le CG
let pointT = cgOffset;

// --- dessin marteau à l'écran principal (simple, point rouge au CG) ---
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

  // point rouge placé au centre de gravité
  const px = cgOffset * hammer.handleLength;
  const py = 0;
  hctx.fillStyle = "red";
  hctx.beginPath();
  hctx.arc(px, py, 10, 0, Math.PI * 2);
  hctx.fill();

  hctx.restore();
}

// on force le select sur la tête (CG) et on désactive le déplacement libre
function updatePointTFromSelect() {
  pointT = cgOffset;
  pointPosSelect.value = "cg";
  drawHammerScene();
}

// --- trajectoire : le point rouge = centre de gravité ---
// 1. le centre de gravité suit une parabole complète (lancement vers le haut)
// 2. le marteau entier tourne autour de ce point avec une vitesse angulaire
// 3. on dessine des copies de plus en plus transparentes (effet "fane")

function computeTrajectoryCG() {
  const speed = parseFloat(speedSelect.value);      // 5 ou 10
  const rotFactor = parseFloat(rotationSelect.value); // 1 ou 10

  const pivotX = hammer.x;
  const pivotY = hammer.y;

  // position initiale du centre de gravité dans le canvas vert
  const cgX0 = pivotX + cgOffset * hammer.handleLength;
  const cgY0 = pivotY;

  // lancer vers le haut : angle ~70°
  const launchAngle = Math.PI * 0.7;
  const v0 = speed * 35; // échelle visuelle

  const dt = 0.03;
  const points = [];

  let t = 0;
  while (t < 4.5) {
    const xCG = cgX0 + v0 * Math.cos(launchAngle) * t;
    const yCG =
      cgY0 - (v0 * Math.sin(launchAngle) * t - 0.5 * g * 3 * t * t);

    if (yCG > trajectoryCanvas.height + 120) break;

    // vitesse angulaire proportionnelle au facteur de rotation
    const omega = rotFactor * 6; // rad/s
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

  // on centre la parabole dans le grand canvas
  const offsetX = trajectoryCanvas.width * 0.1;
  const baselineY = trajectoryCanvas.height * 0.9;
  const scale = 0.7;

  tctx.clearRect(0, 0, trajectoryCanvas.width, trajectoryCanvas.height);

  // fond bleu
  tctx.fillStyle = "#66a3ff";
  tctx.fillRect(0, 0, trajectoryCanvas.width, trajectoryCanvas.height);

  const n = points.length;
  for (let i = 0; i < n; i++) {
    const p = points[i];

    // position du centre de gravité (point rouge)
    const cgx = offsetX + (p.xCG - first.xCG) * scale;
    const cgy = baselineY + (p.yCG - first.yCG) * scale;

    const progress = i / n;

    const angle = p.theta;

    const alphaGhost = 0.05 + 0.3 * progress;
    const alphaHandle = 0.12 + 0.55 * progress;

    // tête grise très transparente
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

    // manche doré plus visible
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

    // point rouge (centre de gravité) sur la parabole
    tctx.beginPath();
    tctx.fillStyle = `rgba(255,0,0,${0.6 + 0.4 * progress})`;
    tctx.arc(cgx, cgy, 6, 0, Math.PI * 2);
    tctx.fill();
  }
}

// --- navigation ---
btnTrajectoire.addEventListener("click", () => {
  console.log("clic trajectoire");
  trajectoryScreen.style.display = "flex";
  drawTrajectoryVisual();
});

btnRetour.addEventListener("click", () => {
  trajectoryScreen.style.display = "none";
});

btnQuitter.addEventListener("click", () => {
  window.location.reload();
});

// on force le sélecteur sur "centre de gravité" et on dessine
pointPosSelect.value = "cg";
pointPosSelect.disabled = true; // on fixe ce choix pour ton cas
updatePointTFromSelect();
