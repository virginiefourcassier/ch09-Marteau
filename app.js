const g = 9.81;
console.log("JS chargé (version CG)");

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

// on fixe le centre de gravité approximatif au milieu de la tête + 1/3 du manche
const cgOffset = 0.3; // 0 = pivot, 1 = extrémité du manche

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

// --- trajectoire réaliste visuelle : CG + rotation autour ---
// 1. trajectoire du centre de gravité = parabole
// 2. point rouge = CG + rotation autour d'un rayon R

function computeTrajectoryCG() {
  const speed = parseFloat(speedSelect.value);      // 2..10
  const rotFactor = parseFloat(rotationSelect.value); // 1..10

  // position initiale au pivot
  const pivotX = hammer.x;
  const pivotY = hammer.y;

  // centre de gravité approximatif sur le manche
  const cgX0 = pivotX + cgOffset * hammer.handleLength;
  const cgY0 = pivotY;

  // vitesse initiale du centre de gravité (projectile)
  const launchAngle = Math.PI / 3; // 60°
  const v0 = speed * 40;           // échelle visuelle

  const dt = 0.03;
  const points = [];

  let t = 0;
  while (t < 4) {
    const xCG = cgX0 + v0 * Math.cos(launchAngle) * t;
    const yCG =
      cgY0 - (v0 * Math.sin(launchAngle) * t - 0.5 * g * 3 * t * t); // parabole

    if (yCG > trajectoryCanvas.height + 100) break;

    // distance du point rouge au centre de gravité (en pixels)
    const R =
      Math.abs(pointT - cgOffset) * hammer.handleLength; // 0 si point sur CG

    // vitesse angulaire : plus rotFactor est grand, plus ça tourne
    const omega = rotFactor * 5; // rad/s (échelle visuelle)

    // angle de rotation au temps t
    const theta = omega * t;

    // vecteur du CG vers le point rouge à t=0 (on suppose aligné sur le manche)
    const dx0 = (pointT - cgOffset) * hammer.handleLength;
    const dy0 = 0;

    // rotation de ce vecteur de theta autour du CG
    const dx = dx0 * Math.cos(theta) - dy0 * Math.sin(theta);
    const dy = dx0 * Math.sin(theta) + dy0 * Math.cos(theta);

    const xP = xCG + dx;
    const yP = yCG + dy;

    points.push({
      xCG,
      yCG,
      xP,
      yP,
      t
    });

    t += dt;
  }

  return { cgX0, cgY0, points };
}

// --- dessin sur le grand canvas ---
function drawTrajectoryVisual() {
  const { points } = computeTrajectoryCG();

  const offsetX = trajectoryCanvas.width * 0.05;
  const baselineY = trajectoryCanvas.height * 0.8;
  const scale = 0.7;

  tctx.clearRect(0, 0, trajectoryCanvas.width, trajectoryCanvas.height);

  tctx.fillStyle = "#66a3ff";
  tctx.fillRect(0, 0, trajectoryCanvas.width, trajectoryCanvas.height);

  const n = points.length;
  for (let i = 0; i < n; i++) {
    const p = points[i];

    // position du CG pour placer le marteau
    const hx = offsetX + (p.xCG - points[0].xCG) * scale;
    const hy = baselineY + (p.yCG - points[0].yCG) * scale;

    const progress = i / n;

    // angle de rotation déduit du point rouge par rapport au CG
    const dx = p.xP - p.xCG;
    const dy = p.yP - p.yCG;
    const angle = Math.atan2(dy, dx); // orientation du manche

    const alphaGhost = 0.05 + 0.25 * progress;
    const alphaHandle = 0.15 + 0.6 * progress;

    // ombre gris clair
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
    const xPoint = offsetX + (p.xP - points[0].xCG) * scale;
    const yPoint = baselineY + (p.yP - points[0].yCG) * scale;

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

// dessin initial
drawHammerScene();
