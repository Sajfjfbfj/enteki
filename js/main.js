/* main.js -- 完全版（根治バージョン: 色判定をHSVベースに強化・ノイズ耐性向上） */
document.addEventListener("DOMContentLoaded", () => {
  const addSetBtn = document.getElementById("addSetBtnTab");
  const setsContainer = document.getElementById("setsContainer");
  const matchDate = document.getElementById("matchDate");
  const summaryContainer = document.getElementById("dailySummary");

  let setCount = 0;
  let currentDate = new Date().toISOString().split("T")[0];
  if (matchDate) matchDate.value = currentDate;

  // グローバルデータ
  window.globalSetsData = JSON.parse(localStorage.getItem("kyudoSetsByDate") || "{}");

  /* ---------- summary ---------- */
  function loadSummary() {
    if (!summaryContainer) return;
    
    const storedData = window.globalSetsData;
    summaryContainer.innerHTML = "";

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const dates = Object.keys(storedData).sort().reverse();
    const filteredDates = dates.filter((date) => {
      const [year, month] = date.split("-").map(Number);
      return year === currentYear && month === currentMonth;
    });

    if (filteredDates.length === 0) {
      summaryContainer.innerHTML = `<p class="text-slate-500 italic">${currentMonth}月の記録はありません</p>`;
      return;
    }

    const grouped = {};
    filteredDates.forEach((date) => {
      const [year, month] = date.split("-").slice(0, 2);
      const key = `${year}年${month}月`;
      if (!grouped[key]) grouped[key] = [];
      
      const sets = storedData[date] || [];
      const totalScore = sets.flatMap(s => s.markers || []).reduce((acc, m) => acc + (m.score || 0), 0);
      const totalShots = sets.flatMap(s => s.markers || []).length;
      
      grouped[key].push({ date, sets, totalScore, totalShots });
    });

    Object.keys(grouped).forEach((monthKey) => {
      const monthWrapper = document.createElement("div");
      monthWrapper.className = "mb-4 border-b border-slate-200 dark:border-slate-700 pb-2";
      monthWrapper.innerHTML = `<h3 class="text-lg font-bold text-primary mb-2">${monthKey}</h3>`;

      grouped[monthKey].forEach(day => {
        const dayEl = document.createElement("div");
        dayEl.className = "flex justify-between items-center py-1 px-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md cursor-pointer";
        dayEl.innerHTML = `
          <span class="text-sm">${day.date} (${day.sets.length}立)</span>
          <span class="text-sm font-semibold">${day.totalScore}点 / ${day.totalShots}射</span>
        `;
        dayEl.onclick = () => setCurrentDate(day.date);
        monthWrapper.appendChild(dayEl);
      });
      
      summaryContainer.appendChild(monthWrapper);
    });
  }

  /* ---------- tools ---------- */
  function loadTools() {
    const data = localStorage.getItem("kyudoTools");
    return data ? JSON.parse(data) : { 弽: [], 弓: [], 矢: [], 弦: [] };
  }

  /* ---------- persistence ---------- */
  function saveSetsForDate(date, sets) {
    if (!date) return;
    window.globalSetsData[date] = sets;
    localStorage.setItem("kyudoSetsByDate", JSON.stringify(window.globalSetsData));
    loadSummary();
  }

  function loadSetsForDate(date) {
    currentDate = date;
    const sets = window.globalSetsData[date] || [];
    
    if (!setsContainer) return;
    
    setsContainer.innerHTML = "";
    setCount = 0;

    if (sets.length === 0) {
      setsContainer.innerHTML = '<p class="text-slate-500 italic">下のボタンから新しい立ちを追加してください。</p>';
    } else {
      sets.forEach((set) => window.addSet(set));
    }
    
    loadSummary();
  }

  function getAllSetsData() {
    const setsData = [];
    if (!setsContainer) return setsData;
    
    setsContainer.querySelectorAll(".set-wrapper").forEach((setWrapper) => {
      const canvas = setWrapper.querySelector("canvas");
      const markers = canvas && canvas.markers ? canvas.markers.map((m) => ({ ...m })) : [];

      const toolSelections = {};
      setWrapper.querySelectorAll(".tool-select").forEach((select) => {
        const category = select.dataset.category;
        toolSelections[category] = select.value;
      });

      setsData.push({ markers, tools: toolSelections });
    });
    return setsData;
  }

  function setCurrentDate(newDate) {
    saveSetsForDate(currentDate, getAllSetsData());
    currentDate = newDate;
    if (matchDate) matchDate.value = currentDate;
    loadSetsForDate(currentDate);
  }

  if (matchDate) {
    matchDate.addEventListener("change", () => setCurrentDate(matchDate.value));
  }

  /* ---------- add set ---------- */
  window.addSet = function(existingSet = null) {
    const setIndex = setCount++;
    const setWrapper = document.createElement("div");
    setWrapper.className = "set-wrapper app-card p-4 bg-white dark:bg-slate-900 rounded-xl shadow-lg space-y-3";
    setWrapper.dataset.index = setIndex;

    // ヘッダー
    const titleDiv = document.createElement("div");
    titleDiv.className = "flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-2";
    
    const title = document.createElement("h2");
    title.className = "font-bold text-lg flex items-center";
    title.innerHTML = `
      <span class="material-symbols-outlined text-primary mr-2">target</span>
      立ち ${setIndex + 1}
    `;
    titleDiv.appendChild(title);

    const buttonGroup = document.createElement("div");
    buttonGroup.className = "flex gap-2";

    const resetBtn = document.createElement("button");
    resetBtn.textContent = "リセット";
    resetBtn.className = "px-3 py-1 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors";
    resetBtn.addEventListener("click", () => {
      const canvas = setWrapper.querySelector("canvas");
      if (canvas && canvas.markers) {
        canvas.markers.length = 0;
        drawCanvas(canvas, canvas.img, canvas.markers, canvas.scale, canvas.offsetX, canvas.offsetY);
        saveSetsForDate(currentDate, getAllSetsData());
      }
    });
    buttonGroup.appendChild(resetBtn);

    const delSetBtn = document.createElement("button");
    delSetBtn.textContent = "削除";
    delSetBtn.className = "px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors";
    delSetBtn.addEventListener("click", () => {
      if (confirm("この立ちを削除してもよろしいですか？")) {
        setWrapper.remove();
        saveSetsForDate(currentDate, getAllSetsData());
      }
    });
    buttonGroup.appendChild(delSetBtn);

    titleDiv.appendChild(buttonGroup);
    setWrapper.appendChild(titleDiv);

    // 道具選択エリア
    const toolSection = document.createElement("div");
    toolSection.className = "tools space-y-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg";
    const tools = loadTools();
    
    Object.keys(tools).forEach((category) => {
      const label = document.createElement("label");
      label.className = "tool-label flex items-center gap-2";
      label.innerHTML = `<span class="text-sm font-medium min-w-[40px]">${category}:</span>`;

      const select = document.createElement("select");
      select.className = "tool-select rounded border border-slate-300 dark:border-slate-600 px-2 py-1 flex-1 text-sm bg-white dark:bg-slate-700 dark:text-white";
      select.dataset.category = category;

      const emptyOpt = document.createElement("option");
      emptyOpt.value = "";
      emptyOpt.textContent = "選択してください";
      select.appendChild(emptyOpt);

      tools[category].forEach((item) => {
        const opt = document.createElement("option");
        opt.value = item.name;
        opt.textContent = `${item.name}${item.feature ? " (" + item.feature + ")" : ""}`;
        select.appendChild(opt);
      });

      if (existingSet && existingSet.tools && existingSet.tools[category]) {
        select.value = existingSet.tools[category];
      }

      select.addEventListener("change", () => {
        saveSetsForDate(currentDate, getAllSetsData());
      });

      label.appendChild(select);
      toolSection.appendChild(label);
    });
    setWrapper.appendChild(toolSection);

    // Canvas
    const canvasContainer = document.createElement("div");
    canvasContainer.className = "canvas-container flex justify-center";
    const canvas = document.createElement("canvas");
    canvas.id = `targetCanvas_${setIndex}`;
    canvas.className = "border border-slate-300 dark:border-slate-600 rounded-lg shadow-inner";
    canvas.style.touchAction = "none";
    canvasContainer.appendChild(canvas);
    setWrapper.appendChild(canvasContainer);

    // スコアボード（アコーディオン対応）
    const scoreBoard = document.createElement("div");
    scoreBoard.className = "score-board p-3 bg-slate-50 dark:bg-slate-800 rounded-lg";
    
    // アコーディオンヘッダー
    const accordionHeader = document.createElement("div");
    accordionHeader.className = "accordion-header flex justify-between items-center cursor-pointer mb-2";
    accordionHeader.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="material-symbols-outlined text-primary">arrow_drop_down</span>
        <span class="font-semibold">スコア詳細</span>
      </div>
      <span id="scorePreview_${setIndex}" class="text-sm font-bold text-primary">0点 / 0射</span>
    `;
    
    // アコーディオンコンテンツ
    const accordionContent = document.createElement("div");
    accordionContent.className = "accordion-content";
    accordionContent.style.display = "block"; // 初期状態は開いている
    
    const ul = document.createElement("ul");
    ul.id = `scoreList_${setIndex}`;
    ul.className = "score-list space-y-1 mb-2";
    accordionContent.appendChild(ul);
    
    const totalP = document.createElement("p");
    totalP.className = "text-lg font-bold border-t border-slate-300 dark:border-slate-600 pt-2";
    totalP.innerHTML = `合計: <span id="totalScore_${setIndex}" class="text-primary">0</span>点`;
    accordionContent.appendChild(totalP);
    
    // アコーディオンのトグル処理
    accordionHeader.addEventListener("click", () => {
      const isOpen = accordionContent.style.display !== "none";
      accordionContent.style.display = isOpen ? "none" : "block";
      const arrow = accordionHeader.querySelector(".material-symbols-outlined");
      arrow.style.transform = isOpen ? "rotate(-90deg)" : "rotate(0deg)";
    });
    
    scoreBoard.appendChild(accordionHeader);
    scoreBoard.appendChild(accordionContent);

    setWrapper.appendChild(scoreBoard);
    
    if (setsContainer) {
      const placeholder = setsContainer.querySelector('p.text-slate-500');
      if (placeholder) placeholder.remove();
      
      setsContainer.appendChild(setWrapper);
    }

    initializeCanvas(canvas, `#scoreList_${setIndex}`, `#totalScore_${setIndex}`, existingSet);

    setTimeout(() => {
      setWrapper.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);

    saveSetsForDate(currentDate, getAllSetsData());
  };

  /* ---------- Canvas 初期化 ---------- */
  function initializeCanvas(canvas, scoreListSelector, totalScoreSelector, existingSet = null) {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const img = new Image();
    img.src = "img/target1.png";

    canvas.img = img;
    canvas.markers = existingSet && existingSet.markers ? existingSet.markers.map((m) => ({ ...m })) : [];
    canvas.scale = 1;
    canvas.offsetX = 0;
    canvas.offsetY = 0;

    const markerRadius = 20;
    let dragIndex = null;
    let startPos = null;
    let moved = false;

    img.onload = () => {
      resizeCanvas();
      drawCanvas(canvas, img, canvas.markers, canvas.scale, canvas.offsetX, canvas.offsetY);
    };

    img.onerror = () => {
      console.warn("的の画像が読み込めません");
      canvas.width = 400;
      canvas.height = 400;
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, 400, 400);
      ctx.fillStyle = '#999';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('的画像が見つかりません', 200, 200);
    };

    function resizeCanvas() {
      const parentW = canvas.parentElement.clientWidth || 300;
      const maxSize = Math.min(parentW, 500);
      canvas.width = maxSize;
      canvas.height = maxSize;
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
      return { x, y };
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
      const pos = e ? getEventPosition(e) : null;
      
      if (!moved && dragIndex === null && startPos && pos) {
        // 既存マーカー近傍かどうか
        const near = canvas.markers.some((m) => {
          const dx = m.x - pos.x;
          const dy = m.y - pos.y;
          return dx * dx + dy * dy < 16;
        });
        
        if (!near) {
          const pixel = getImagePixelColorOnImage(canvas.img, pos.x, pos.y);
          const score = getScoreFromColor(pixel);
          canvas.markers.push({ x: pos.x, y: pos.y, score });
        }
      }
      
      dragIndex = null;
      startPos = null;
      moved = false;
      
      // 画像範囲外の点を除去（画像サイズで判定）
      canvas.markers = canvas.markers.filter((m) => 
        m.x >= 0 && m.x <= img.width && m.y >= 0 && m.y <= img.height
      );
      
      drawCanvas(canvas, img, canvas.markers, canvas.scale, canvas.offsetX, canvas.offsetY);
      saveSetsForDate(currentDate, getAllSetsData());
    }

    canvas.addEventListener("mousedown", startDrag);
    canvas.addEventListener("mousemove", onDrag);
    canvas.addEventListener("mouseup", endDrag);
    canvas.addEventListener("mouseleave", endDrag);

    canvas.addEventListener("touchstart", startDrag, { passive: true });
    canvas.addEventListener("touchmove", onDrag, { passive: false });
    canvas.addEventListener("touchend", endDrag, { passive: true });
    canvas.addEventListener("touchcancel", endDrag, { passive: true });
  }

  /* ---------- 描画とスコア ---------- */
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
        case 10: strokeColor = '#ffd400'; break; // 黄色
        case 9: strokeColor = '#e53935'; break;  // 赤
        case 7: strokeColor = '#1e88e5'; break;  // 青
        case 5: strokeColor = '#111827'; break;  // 黒
        case 3: strokeColor = '#ffffff'; break;  // 白
        case 0: strokeColor = '#9ca3af'; break;  // 無色(灰)
        default: strokeColor = '#9ca3af';
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
      li.className = "score-item flex items-center justify-between py-1";

      const span = document.createElement("span");
      span.className = "arrow-label font-medium text-slate-900 dark:text-slate-100";
      li.appendChild(span);

      const select = document.createElement("select");
      select.className = "score-select rounded border border-slate-300 dark:border-slate-600 px-2 py-1 text-sm bg-white dark:bg-slate-700 dark:text-white";
      
      [0, 3, 5, 7, 9, 10].forEach((v) => {
        const opt = document.createElement("option");
        opt.value = v;
        opt.textContent = v + "点";
        select.appendChild(opt);
      });

      select.addEventListener("change", () => {
        const idx = Array.from(list.children).indexOf(li);
        if (idx >= 0 && markers[idx]) {
          markers[idx].score = parseInt(select.value);
          drawCanvas(canvas, canvas.img, markers, canvas.scale, canvas.offsetX, canvas.offsetY);
          saveSetsForDate(currentDate, getAllSetsData());
        }
      });

      li.appendChild(select);
      list.appendChild(li);
    }

    markers.forEach((m, i) => {
      total += m.score || 0;
      const li = list.children[i];
      const label = li.querySelector(".arrow-label");
      label.textContent = `矢${i + 1}: `;
      li.querySelector("select.score-select").value = m.score ?? 0;
    });

    while (list.children.length > markers.length) {
      list.removeChild(list.lastChild);
    }

    const totalElem = document.querySelector(totalScoreSelector);
    if (totalElem) {
      totalElem.textContent = total;
    }
    
    // プレビュー表示を更新（アコーディオンヘッダー用）
    const setIndex = canvas.id.split("_")[1];
    const previewElem = document.querySelector(`#scorePreview_${setIndex}`);
    if (previewElem) {
      const shotCount = markers.length;
      previewElem.textContent = `${total}点 / ${shotCount}射`;
    }
  }

  /* ---------- Helper (改良版) ---------- */

  // サンプリングを広げて平均を取る（5x5 サンプル）
  function getImagePixelColorOnImage(img, x, y) {
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = img.width;
    tempCanvas.height = img.height;
    const tempCtx = tempCanvas.getContext("2d");
    tempCtx.drawImage(img, 0, 0);

    // 範囲を 5x5 にして平均化（ノイズ耐性向上）
    let r = 0, g = 0, b = 0, count = 0;
    const radius = 2; // 5x5 -> radius 2
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const px = Math.floor(x) + dx;
        const py = Math.floor(y) + dy;
        if (px < 0 || py < 0 || px >= img.width || py >= img.height) continue;
        const data = tempCtx.getImageData(px, py, 1, 1).data;
        // 無効なピクセル（透明）はスキップ
        if (data[3] === 0) continue;
        r += data[0];
        g += data[1];
        b += data[2];
        count++;
      }
    }
    if (count === 0) return [0, 0, 0, 0];
    return [Math.round(r / count), Math.round(g / count), Math.round(b / count), 255];
  }

  // 二乗距離（高速）を使う
  function colorDistanceSq([r1, g1, b1], [r2, g2, b2]) {
    return (r1 - r2) * (r1 - r2) + (g1 - g2) * (g1 - g2) + (b1 - b2) * (b1 - b2);
  }

  // HSVベースでの判定に差し替え（調整済み）
  function getScoreFromColor([r, g, b, a]) {
    if (!a) return 0;

    // 正常化
    const R = r / 255;
    const G = g / 255;
    const B = b / 255;
    const max = Math.max(R, G, B);
    const min = Math.min(R, G, B);
    const delta = max - min;

    let h = 0;
    if (delta !== 0) {
      if (max === R) {
        h = 60 * (((G - B) / delta) % 6);
      } else if (max === G) {
        h = 60 * (((B - R) / delta) + 2);
      } else {
        h = 60 * (((R - G) / delta) + 4);
      }
    }
    if (h < 0) h += 360;

    const v = max; // 0..1
    const s = max === 0 ? 0 : delta / max; // 0..1

    // パラメータ（必要ならここを微調整）
    const SAT_THRESHOLD = 0.18;   // 彩度がこれ以下なら「無色（灰）」扱い（ただし極端に暗い/明るい場合は黒/白）
    const DARK_V = 0.10;          // これ以下なら黒寄り
    const LIGHT_V = 0.94;         // これ以上なら白寄り

    // 1) 彩度が低い -> 無色（灰色）扱い。ただし明度が極端なら黒/白
    if (s < SAT_THRESHOLD) {
      if (v <= DARK_V) return 5;   // 黒
      if (v >= LIGHT_V) return 3;  // 白
      return 0;                    // 無色（灰） -> 0点
    }

    // 2) 明度で白/黒補正
    if (v <= 0.06) return 5;   // 真っ暗 -> 黒
    if (v >= 0.98 && s < 0.5) return 3; // 非常に明るく彩度も低めなら白

    // 3) 色相ベース判定（範囲は余裕をもたせる）
    // 黄色: 30 ~ 85
    if (h >= 30 && h <= 85 && s > 0.22 && v > 0.20) return 10;
    // 赤: 345 ~ 360 or 0 ~ 25
    if ((h >= 345 || h <= 25) && s > 0.20 && v > 0.12) return 9;
    // 青: 190 ~ 270
    if (h >= 190 && h <= 270 && s > 0.18 && v > 0.08) return 7;

    // 4) フォールバック: 最近接色（二乗距離）で判定
    const targets = [
      { color: [255, 255, 0], score: 10 },   // 黄色
      { color: [255, 0, 0], score: 9 },      // 赤
      { color: [0, 0, 255], score: 7 },      // 青
      { color: [255, 255, 255], score: 3 },  // 白
      { color: [0, 0, 0], score: 5 },        // 黒
    ];

    let minDist = Infinity;
    let bestScore = 0;
    targets.forEach((t) => {
      const d = colorDistanceSq([r, g, b], t.color);
      if (d < minDist) {
        minDist = d;
        bestScore = t.score;
      }
    });

    // 閾値：二乗距離が大きすぎるなら無色扱い
    // (255^2 * 3 = 195075) が最大。実運用では 30000〜40000 程度が妥当な線。
    if (minDist > 36000) return 0;

    return bestScore;
  }

  // ---- 自動保存と通知サポート ----
  function showToast(message, timeout = 3000) {
    const id = 'matoma-toast';
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      el.style.position = 'fixed';
      el.style.right = '16px';
      el.style.bottom = '80px';
      el.style.zIndex = 9999;
      el.style.maxWidth = '80%';
      document.body.appendChild(el);
    }
    const item = document.createElement('div');
    item.textContent = message;
    item.style.background = 'rgba(0,0,0,0.75)';
    item.style.color = 'white';
    item.style.padding = '10px 14px';
    item.style.borderRadius = '8px';
    item.style.marginTop = '8px';
    item.style.fontSize = '14px';
    el.appendChild(item);
    setTimeout(() => {
      item.remove();
      if (!el.hasChildNodes()) el.remove();
    }, timeout);
  }

  function showNotification(message) {
    try {
      if (localStorage.getItem('notifications') === 'true' && "Notification" in window && Notification.permission === "granted") {
        new Notification('MATOMA', { body: message, icon: 'img/target1.png' });
      } else {
        // フォールバックでページ内トースト
        showToast(message);
      }
    } catch (err) {
      console.warn('通知エラー', err);
      showToast(message);
    }
  }

  // 定期自動保存（30秒ごと、無効なら動作しない）
  const AUTOSAVE_INTERVAL_MS = 30000;
  const autosaveTimer = setInterval(() => {
    try {
      if (localStorage.getItem('autoSave') === 'true') {
        saveSetsForDate(currentDate, getAllSetsData());
        if (localStorage.getItem('notifications') === 'true') {
          showNotification('データを自動保存しました');
        }
      }
    } catch (err) {
      console.error('自動保存エラー', err);
    }
  }, AUTOSAVE_INTERVAL_MS);

  // ページを離れるときにも保存（autSave 無関係に安全保存）
  window.addEventListener('beforeunload', (e) => {
    try {
      saveSetsForDate(currentDate, getAllSetsData());
    } catch (err) {
      console.error('beforeunload save error', err);
    }
  });

  /* ---------- 初期化 ---------- */
  window.addEventListener("beforeunload", () => {
    try {
      saveSetsForDate(currentDate, getAllSetsData());
    } catch (e) {
      console.error("保存エラー:", e);
    }
  });

  loadSetsForDate(currentDate);
});
