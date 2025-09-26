/* matchSet.js -- Pixelなどでもスクロール可能対応済み */
document.addEventListener("DOMContentLoaded", () => {
  const addSetBtn = document.getElementById("addSetBtn");
  const setsContainer = document.getElementById("setsContainer");
  const matchDate = document.getElementById("matchDate");
  const summaryContainer = document.getElementById("dailySummary");

  let setCount = 0;
  let currentDate = new Date().toISOString().split("T")[0];
  matchDate.value = currentDate;

  /* ---------- summary ---------- */
  function loadSummary() {
    const storedData = JSON.parse(localStorage.getItem("kyudoSetsByDate") || "{}");
    summaryContainer.innerHTML = "";

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const dates = Object.keys(storedData).sort().reverse();
    const filteredDates = dates.filter(date => {
      const [year, month] = date.split("-").map(Number);
      return year === currentYear && month === currentMonth;
    });

    if (filteredDates.length === 0) {
      summaryContainer.textContent = `${currentMonth}月の記録はありません`;
      return;
    }

    const grouped = {};
    filteredDates.forEach(date => {
      const [year, month] = date.split("-").slice(0, 2);
      const key = `${year}年${month}月`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(date);
    });

    Object.keys(grouped).forEach(monthKey => {
      const monthDiv = document.createElement("div");
      const title = document.createElement("h3");
      title.textContent = monthKey;
      monthDiv.appendChild(title);

      const ul = document.createElement("ul");
      ul.className = "space-y-1";
      grouped[monthKey].forEach(date => {
        const sets = storedData[date] || [];
        const tachisu = sets.length;
        let total = 0;
        sets.forEach(set => set.markers.forEach(m => { total += m.score; }));
        const li = document.createElement("li");
        li.textContent = `${date}　立ち ${tachisu}　合計 ${total}点`;
        li.style.cursor = "pointer";
        li.className = "px-2 py-1 rounded hover:bg-primary/20 dark:hover:bg-primary/30";
        li.addEventListener("click", () => setCurrentDate(date));
        ul.appendChild(li);
      });
      monthDiv.appendChild(ul);
      summaryContainer.appendChild(monthDiv);
    });
  }

  /* ---------- tools ---------- */
  function loadTools() {
    const data = localStorage.getItem("kyudoTools");
    return data ? JSON.parse(data) : { 弽: [], 弓: [], 矢: [], 弦: [] };
  }

  /* ---------- persistence & helpers ---------- */
  function loadSetsForDate(date) {
    const storedData = JSON.parse(localStorage.getItem("kyudoSetsByDate") || "{}");
    const setsData = storedData[date] || [];
    setsContainer.innerHTML = "";
    setCount = 0;
    setsData.forEach(set => addNewSet(set));
    loadSummary();
  }

  function saveSetsForDate(date, setsData) {
    const storedData = JSON.parse(localStorage.getItem("kyudoSetsByDate") || "{}");
    storedData[date] = setsData;
    localStorage.setItem("kyudoSetsByDate", JSON.stringify(storedData));
    loadSummary();
  }

  function getAllSetsData() {
    const setsData = [];
    setsContainer.querySelectorAll(".set-wrapper").forEach(setWrapper => {
      const canvas = setWrapper.querySelector("canvas");
      const markers = canvas && canvas.markers ? canvas.markers.map(m => ({ ...m })) : [];

      // 道具状態を保存
      const toolsState = {};
      setWrapper.querySelectorAll(".tool-select").forEach(select => {
        const category = select.parentElement.textContent.split(":")[0];
        toolsState[category] = select.value;
      });

      setsData.push({ markers, toolsState });
    });
    return setsData;
  }

  function setCurrentDate(newDate) {
    saveSetsForDate(currentDate, getAllSetsData());
    currentDate = newDate;
    matchDate.value = currentDate;
    loadSetsForDate(currentDate);
  }

  matchDate.addEventListener("change", () => setCurrentDate(matchDate.value));
  addSetBtn.addEventListener("click", () => {
    addNewSet();
    saveSetsForDate(currentDate, getAllSetsData());
  });

  /* ---------- add set UI ---------- */
  function addNewSet(existingSet = null) {
    const setIndex = setCount++;
    const setWrapper = document.createElement("div");
    setWrapper.className = "set-wrapper p-4 bg-white dark:bg-slate-900 rounded-xl shadow-lg space-y-2";
    setWrapper.dataset.index = setIndex;

    const titleDiv = document.createElement("div");
    titleDiv.className = "flex justify-between items-center";
    const title = document.createElement("h2");
    title.textContent = `立ち ${setIndex + 1}`;
    title.className = "font-bold text-lg";
    titleDiv.appendChild(title);

    const delSetBtn = document.createElement("button");
    delSetBtn.textContent = "削除";
    delSetBtn.className = "px-2 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700";
    delSetBtn.addEventListener("click", () => {
      setWrapper.remove();
      saveSetsForDate(currentDate, getAllSetsData());
    });
    titleDiv.appendChild(delSetBtn);
    setWrapper.appendChild(titleDiv);

    // tools area
    const toolSection = document.createElement("div");
    toolSection.className = "tools space-y-1";
    const tools = loadTools();
    Object.keys(tools).forEach(category => {
      const label = document.createElement("label");
      label.textContent = category + ": ";
      label.className = "tool-label block";

      const select = document.createElement("select");
      select.className = "tool-select rounded border px-2 py-1 w-full dark:bg-slate-700 dark:text-white";

      const emptyOpt = document.createElement("option");
      emptyOpt.value = "";
      emptyOpt.textContent = "選択してください";
      select.appendChild(emptyOpt);

      tools[category].forEach(item => {
        const opt = document.createElement("option");
        opt.value = item.name;
        opt.textContent = `${item.name}${item.feature ? " (" + item.feature + ")" : ""}`;
        select.appendChild(opt);
      });

      // 道具の復元
      if (existingSet && existingSet.toolsState && existingSet.toolsState[category]) {
        select.value = existingSet.toolsState[category];
      }

      select.addEventListener("change", () => {
        saveSetsForDate(currentDate, getAllSetsData());
      });

      label.appendChild(select);
      toolSection.appendChild(label);
    });
    setWrapper.appendChild(toolSection);

    // canvas
    const canvasContainer = document.createElement("div");
    canvasContainer.className = "canvas-container";
    const canvas = document.createElement("canvas");
    canvas.id = `targetCanvas_${setIndex}`;
    canvas.style.touchAction = "auto"; // ← スクロール可能に
    canvasContainer.appendChild(canvas);
    setWrapper.appendChild(canvasContainer);

    // scoreboard
    const scoreBoard = document.createElement("div");
    scoreBoard.className = "score-board space-y-1";
    const ul = document.createElement("ul");
    ul.id = `scoreList_${setIndex}`;
    ul.className = "score-list space-y-1";
    scoreBoard.appendChild(ul);
    const totalP = document.createElement("p");
    totalP.innerHTML = `合計: <span id="totalScore_${setIndex}">0</span>`;
    scoreBoard.appendChild(totalP);
    const resetBtn = document.createElement("button");
    resetBtn.textContent = "リセット";
    resetBtn.className = "px-2 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700";
    resetBtn.addEventListener("click", () => {
      if (canvas.markers) canvas.markers.length = 0;
      drawCanvas(canvas, canvas.img, canvas.markers, canvas.scale, canvas.offsetX, canvas.offsetY);
      saveSetsForDate(currentDate, getAllSetsData());
    });
    scoreBoard.appendChild(resetBtn);
    setWrapper.appendChild(scoreBoard);

    setsContainer.appendChild(setWrapper);

    initializeCanvas(canvas, `#scoreList_${setIndex}`, `#totalScore_${setIndex}`, existingSet);
  }

  /* ---------- canvas initialization ---------- */
  function initializeCanvas(canvas, scoreListSelector, totalScoreSelector, existingSet = null) {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const img = new Image();
    img.src = "img/target1.png";

    canvas.img = img;
    canvas.markers = existingSet && existingSet.markers ? existingSet.markers.map(m => ({ ...m })) : [];
    canvas.scale = 1;
    canvas.offsetX = 0;
    canvas.offsetY = 0;

    const markerRadius = 20;
    let dragIndex = null;
    let startPos = null;
    let moved = false;

    canvas.style.touchAction = "auto";

    img.onload = () => {
      resizeCanvas();
      drawCanvas(canvas, img, canvas.markers, canvas.scale, canvas.offsetX, canvas.offsetY);
    };

    function resizeCanvas() {
      const parentW = canvas.parentElement.clientWidth || 300;
      const parentH = Math.max(canvas.parentElement.clientHeight, 600);
      canvas.width = parentW;
      canvas.height = parentH;
      const scaleX = canvas.width / img.width;
      const scaleY = canvas.height / img.height;
      canvas.scale = Math.min(scaleX, scaleY);
      canvas.offsetX = (canvas.width - img.width * canvas.scale) / 2;
      canvas.offsetY = (canvas.height - img.height * canvas.scale) / 2;
      drawCanvas(canvas, img, canvas.markers, canvas.scale, canvas.offsetX, canvas.offsetY);
    }

    window.addEventListener("resize", resizeCanvas);

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
      const x = (clientX - rect.left - canvas.offsetX) / canvas.scale;
      const y = (clientY - rect.top - canvas.offsetY) / canvas.scale;
      return { x, y, pageX: clientX, pageY: clientY };
    }

    function startDrag(e) {
      startPos = getEventPosition(e);
      moved = false;
      dragIndex = null;
      for (let i = canvas.markers.length - 1; i >= 0; i--) {
        const dx = startPos.x - canvas.markers[i].x;
        const dy = startPos.y - canvas.markers[i].y;
        if (dx * dx + dy * dy <= markerRadius * markerRadius) {
          dragIndex = i;
          break;
        }
      }
    }

    function onDrag(e) {
      if (!startPos) return;
      const pos = getEventPosition(e);
      const dx = pos.x - startPos.x;
      const dy = pos.y - startPos.y;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) moved = true;
      if (dragIndex !== null) {
        if (e.type && e.type.startsWith("touch")) e.preventDefault();
        canvas.markers[dragIndex].x = pos.x;
        canvas.markers[dragIndex].y = pos.y;
        drawCanvas(canvas, img, canvas.markers, canvas.scale, canvas.offsetX, canvas.offsetY);
      }
    }

    function endDrag(e) {
      const pos = getEventPosition(e);
      if (!moved && dragIndex === null && startPos) {
        const near = canvas.markers.some(m => {
          const dx = m.x - pos.x, dy = m.y - pos.y;
          return dx * dx + dy * dy < 4;
        });
        if (!near) {
          const pixel = getImagePixelColorOnImage(canvas.img, pos.x, pos.y);
          const score = getScoreFromColor(pixel);
          canvas.markers.push({ x: pos.x, y: pos.y, score });
        }
      }
      dragIndex = null;
      startPos = null;
      canvas.markers = canvas.markers.filter(m => m.x >= 0 && m.x <= img.width && m.y >= 0 && m.y <= img.height);
      drawCanvas(canvas, img, canvas.markers, canvas.scale, canvas.offsetX, canvas.offsetY);
      saveSetsForDate(currentDate, getAllSetsData());
    }

    canvas.addEventListener("mousedown", startDrag);
    document.addEventListener("mousemove", onDrag);
    document.addEventListener("mouseup", endDrag);

    canvas.addEventListener("touchstart", startDrag, { passive: true });
    canvas.addEventListener("touchmove", onDrag, { passive: false });
    canvas.addEventListener("touchend", endDrag, { passive: true });
    canvas.addEventListener("touchcancel", endDrag, { passive: true });
  }

  /* ---------- draw & score ---------- */
  function drawCanvas(canvas, img, markers, scale, offsetX = 0, offsetY = 0) {
    const ctx = canvas.getContext("2d");
    const markerRadius = 20;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
    ctx.drawImage(img, 0, 0);

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
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(index + 1, marker.x, marker.y);
    });

    ctx.restore();
    updateScoreBoard(canvas, `#scoreList_${canvas.id.split("_")[1]}`, `#totalScore_${canvas.id.split("_")[1]}`, markers);
  }

  function updateScoreBoard(canvas, scoreListSelector, totalScoreSelector, markers = null) {
    const list = document.querySelector(scoreListSelector);
    if (!list) return;
    markers = markers || canvas.markers;
    let total = 0;
    while (list.children.length < markers.length) {
      const li = document.createElement("li");
      li.className = "score-item";
      const span = document.createElement("span");
      span.className = "arrow-label";
      li.appendChild(span);
      const select = document.createElement("select");
      select.className = "score-select";
      select.style.fontSize = "18px";
      select.style.padding = "6px 10px";
      select.style.minWidth = "84px";
      [0, 3, 5, 7, 9, 10].forEach(v => {
        const opt = document.createElement("option");
        opt.value = v;
        opt.textContent = v;
        select.appendChild(opt);
      });
      li.appendChild(select);
      list.appendChild(li);
    }
    list.querySelectorAll(".score-item").forEach((li, i) => {
      li.querySelector(".arrow-label").textContent = `矢${i + 1}:`;
      const select = li.querySelector("select");
      select.value = markers[i].score;
      select.addEventListener("change", () => {
        markers[i].score = Number(select.value);
        document.querySelector(totalScoreSelector).textContent = markers.reduce((a, m) => a + m.score, 0);
        saveSetsForDate(currentDate, getAllSetsData());
      });
    });
    document.querySelector(totalScoreSelector).textContent = markers.reduce((a, m) => a + m.score, 0);
  }

  function getImagePixelColorOnImage(img, x, y) {
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = img.width;
    tempCanvas.height = img.height;
    const ctx = tempCanvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const p = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
    return { r: p[0], g: p[1], b: p[2], a: p[3] };
  }

  function getScoreFromColor(pixel) {
    // ここは自由にカスタム可能
    if (!pixel) return 0;
    if (pixel.r === 255 && pixel.g === 255 && pixel.b === 0) return 10;
    if (pixel.r === 255 && pixel.g === 0 && pixel.b === 0) return 9;
    if (pixel.r === 0 && pixel.g === 0 && pixel.b === 255) return 7;
    if (pixel.r === 0 && pixel.g === 0 && pixel.b === 0) return 5;
    if (pixel.r === 255 && pixel.g === 255 && pixel.b === 255) return 3;
    return 0;
  }

  /* ---------- initial load ---------- */
  loadSetsForDate(currentDate);
});

