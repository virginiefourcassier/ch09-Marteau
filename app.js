// ----- paramètres généraux -----
const g = 9.81; // gravité

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

// géométrie du marteau (en pixels, dans le canvas vert)
const hammer = {
  x: hammerCanvas.width * 0.25,
  y: hammerCanvas.height * 0.6,
  handleLength: 260,
  handleThickness: 26,
  headWidth: 80,
  headHeight: 120
};

// point rouge (fraction de la longueur du manche)
let pointT = 1; // 0 = base manche, 1 = extrémité
let draggingPoint = false;

// ----- dessin du marteau -----
function drawHammerScene() {
  hctx.clearRect(0, 0, hammerCanvas.width, hammerCanvas.height);

  // marteau : on place le pivot à gauche du manche
  const pivotX = hammer.x;
  const pivotY = hammer.y;

  hctx.save();
  hctx.translate(pivotX, pivotY);

  // manche
  hctx.fillStyle = "#ffcc33";
  hctx.fillRect(0, -hammer.handleThickness / 2, hammer.handleLength, hammer.handleThickness);

  // tête (à gauche du manche)
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

// conversions souris → position le long du manche
function canvasToLocalHandle(x, y) {
  const rect = hammerCanvas.getBoundingClientRect();
  const mx = x - rect.left;
  const my = y - rect.top;

  // ici le marteau n'est pas encore tourné, donc on suppose manche horizontal
  const pivotX = hammer.x;
  const pivotY = hammer.y;

  const localX = mx - pivotX;
  const localY = my - pivotY;

  return { localX, localY };
}

function updatePointFromMouse(evt) {
  const { localX, localY } = canvasToLocalHandle(evt.clientX, evt.clientY);

  // vérifier qu'on est proche du manche
  if (Math.abs(localY) < hammer.handleThickness * 2) {
    let t = localX / hammer.handleLength;
    t = Math.max(0, Math.min(1, t));
    pointT = t;
    drawHammerScene();
  }
}

// events souris pour déplacer le point rouge
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

// ----- calcul de la trajectoire -----
function computeTrajectory() {
  const speed = parseFloat(speedSelect.value); // m/s (on va l'utiliser comme facteur)
  const rotFactor = parseFloat(rotationSelect.value);

  // position initiale du point choisi (en pixels, on s'en sert comme unités)
  const startX = hammer.x + pointT * hammer.handleLength;
  const startY = hammer.y;

  // angle de lancer : par exemple 60° moins un terme lié au point
  const baseAngle = Math.PI / 3;
  const angle = baseAngle - (pointT - 0.5) * (Math.PI / 6) * rotFactor / 5;

  const v0 = speed * 20; // facteur arbitraire pour que ça remplisse l'écran

  const dt = 0.03;
  const points = [];

  let t = 0;
  let x = startX;
  let y = startY;
  while (t < 4) {
    x = startX + v0 * Math.cos(angle) * t;
    y = startY - (v0 * Math.sin(angle) * t - 0.5 * g * (30 / 9.81) * t * t); // échelle verticale

    if (y > trajectoryCanvas.height + 100) break;

    points.push({ x, y });
    t += dt;
  }

  return { startX, startY, points };
}

// ----- affichage de la trajectoire -----
function drawTrajectory() {
  const { startX, startY, points } = computeTrajectory();

  // adapter les coordonnées à la taille du canvas de trajectoire
  const offsetX = trajectoryCanvas.width * 0.1;
  const offsetY = trajectoryCanvas.height * 0.7;
  const scale = 0.8; // mise à l'échelle

  tctx.clearRect(0, 0, trajectoryCanvas.width, trajectoryCanvas.height);

  // fond bleu
  tctx.fillStyle = "#66a3ff";
  tctx.fillRect(0, 0, trajectoryCanvas.width, trajectoryCanvas.height);

  // dessin de multiples positions du marteau (effet "fane" comme ton SWF)
  const n = points.length;
  for (let i = 0; i < n; i += 2) {
    const p = points[i];

    const alpha = 0.05 + 0.6 * (i / n);
    const hx = offsetX + (p.x - startX) * scale;
    const hy = offsetY + (p.y - startY) * scale;

    tctx.save();
    tctx.translate(hx, hy);
    tctx.rotate(-0.6 * (i / n)); // rotation progressive

    // manche
    tctx.fillStyle = `rgba(255, 204, 51, ${alpha})`;
    tctx.fillRect(
      -hammer.handleLength * 0.1,
      -hammer.handleThickness / 2,
      hammer.handleLength * 0.6,
      hammer.handleThickness
    );

    // point rouge
    tctx.beginPath();
    tctx.fillStyle = `rgba(255, 0, 0, ${Math.min(1, alpha + 0.2)})`;
    tctx.arc(
      -hammer.handleLength * 0.1 + pointT * hammer.handleLength * 0.6,
      0,
      6,
      0,
      Math.PI * 2
    );
    tctx.fill();

    tctx.restore();
  }
}

// ----- navigation -----
btnTrajectoire.addEventListener("click", () => {
  trajectoryScreen.classList.remove("hidden");
  drawTrajectory();
});

btnRetour.addEventListener("click", () => {
  trajectoryScreen.classList.add("hidden");
});

btnQuitter.addEventListener("click", () => {
  // pour l'instant: simple refresh
  window.location.reload();
});

// dessin initial
drawHammerScene();
