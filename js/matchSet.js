function initScoreCanvas(id) {
  const canvas = document.getElementById(`targetCanvas${id}`);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const img = new Image();
  img.src = "img/target1.png";

  let markers = [];
  let dragIndex = null;
  const markerRadius = 20;

  const editSelect = document.createElement("select");
  [10, 9, 7, 5, 3, 0].forEach(v => {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    editSelect.appendChild(opt);
  });
  editSelect.style.position = "absolute";
  editSelect.style.display = "none";
  document.body.appendChild(editSelect);

  let editIndex = null;
  let scaleFactor = 1;
  let longPressTimer = null;
  const longPressDuration = 800;
  let isDragging = false; // ←追加

  window[`setData${id}`] = { markers, editSelect };

  // --- 初期描画 ---
  img.onload = () => {
    canvas.width = img.width;
    canvas.height = img.height;
    canvas.style.width = img.width * 1.5 + "px";
    canvas.style.height = img.height * 1.5 + "px";
    scaleFactor = canvas.clientWidth / canvas.width;
    drawCanvas();
  };

  function startPress(x, y) {
    dragIndex = null;
    editIndex = null;
    for (let i = markers.length - 1; i >= 0; i--) {
      const dx = x - markers[i].x;
      const dy = y - markers[i].y;
      if (dx * dx + dy * dy <= markerRadius * markerRadius) {
        dragIndex = i;
        editIndex = i;
        longPressTimer = setTimeout(() => {
          markers.splice(i, 1);
          dragIndex = null;
          editIndex = null;
          updateScoreBoard();
          drawCanvas();
        }, longPressDuration);
        showEditSelect(i);
        return true;
      }
    }
    return false;
  }

  function moveMarker(x, y) {
    if (dragIndex === null) return;
    if (longPressTimer) clearTimeout(longPressTimer);
    isDragging = true; // ←ドラッグ開始
    markers[dragIndex].x = x;
    markers[dragIndex].y = y;
    drawCanvas();
  }

  function endPress() {
    if (longPressTimer) clearTimeout(longPressTimer);
    dragIndex = null;
    updateScoreBoard();
    drawCanvas();
    isDragging = false; // ←ドラッグ終了
  }

  function getEventPosition(e) {
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return { x: (clientX - rect.left) / scaleFactor, y: (clientY - rect.top) / scaleFactor };
  }

  function handlePress(pos, e) {
    // 長押しやドラッグ中のみ preventDefault
    if (startPress(pos.x, pos.y)) e.preventDefault(); 
    else if (e.type.startsWith("touch")) e.stopPropagation(); // タップはスクロールOK
    else {
      const pixel = getImagePixelColor(pos.x, pos.y, img);
      const score = getScoreFromColor(pixel);
      markers.push({ x: pos.x, y: pos.y, score });
      updateScoreBoard();
      drawCanvas();
    }
  }

  function showEditSelect(i) {
    const marker = markers[i];
    const rect = canvas.getBoundingClientRect();
    const x = marker.x * scaleFactor + rect.left - editSelect.offsetWidth / 2;
    const y = marker.y * scaleFactor + rect.top - editSelect.offsetHeight / 2;
    editSelect.style.left = x + "px";
    editSelect.style.top = y + "px";
    editSelect.value = marker.score;
    editSelect.style.display = "block";
    editSelect.focus();
  }

  editSelect.addEventListener("change", () => {
    if (editIndex !== null) {
      markers[editIndex].score = parseInt(editSelect.value);
      updateScoreBoard();
      drawCanvas();
    }
  });
  editSelect.addEventListener("blur", () => { editSelect.style.display = "none"; editIndex = null; });

  function getImagePixelColor(x, y, img) {
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = img.width;
    tempCanvas.height = img.height;
    const tempCtx = tempCanvas.getContext("2d");
    tempCtx.drawImage(img, 0, 0);
    let r = 0, g = 0, b = 0, count = 0;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (x + dx < 0 || y + dy < 0 || x + dx >= img.width || y + dy >= img.height) continue;
        const data = tempCtx.getImageData(x + dx, y + dy, 1, 1).data;
        r += data[0]; g += data[1]; b += data[2]; count++;
      }
    }
    return [Math.round(r / count), Math.round(g / count), Math.round(b / count), 255];
  }

function colorDistance([r, g, b], [tr, tg, tb]) {
  return Math.sqrt((r - tr) ** 2 + (g - tg) ** 2 + (b - tb) ** 2);
}

function getScoreFromColor([r, g, b, a]) {
  if (a === 0) return 0; // 透明（無色）は0点

  // 明るい灰色〜白は無色扱い
  if (r > 240 && g > 240 && b > 240) return 0;

  // HSLに変換して色相判定
  const toHsl = (r, g, b) => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h *= 60;
    }
    return { h, s, l };
  };

  const { h, s, l } = toHsl(r, g, b);

  // 黒
  if (l < 0.15) return 5;
  // 黄（10点）
  if (h >= 40 && h <= 70 && s > 0.35 && l > 0.25) return 10;
  // 赤（9点）
  if ((h >= 345 || h <= 20) && s > 0.3) return 9;
  // 青（7点）— 範囲を拡張して安定化
  if ((h >= 180 && h <= 280 && s > 0.15 && l > 0.05) || (b > 80 && b > r * 0.8 && b > g * 1.1)) return 7;
  // 白（3点）
  if (l > 0.85 && s < 0.25) return 3;

  return 0;
}

  function updateScoreBoard() {
    const list = document.getElementById(`scoreList${id}`);
    const totalElem = document.getElementById(`totalScore${id}`);
    list.innerHTML = "";
    let total = 0;
    markers.forEach((m, i) => {
      const li = document.createElement("li");
      li.textContent = `矢${i + 1}: ${m.score}点`;
      li.addEventListener("click", (e) => { e.preventDefault(); editIndex = i; showEditSelect(i); });
      list.appendChild(li);
      total += m.score;
    });
    totalElem.textContent = total;
  }

  function drawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    markers.forEach((marker, index) => {
      let strokeColor;
      switch (marker.score) {
        case 10: strokeColor = 'yellow'; break;
        case 9: strokeColor = 'red'; break;
        case 7: strokeColor = 'blue'; break;
        case 5: strokeColor = 'black'; break;
        case 3: strokeColor = 'white'; break;
        default: strokeColor = 'gray';
      }
      ctx.beginPath();
      ctx.arc(marker.x, marker.y, markerRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'white';
      ctx.fill();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = 'black';
      ctx.font = `bold ${18 * scaleFactor}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((index + 1).toString(), marker.x, marker.y);
    });
  }

  function resetScoreCanvas() {
    markers.length = 0;
    updateScoreBoard();
    drawCanvas();
    editSelect.style.display = "none";
  }

  canvas.resetScoreCanvas = resetScoreCanvas;

  // --- イベント ---
  canvas.addEventListener("mousedown", e => handlePress(getEventPosition(e), e));
  canvas.addEventListener("mousemove", e => moveMarker(getEventPosition(e).x, getEventPosition(e).y));
  canvas.addEventListener("mouseup", endPress);
  canvas.addEventListener("mouseleave", endPress);

  canvas.addEventListener("touchstart", e => handlePress(getEventPosition(e), e), { passive: true });
  canvas.addEventListener("touchmove", e => { if (isDragging) e.preventDefault(); moveMarker(getEventPosition(e).x, getEventPosition(e).y); }, { passive: false });
  canvas.addEventListener("touchend", endPress);
  canvas.addEventListener("touchcancel", endPress);
}
function forceCanvasTouchAction() {
  // ID が targetCanvas_0 の canvas を取得
  const canvas = document.getElementById("targetCanvas_0");
  if (canvas) {
    // touch-action を auto に強制（!important付き）
    canvas.style.setProperty("touch-action", "auto", "important");
  }
}

// ページ読み込み時に実行
window.addEventListener("DOMContentLoaded", forceCanvasTouchAction);

// もし canvas が動的に生成される場合は、生成直後にも呼ぶ
// 例: initScoreCanvas 内で
// canvas.style.setProperty("touch-action", "auto", "important");
