/**
 * js/analysis.js
 * 分析ロジック（分析ボタン押下必須で描画）
 */
(function () {
  let analysisStarted = false;
  let analysisReady = false; // 分析ボタンを押すと true

  const toolCategories = ["弽", "弓", "矢", "弦"];
  let toolsData = {};
  let selectedCategory = "";
  let selectedToolName = "";
  let currentTab = "daily";
  let currentDate = new Date().toISOString().split("T")[0];

  let globalChart = null; // Chart インスタンス保持

  // --- 初期化 ---
  window.addEventListener("DOMContentLoaded", () => {
    toolsData = loadTools();

    const targetCanvas = document.getElementById("targetCanvas");
    const img = new Image();
    img.src = "img/target1.png";
    if (targetCanvas) {
      const ctx = targetCanvas.getContext("2d");
      img.onload = () => ctx.drawImage(img, 0, 0, targetCanvas.width, targetCanvas.height);
    }

    const toolCategorySelect = document.getElementById("toolCategorySelect");
    const toolNameSelect = document.getElementById("toolNameSelect");
    const dateInput = document.getElementById("matchDate");

    // 🎨 セレクト・カレンダー共通スタイル（黒背景＋白文字）
    function applySelectStyles() {
      [dateInput, toolCategorySelect, toolNameSelect].forEach((el) => {
        if (!el) return;
        el.classList.add(
          "border",
          "rounded",
          "px-2",
          "py-1",
          "text-slate-800", // ライト時文字色
          "bg-white",
          "dark:text-white", // ダーク時白文字
          "dark:bg-black", // ダーク時黒背景
          "transition-colors"
        );
      });
    }
    applySelectStyles();

    // --- カテゴリ・道具選択イベント ---
    if (toolCategorySelect) {
      renderToolCategories();
      toolCategorySelect.addEventListener("change", () => {
        selectedCategory = toolCategorySelect.value;
        selectedToolName = "";
        renderToolNames(selectedCategory);
      });
    }
    if (toolNameSelect) {
      toolNameSelect.addEventListener("change", () => {
        selectedToolName = toolNameSelect.value;
      });
    }

    // --- タブ切替 ---
    const dailyTab = document.getElementById("dailyTab");
    const monthTab = document.getElementById("monthTab");

    if (dailyTab)
      dailyTab.addEventListener("click", () => {
        currentTab = "daily";
        updateTabs();
      });
    if (monthTab)
      monthTab.addEventListener("click", () => {
        currentTab = "month";
        updateTabs();
      });

    updateTabs();

    // --- Canvas リサイズ ---
    function resizeCanvas() {
      if (!targetCanvas) return;
      targetCanvas.width = targetCanvas.parentElement.clientWidth;
      targetCanvas.height = Math.max(targetCanvas.parentElement.clientHeight, 400);
    }
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    if (selectedCategory) renderToolNames(selectedCategory);
  });

  // --- ツール読み込み ---
  function loadTools() {
    const data = localStorage.getItem("kyudoTools");
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        console.error("tools parse error", e);
      }
    }
    const init = {};
    toolCategories.forEach((cat) => (init[cat] = []));
    return init;
  }

  function renderToolCategories() {
    const select = document.getElementById("toolCategorySelect");
    if (!select) return;
    select.innerHTML = "<option value=''>-- カテゴリ選択 --</option>";
    toolCategories.forEach((cat) => {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat;
      select.appendChild(opt);
    });
    if (selectedCategory) select.value = selectedCategory;
  }

  function renderToolNames(category) {
    const select = document.getElementById("toolNameSelect");
    if (!select) return;
    const prevSelected = selectedToolName;
    select.innerHTML = "<option value=''>-- 道具を選択 --</option>";
    if (category && toolsData[category]) {
      toolsData[category].forEach((tool) => {
        const opt = document.createElement("option");
        opt.value = tool.name;
        opt.textContent = tool.name;
        select.appendChild(opt);
      });
    }
    if (prevSelected && Array.from(select.options).some((o) => o.value === prevSelected)) {
      select.value = prevSelected;
      selectedToolName = prevSelected;
    } else {
      select.value = "";
      selectedToolName = "";
    }
  }

  function updateTabs() {
    const dailyTab = document.getElementById("dailyTab");
    const monthTab = document.getElementById("monthTab");
    if (currentTab === "daily") {
      if (dailyTab) {
        dailyTab.classList.add("bg-primary", "text-white");
        dailyTab.classList.remove("bg-slate-300", "dark:bg-slate-700", "text-slate-800", "dark:text-slate-200");
      }
      if (monthTab) {
        monthTab.classList.remove("bg-primary", "text-white");
        monthTab.classList.add("bg-slate-300", "dark:bg-slate-700", "text-slate-800", "dark:text-slate-200");
      }
    } else {
      if (monthTab) {
        monthTab.classList.add("bg-primary", "text-white");
        monthTab.classList.remove("bg-slate-300", "dark:bg-slate-700", "text-slate-800", "dark:text-slate-200");
      }
      if (dailyTab) {
        dailyTab.classList.remove("bg-primary", "text-white");
        dailyTab.classList.add("bg-slate-300", "dark:bg-slate-700", "text-slate-800", "dark:text-slate-200");
      }
    }
  }

  // --- 分析ボタン押下 ---
  window.startAnalysis = function () {
    if (analysisStarted) {
      // 再押下で強制再描画する場合はコメントアウト
    }
    analysisStarted = true;
    analysisReady = true;
    runAnalysis();
  };

  // --- 分析本体 ---
  function runAnalysis() {
    const targetCanvas = document.getElementById("targetCanvas");
    const scoreChartCanvas = document.getElementById("scoreChart");
    const scoreCtx = scoreChartCanvas ? scoreChartCanvas.getContext("2d") : null;
    const shotAnalysisContainerId = "shotAnalysisContainer";

    let dailySets = [];
    let monthSets = [];

    function loadDailySets(date) {
      const storedData = JSON.parse(localStorage.getItem("kyudoSetsByDate") || "{}");
      dailySets = storedData[date] || [];
    }

    function loadMonthSets() {
      const storedData = JSON.parse(localStorage.getItem("kyudoSetsByDate") || "{}");
      const today = new Date();
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      monthSets = [];
      Object.keys(storedData).forEach((dateStr) => {
        const d = new Date(dateStr);
        if (d >= thirtyDaysAgo && d <= today) {
          storedData[dateStr].forEach((set) => monthSets.push(set));
        }
      });
    }

    function filterSets(sets) {
      return sets.flatMap((set) => {
        if (!selectedCategory) return set.markers || [];
        if (selectedToolName) {
          return set.tools && set.tools[selectedCategory] === selectedToolName ? set.markers || [] : [];
        }
        return set.markers || [];
      });
    }

    function drawCanvas(canvas, markers) {
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const baseImg = new Image();
      baseImg.src = "img/target1.png";
      baseImg.onload = () => {
        ctx.drawImage(baseImg, 0, 0, canvas.width, canvas.height);
        markers.forEach((m, i) => {
          let strokeColor;
          switch (m.score) {
            case 10:
              strokeColor = "yellow";
              break;
            case 9:
              strokeColor = "red";
              break;
            case 7:
              strokeColor = "blue";
              break;
            case 5:
              strokeColor = "black";
              break;
            case 3:
              strokeColor = "white";
              break;
            default:
              strokeColor = "gray";
          }
          const px = (m.x / baseImg.width) * canvas.width;
          const py = (m.y / baseImg.height) * canvas.height;
          ctx.beginPath();
          ctx.arc(px, py, 20, 0, Math.PI * 2);
          ctx.fillStyle = "white";
          ctx.fill();
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = "black";
          ctx.font = "bold 18px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(i + 1, px, py);
        });
      };
    }

    function drawScoreChart(markers) {
      if (!scoreCtx) return;
      const scores = markers.map((m) => m.score || 0);
      const counts = [0, 3, 5, 7, 9, 10].map((v) => scores.filter((s) => s === v).length);
      const data = {
        labels: ["0点", "3点", "5点", "7点", "9点", "10点"],
        datasets: [
          {
            label: "得点",
            data: counts,
            backgroundColor: ["gray", "white", "black", "blue", "red", "yellow"],
          },
        ],
      };
      if (globalChart) {
        try {
          globalChart.destroy();
        } catch {}
        globalChart = null;
      }
      globalChart = new Chart(scoreCtx, {
        type: "bar",
        data,
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, stepSize: 1 } } },
      });
    }

    // --- 立ちごとの分析結果（黒文字固定） ---
    function renderShotAnalysis(sets, containerId) {
      const analysis = analyzeShots(sets);
      const container = document.getElementById(containerId);
      if (!container) return;
      container.innerHTML = "";
      analysis.forEach((a) => {
        const div = document.createElement("div");
        div.innerHTML = `<strong>${a.shot}立目 平均 ${a.avg.toFixed(1)}点</strong>`;
        a.distribution.forEach((d) => {
          div.innerHTML += `<div>${d.score}点: ${d.count}回 (${d.rate}%)</div>`;
        });
        div.classList.add("mb-2", "p-2", "border", "rounded");
        div.style.color = "#1e293b"; // ← 黒文字固定（darkでも白くならない）
        container.appendChild(div);
      });
    }

    function analyzeShots(sets) {
      const shotMap = {};
      sets.forEach((set) =>
        set.markers?.forEach((m, i) => {
          if (!shotMap[i + 1]) shotMap[i + 1] = [];
          shotMap[i + 1].push(m.score || 0);
        })
      );
      const result = [];
      Object.keys(shotMap).forEach((shotIndex) => {
        const scores = shotMap[shotIndex];
        const total = scores.length;
        const avg = total ? scores.reduce((a, b) => a + b, 0) / total : 0;
        const distribution = [0, 3, 5, 7, 9, 10].map((v) => {
          const count = scores.filter((s) => s === v).length;
          return { score: v, count, rate: total ? ((count / total) * 100).toFixed(1) : "0.0" };
        });
        result.push({ shot: shotIndex, avg, distribution });
      });
      return result;
    }

    // --- 描画 ---
    function drawCurrent() {
      if (currentTab === "daily") {
        loadDailySets(currentDate);
        const markers = filterSets(dailySets);
        drawCanvas(document.getElementById("targetCanvas"), markers);
        drawScoreChart(markers);
        renderShotAnalysis(dailySets, shotAnalysisContainerId);
      } else {
        loadMonthSets();
        const markers = filterSets(monthSets);
        drawCanvas(document.getElementById("targetCanvas"), markers);
        drawScoreChart(markers);
        renderShotAnalysis(monthSets, shotAnalysisContainerId);
      }
    }

    drawCurrent();
  }
})();
