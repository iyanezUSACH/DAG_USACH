const allGroups = Array.from({ length: 7 }, (_, i) => `Grupo ${i + 1}`);

const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");
const spinBtn = document.getElementById("spinBtn");
const resetBtn = document.getElementById("resetBtn");
const currentPick = document.getElementById("currentPick");
const orderList = document.getElementById("orderList");

let remaining = [...allGroups];
let chosenOrder = [];
let rotation = 0;
let isSpinning = false;

const segmentColors = [
  "#00a9a0",
  "#f28c00",
  "#39424e",
  "#5fb8b3",
  "#efb066",
  "#6f7985",
  "#7fd1cc",
];

function drawWheel(items, rot = 0) {
  const radius = canvas.width / 2;
  const center = radius;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (items.length === 0) {
    ctx.beginPath();
    ctx.arc(center, center, radius - 6, 0, Math.PI * 2);
    ctx.fillStyle = "#e4e4e4";
    ctx.fill();

    ctx.fillStyle = "#2a2a2a";
    ctx.font = "bold 30px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("FIN", center, center + 10);
    return;
  }

  const arc = (Math.PI * 2) / items.length;

  items.forEach((item, i) => {
    const start = rot + i * arc;
    const end = start + arc;

    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.arc(center, center, radius - 6, start, end);
    ctx.closePath();
    ctx.fillStyle = segmentColors[i % segmentColors.length];
    ctx.fill();

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(start + arc / 2);
    ctx.textAlign = "right";
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 25px sans-serif";
    ctx.fillText(item, radius - 24, 8);
    ctx.restore();
  });

  ctx.beginPath();
  ctx.arc(center, center, 28, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.strokeStyle = "#39424e";
  ctx.lineWidth = 4;
  ctx.stroke();
}

function renderOrder() {
  orderList.innerHTML = "";
  chosenOrder.forEach((group) => {
    const li = document.createElement("li");
    li.textContent = group;
    orderList.appendChild(li);
  });
}

function spin() {
  if (isSpinning || remaining.length === 0) {
    return;
  }

  isSpinning = true;
  spinBtn.disabled = true;
  currentPick.textContent = "Girando...";

  const selectedIndex = Math.floor(Math.random() * remaining.length);
  const arc = (Math.PI * 2) / remaining.length;
  const targetAngle = (Math.PI * 1.5) - (selectedIndex * arc + arc / 2);
  const extraSpins = Math.PI * 2 * (4 + Math.floor(Math.random() * 3));
  const finalRotation = extraSpins + targetAngle;

  const initialRotation = rotation;
  const duration = 2800;
  const start = performance.now();

  function animate(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 4);

    rotation = initialRotation + (finalRotation - initialRotation) * eased;
    drawWheel(remaining, rotation);

    if (progress < 1) {
      requestAnimationFrame(animate);
      return;
    }

    const selected = remaining[selectedIndex];
    chosenOrder.push(selected);
    remaining.splice(selectedIndex, 1);

    rotation = 0;
    drawWheel(remaining, rotation);

    currentPick.textContent = `Sale: ${selected}`;
    renderOrder();

    isSpinning = false;
    spinBtn.disabled = remaining.length === 0;

    if (remaining.length === 0) {
      currentPick.textContent = "Orden completo generado ✅";
    }
  }

  requestAnimationFrame(animate);
}

function resetAll() {
  remaining = [...allGroups];
  chosenOrder = [];
  rotation = 0;
  isSpinning = false;
  currentPick.textContent = "Aún no hay grupo seleccionado.";
  spinBtn.disabled = false;
  renderOrder();
  drawWheel(remaining, rotation);
}

spinBtn.addEventListener("click", spin);
resetBtn.addEventListener("click", resetAll);

drawWheel(remaining, rotation);
