const g = 9.81;
console.log("JS chargé (version découpée CG / cycloïde)");

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

// centre de gravité (0 = pivot, 1 = extrémité manche)
const cgOffset = 0.15;

// animation
let animationId = null;
let trajectoryData = null;
let currentIndex = 0;

// point rouge sur le manche
let pointT = 1;

// --------- DESSIN MARTEAU PAGE PRINCIPALE ----------
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

function updatePointTFromSelect() {
  const val = pointPosSelect.value;
  if (val === "cg") {
    pointT = cgOffset;
  } else if (val === "middle") {
    pointT = 0.5;
  } else {
    // "end"
    pointT = 1.0;
  }
  drawHammerScene();
}

// --------- CALCUL TRAJECTOIRE : CAS CENTRE DE GRAVITÉ ----------
function computeTrajectoryCG() {
  const speed = parseFloat(speedSelect.value);
  const rotFactor = parseFloat(rotationSelect.value);

  const pivotX = hammer.x;
  const pivotY = hammer.y;
  const cgX0 = pivotX + cgOffset * hammer.handleLength;
  const cgY0 = pivotY;

  const launchAngle = Math.PI * 0.7;
  const v0 = speed * 30;

  const v0y = v0 * Math.sin(launchAngle);
  const timeOfFlight = (2 * v0y) / (g * 1.1);

  // peu de points → parabole propre
  const dt = timeOfFlight / 80;
  const raw = [];
  let t = 0;

  const omegaBase = 1.6;
  const omega = (rotFactor / 10) * omegaBase;

  while (t <= timeOfFlight) {
    const xCG = cgX0 + v0 * Math.cos(launchAngle) * t;
    const yCG =
      cgY0 - (v0 * Math.sin(launchAngle) * t - 0.5 * g * 1.1 * t * t);

    const theta = omega * t;

    const xP = xCG;
    const yP = yCG;

    raw.push({ t, xCG, yCG, xP, yP, theta });
    t += dt;
  }

  if (!raw.length) return null;

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

  return raw.map((p) => {
    const cgx = margin + (p.xCG - minX) * scale;
    const cgy = margin + (p.yCG - minY) * scale;
    const px = cgx;
    const py = cgy;
    return { ...p, cgx, cgy, px, py };
  });
}

// --------- CALCUL TRAJECTOIRE : CAS CYCLOÏDE (MILIEU / EXTRÉMITÉ) ----------
function computeTrajectoryCycloid() {
  const speed = parseFloat(speedSelect.value);
  const rotFactor = parseFloat(rotationSelect.value);

  const pivotX = hammer.x;
  const pivotY = hammer.y;
  const cgX0 = pivotX + cgOffset * hammer.handleLength;
  const cgY0 = pivotY;

  const launchAngle = Math.PI * 0.7;
  const v0 = speed * 30;

  const v0y = v0 * Math.sin(launchAngle);
  const timeOfFlight = (2 * v0y) / (g * 1.1);

  // PLUS DE POINTS pour une cycloïde plus fine
  const dt = timeOfFlight / 220; // ← augmenté (avant : /140)
  const raw = [];
  let t = 0;

  const L = (pointT - cgOffset) * hammer.handleLength;

  const omegaBase = 2.4;
  const omega = (rotFactor / 10) * omegaBase;

  while (t <= timeOfFlight) {
    const xCG = cgX0 + v0 * Math.cos(launchAngle) * t;
    const yCG =
      cgY0 - (v0 * Math.sin(launchAngle) * t - 0.5 * g * 1.1 * t * t);

    const theta = omega * t;

    const dirX = Math.cos(launchAngle);
    const dirY = -Math.sin(launchAngle);

    const vx0 = L * dirX;
    const vy0 = L * dirY;

    const cosR = Math.cos(theta);
    const sinR = Math.sin(theta);
    const vx = vx0 * cosR - vy0 * sinR;
    const vy = vx0 * sinR + vy0 * cosR;

    const xP = xCG + vx;
    const yP = yCG + vy;

    raw.push({ t, xCG, yCG, xP, yP, theta });
    t += dt;
  }

  if (!raw.length) return null;

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

  return raw.map((p) => {
    const cgx = margin + (p.xCG - minX) * scale;
    const cgy = margin + (p.yCG - minY) * scale;
    const px = margin + (p.xP - minX) * scale;
    const py = margin + (p.yP - minY) * scale;
    return { ...p, cgx, cgy, px, py };
  });
}

// --------- DISPATCH CALCUL SELON POSITION ----------
function computeFullTrajectory() {
  if (Math.abs(pointT - cgOffset) < 1e-3) {
    const pts = computeTrajectoryCG();
    return pts ? { points: pts } : null;
  } else {
    const pts = computeTrajectoryCycloid();
    return pts ? { points: pts } : null;
  }
}

// --------- ANIMATION (manche + tête visibles) ----------
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

  tctx.clearRect(0, 0, trajectoryCanvas.width, trajectoryCanvas.height);
  tctx.fillStyle = "#66a3ff";
  tctx.fillRect(0, 0, trajectoryCanvas.width, trajectoryCanvas.height);

  const isCG = Math.abs(pointT - cgOffset) < 1e-3;
  // densité encore augmentée pour cycloïde
  const stepDraw = isCG ? 4 : 3; // ← avant : 4 et 6

  for (let i = 0; i <= currentIndex; i += stepDraw) {
    const p = points[i];
    const progress = i / (n - 1);

    const alphaGhost = 0.05 + 0.25 * progress;
    const alphaHandle = 0.15 + 0.55 * progress;
    const alphaPointTrace = 0.15 + 0.5 * progress;

    const Ltot = hammer.handleLength;
    const Lavant = pointT * Ltot;
    const Lapres = Ltot - Lavant;

    const theta = p.theta;
    const dirX0 = Math.cos(Math.PI * 0.7);
    const dirY0 = -Math.sin(Math.PI * 0.7);
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    const ux = dirX0 * cosT - dirY0 * sinT;
    const uy = dirX0 * sinT + dirY0 * cosT;

    const pointRedX = p.px;
    const pointRedY = p.py;

    const pivotX = pointRedX - ux * Lavant;
    const pivotY = pointRedY - uy * Lavant;

    const endX = pointRedX + ux * Lapres;
    const endY = pointRedY + uy * Lapres;

    // manche
    tctx.strokeStyle = `rgba(255,204,51,${alphaHandle})`;
    tctx.lineWidth = hammer.handleThickness * 0.9;
    tctx.lineCap = "round";
    tctx.beginPath();
    tctx.moveTo(pivotX, pivotY);
    tctx.lineTo(endX, endY);
    tctx.stroke();

    // tête
    const headW = hammer.headWidth;
    const headH = hammer.headHeight;

    const nx = -uy;
    const ny = ux;

    const A = {
      x: pivotX - ux * headW,
      y: pivotY - uy * headW
    };
    const B = {
      x: pivotX,
      y: pivotY - ny * headH * 0.45
    };
    const C = {
      x: pivotX,
      y: pivotY + ny * headH * 0.45
    };
    const D = {
      x: pivotX - ux * headW * 0.6,
      y: pivotY + ny * headH * 0.25
    };
    const E = {
      x: pivotX - ux * headW,
      y: pivotY + ny * headH * 0.45
    };

    tctx.fillStyle = `rgba(150,150,150,${alphaGhost})`;
    tctx.beginPath();
    tctx.moveTo(A.x, A.y);
    tctx.lineTo(B.x, B.y);
    tctx.lineTo(C.x, C.y);
    tctx.lineTo(D.x, D.y);
    tctx.lineTo(E.x, E.y);
    tctx.closePath();
    tctx.fill();

    // point rouge
    tctx.beginPath();
    tctx.fillStyle = `rgba(255,0,0,${alphaPointTrace})`;
    tctx.arc(pointRedX, pointRedY, 3, 0, Math.PI * 2);
    tctx.fill();
  }

  const pCur = points[currentIndex];
  tctx.beginPath();
  tctx.fillStyle = "rgba(255,0,0,1)";
  tctx.arc(pCur.px, pCur.py, 5, 0, Math.PI * 2);
  tctx.fill();

  currentIndex++;
  animationId = requestAnimationFrame(animateStep);
}

// --------- NAVIGATION ----------
btnTrajectoire.addEventListener("click", () => {
  trajectoryScreen.classList.remove("hidden");
  startAnimation();
});

btnRetour.addEventListener("click", () => {
  trajectoryScreen.classList.add("hidden");
  if (animationId !== null) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
});

btnQuitter.addEventListener("click", () => {
  window.location.reload();
});

pointPosSelect.addEventListener("change", updatePointTFromSelect);

// initialisation
trajectoryScreen.classList.add("hidden");
updatePointTFromSelect();
