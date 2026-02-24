const g = 9.81;
console.log("JS chargé (cg = parabole, extrémité = cycloïde)");

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

// centre de gravité proche de la tête
const cgOffset = 0.15;

// animation
let animationId = null;
let trajectoryData = null;
let currentIndex = 0;

// t du point rouge sur le manche
let pointT = 1;

// ---------- DESSIN MARTEAU PAGE PRINCIPALE ----------
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
    pointT = cgOffset;      // centre de gravité
  } else if (val === "middle") {
    pointT = 0.5;           // milieu du manche
  } else {
    // "end" : extrémité du manche
    pointT = 1.0;
  }
  drawHammerScene();
}

// ---------- CALCUL TRAJECTOIRE ----------
function computeFullTrajectory() {
  const speed = parseFloat(speedSelect.value);
  const rotFactor = parseFloat(rotationSelect.value);

  const pivotX = hammer.x;
  const pivotY = hammer.y;

  const cgX0 = pivotX + cgOffset * hammer.handleLength;
  const cgY0 = pivotY;

  const launchAngle = Math.PI * 0.7; // lancer vers le haut (~70°)
  const v0 = speed * 30;

  const dt = 0.06;
  const raw = [];
  let t = 0;

  while (t < 7) {
    // trajectoire parabolique du centre de gravité
    const xCG = cgX0 + v0 * Math.cos(launchAngle) * t;
    const yCG =
      cgY0 - (v0 * Math.sin(launchAngle) * t - 0.5 * g * 1.8 * t * t);

    if (yCG > cgY0 + 260) break; // on arrête après la descente

    const isCG = Math.abs(pointT - cgOffset) < 0.001;
    let xP, yP;

    if (isCG) {
      // CAS 1 : point rouge = centre de gravité → parabole pure
      xP = xCG;
      yP = yCG;
    } else {
      // CAS 2 : point ≠ CG → cycloïde autour de la parabole
      const R = Math.abs(pointT - cgOffset) * hammer.handleLength || 1;
      const vCycle = (5 + 10 * (rotFactor / 10)) * (pointT > cgOffset ? 1 : -1);
      const s = vCycle * t / R;

      // cycloïde standard
      const xCyc = R * (s - Math.sin(s));
      const yCyc = R * (1 - Math.cos(s));

      // on oriente la cycloïde dans le plan selon l'angle de tir
      const cosA = Math.cos(launchAngle - Math.PI / 2);
      const sinA = Math.sin(launchAngle - Math.PI / 2);

      const dx = xCyc * cosA - yCyc * sinA;
      const dy = xCyc * sinA + yCyc * cosA;

      xP = xCG + dx;
      yP = yCG + dy;
    }

    // orientation du marteau :
    // - si point = extrémité, on impose que l'extrémité du manche soit ce point
    // - sinon, rotation "décorative" plus faible
    let theta;
    if (pointPosSelect.value === "end") {
      const dxE = xP - xCG;
      const dyE = yP - yCG;
      // l'extrémité du manche est à (1-cgOffset)*L à droite du CG
      const refX = (1 - cgOffset) * hammer.handleLength;
      theta = Math.atan2(dyE, dxE) - Math.atan2(0, refX);
    } else {
      const baseOmegaCG = 0.25;
      const baseOmegaOther = 1.2;
      const baseOmega = isCG ? baseOmegaCG : baseOmegaOther;
      const omega = baseOmega * (rotFactor / 10);
      theta = omega * t;
    }

    raw.push({ t, xCG, yCG, xP, yP, theta });
    t += dt;
  }

  if (raw.length === 0) return null;

  // cadrage sur le CG
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

  return { points };
}

// ---------- ANIMATION ----------
function startAnimation() {
  console.log("Position choisie:", pointPosSelect.value);
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

  const stepDraw = 3;

  for (let i = 0; i <= currentIndex; i += stepDraw) {
    const p = points[i];
    const progress = i / (n - 1);
    const angle = p.theta;

    const alphaGhost = 0.04 + 0.22 * progress;
    const alphaHandle = 0.12 + 0.55 * progress;
    const alphaPointTrace = 0.15 + 0.5 * progress;

    // tête
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

    // manche
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

    // trace point rouge
    tctx.beginPath();
    tctx.fillStyle = `rgba(255,0,0,${alphaPointTrace})`;
    tctx.arc(p.px, p.py, 3, 0, Math.PI * 2);
    tctx.fill();
  }

  // point rouge courant
  const pCur = points[currentIndex];
  tctx.beginPath();
  tctx.fillStyle = "rgba(255,0,0,1)";
  tctx.arc(pCur.px, pCur.py, 5, 0, Math.PI * 2);
  tctx.fill();

  currentIndex++;
  animationId = requestAnimationFrame(animateStep);
}

// ---------- NAVIGATION ----------
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

pointPosSelect.addEventListener("change", updatePointTFromSelect);

// initialisation
updatePointTFromSelect();
