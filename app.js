const g = 9.81;
console.log("JS chargé (version simplifiée)");

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

// point rouge (t = 0..1 sur le manche)
let pointT = 1;

// --- dessin marteau à l'écran principal ---
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

// mettre pointT en fonction du choix de l'élève
function updatePointTFromSelect() {
  const val = pointPosSelect.value;
  if (val === "cg") {
    pointT = cgOffset; // autour du centre de gravité
  } else if (val === "middle") {
    pointT = 0.5;
  } else {
    // "end"
    pointT = 1.0;
  }
  drawHammerScene();
}

// --- trajectoire : centre de gravité en parabole + rotation ---
function computeTrajectoryCG() {
  const speed = parseFloat(speedSelect.value); // 5 ou 10
  const rotFactor = parseFloat(rotationSelect.value); // 1 ou 10

  const pivotX = hammer.x;
  const pivotY = hammer.y;

  const cgX0 = pivotX + cgOffset * hammer.handleLength;
  const cgY0 = pivotY;

  // parabole pour le centre de gravité
  const launchAngle = Math.PI * 0.6; // 108°, pour ressembler à ton SWF
  const v0 = speed * 40;

  const dt = 0.03;
  const points = [];

  let t = 0;
  while (t < 4.5) {
    const xCG = cgX0 + v0 * Math.cos(launchAngle) * t;
    const yCG =
      cgY0 - (v0 * Math.sin(launchAngle) * t - 0.5 * g * 3 * t * t);

    if (yCG > trajectoryCanvas.height + 120) break;

    const R = Math.abs(pointT - cgOffset) * hammer.handleLength;

    const omega = rotFactor * 5;
    const theta = omega * t;

    const dx0 = (pointT - cgOffset) * hammer.handleLength;
    const dy0 = 0;

    const dx = dx0 * Math.cos(theta) - dy0 * Math.sin(theta);
    const dy = dx0 * Math.sin(theta) + dy0 * Math.cos(theta);

    const xP = xCG + dx;
    const yP = yCG + dy;

    points.push({ xCG, yCG, xP, yP });
    t += dt;
  }

  return { points };
}

// --- dessin sur le grand canvas ---
function drawTrajectoryVisual() {
  const { points } = computeTrajectoryCG();
  if (points.length === 0) return;

  const first = points[0];

  const offsetX = trajectoryCanvas.width * 0.05;
  const baselineY = trajectoryCanvas.height * 0.85;
  const scale = 0.7;

  tctx.clearRect(0, 0, trajectoryCanvas.width, trajectoryCanvas.height);

  tctx.fillStyle = "#66a3ff";
  tctx.fillRect(0, 0, trajectoryCanvas.width, trajectoryCanvas.height);

  const n = points.length;
  for (let i = 0; i < n; i++) {
    const p = points[i];

    const hx = offsetX + (p.xCG - first.xCG) * scale;
    const hy = baselineY + (p.yCG - first.yCG) * scale;

    const progress = i / n;

    const dx = p.xP - p.xCG;
    const dy = p.yP - p.yCG;
    const angle = Math.atan2(dy, dx);

    const alphaGhost = 0.05 + 0.25 * progress;
    const alphaHandle = 0.15 + 0.6 * progress;

    // ombre gris clair du marteau
    tctx.save();
    tctx.translate(hx, hy);
    tctx.rotate(angle);

    tctx.fillStyle = `rgba(150,150,150,${alphaGhost})`;
    tctx.fillRect(
      -hammer.handleLength * cgOffset,
      -hammer.handleThickness / 2,
      hammer.handleLength,
      hammer.handleThickness
    );

    tctx.beginPath();
    tctx.fillStyle = `rgba(150,150,150,${alphaGhost})`;
    tctx.moveTo(
      -hammer.handleLength * cgOffset - hammer.headWidth,
      -hammer.headHeight * 0.45
    );
    tctx.lineTo(-hammer.handleLength * cgOffset, -hammer.headHeight * 0.45);
    tctx.lineTo(-hammer.handleLength * cgOffset, hammer.headHeight * 0.45);
    tctx.lineTo(
      -hammer.handleLength * cgOffset - hammer.headWidth * 0.6,
      hammer.headHeight * 0.25
    );
    tctx.lineTo(
      -hammer.handleLength * cgOffset - hammer.headWidth,
      hammer.headHeight * 0.45
    );
    tctx.closePath();
    tctx.fill();

    tctx.restore();

    // manche doré
    tctx.save();
    tctx.translate(hx, hy);
    tctx.rotate(angle);
    tctx.fillStyle = `rgba(255,204,51,${alphaHandle})`;
    tctx.fillRect(
      -hammer.handleLength * cgOffset,
      -hammer.handleThickness / 2,
      hammer.handleLength,
      hammer.handleThickness
    );
    tctx.restore();

    // point rouge
    const xPoint = offsetX + (p.xP - first.xCG) * scale;
    const yPoint = baselineY + (p.yP - first.yCG) * scale;

    tctx.beginPath();
    tctx.fillStyle = `rgba(255,0,0,${0.4 + 0.5 * progress})`;
    tctx.arc(xPoint, yPoint, 6, 0, Math.PI * 2);
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

// réagit au changement de position du point
pointPosSelect.addEventListener("change", updatePointTFromSelect);

// dessin initial
updatePointTFromSelect();
