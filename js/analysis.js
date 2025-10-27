// js/analysis.js (修正版: グラフ伸び対策済み)
(function () {
  const item = "kyudoTools";
  const toolCategories = ["弽", "弓", "矢", "弦"];
  let toolsData = {};
  let globalChart = null;

  const toolCategorySelect = document.getElementById("toolCategorySelect");
  const toolNameSelect = document.getElementById("toolNameSelect");
  const analysisDateInput = document.getElementById("matchDate");
  const startAnalysisBtn = document.getElementById("startAnalysisBtn");
  const targetCanvas = document.getElementById("targetCanvas");
  const scoreChartCanvas = document.getElementById("scoreChart");
  const shotAnalysisTable = document.getElementById("shotAnalysisTable");
  const startAnalysisBtnTab = document.getElementById("startAnalysisBtnTab");

  function loadTools() {
    const data = localStorage.getItem(item);
    if (data) {
      try { return JSON.parse(data); } catch { return {}; }
    }
    const init = {}; toolCategories.forEach(cat => (init[cat] = [])); return init;
  }

  function applySelectStyles() {
    [analysisDateInput, toolCategorySelect, toolNameSelect].forEach((el) => {
      if (el) {
        el.classList.add('p-2', 'border', 'border-slate-300', 'dark:border-slate-600', 'rounded-md', 'bg-slate-50', 'dark:bg-slate-800', 'text-sm', 'transition-all', 'duration-200');
        el.classList.remove('bg-black', 'text-white');
      }
    });
  }

  function updateToolNameSelect(category) {
    if (!toolNameSelect) return;
    toolNameSelect.innerHTML = '<option value="">- 全て -</option>';
    const tools = toolsData[category] || [];
    tools.forEach(tool => {
      const opt = document.createElement("option");
      opt.value = tool.name; opt.textContent = tool.name;
      toolNameSelect.appendChild(opt);
    });
    toolNameSelect.value = "";
  }

  function loadAndFilterSets(date, category, toolName, mode = "daily") {
    const storedData = window.globalSetsData || JSON.parse(localStorage.getItem("kyudoSetsByDate") || "{}");
    let targetDates = [];
    if (mode === "monthly") {
      const today = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);
      targetDates = Object.keys(storedData).filter(d => {
        const d_date = new Date(d);
        return d_date >= thirtyDaysAgo && d_date <= today;
      });
    } else {
      targetDates = [date];
    }

    let filteredSets = [];
    targetDates.forEach(d => {
      const sets = storedData[d] || [];
      sets.forEach(set => {
        filteredSets.push({
          date: d,
          markers: set.markers || [],
          toolCategory: category,
          toolName: toolName,
          tools: set.tools || {}
        });
      });
    });

    return filteredSets.filter(set => {
      if (category && toolName && set.tools[category] !== toolName) return false;
      return true;
    });
  }

  function drawCanvas(canvas, markers) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const img = new Image(); img.src = "img/target1.png";
    img.onload = () => {
      const cw = canvas.width, ch = canvas.height;
      ctx.clearRect(0, 0, cw, ch);
      const scale = Math.min(cw / img.width, ch / img.height);
      const ox = (cw - img.width * scale) / 2;
      const oy = (ch - img.height * scale) / 2;
      ctx.save(); ctx.setTransform(scale, 0, 0, scale, ox, oy);
      ctx.drawImage(img, 0, 0); ctx.restore();
      markers.forEach(marker => {
        const x = marker.x * scale + ox;
        const y = marker.y * scale + oy;
        ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2);
        const colors = {10:'#ffd400',9:'#e53935',7:'#1e88e5',5:'#111827',3:'#ffffff',0:'#9ca3af'};
        ctx.fillStyle = colors[marker.score] || '#9ca3af';
        ctx.strokeStyle = '#333'; ctx.lineWidth = 1;
        ctx.fill(); ctx.stroke();
      });
    };
  }

  // ★ グラフの高さ伸び対策入り
  function drawScoreChart(markers) {
    if (!scoreChartCanvas) return;

    // 高さを毎回固定
    scoreChartCanvas.style.height = "260px";
    scoreChartCanvas.height = 260;

    if (globalChart) { globalChart.destroy(); globalChart = null; }

    const scores = markers.map(m => m.score).filter(s => s != null);
    const scoreLabels = [10, 9, 7, 5, 3, 0];
    const scoreCounts = scoreLabels.map(s => scores.filter(score => score === s).length);

    globalChart = new Chart(scoreChartCanvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: scoreLabels.map(s => `${s}点`),
        datasets: [{
          label: 'スコア別本数',
          data: scoreCounts,
          backgroundColor: ['#ffd400','#e53935','#1e88e5','#111827','#cccccc','#9ca3af'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: { legend: { display: false }, title: { display: true, text: 'スコア分布' } },
        scales: {
          y: { beginAtZero: true, title: { display: true, text: '本数' }, ticks: { stepSize: 1 } },
          x: { title: { display: true, text: 'スコア' } }
        }
      }
    });
  }

  function renderAnalysisTable(markers) {
    const container = document.getElementById("shotAnalysisContainer");
    if (!container) return;
    const totalShots = markers.length;
    const totalScore = markers.reduce((a, m) => a + (m.score || 0), 0);
    const avg = totalShots ? (totalScore / totalShots).toFixed(2) : 0;
    const counts = {}; [10,9,7,5,3,0].forEach(s => counts[s] = markers.filter(m => m.score === s).length);

    container.innerHTML = `
      <div class="app-card bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
        <table class="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
          <tbody>
            <tr><td>合計本数</td><td>${totalShots}射</td></tr>
            <tr><td>合計点</td><td>${totalScore}点</td></tr>
            <tr><td>平均</td><td>${avg}点</td></tr>
            <tr><td>的中率</td><td>${totalShots ? (((counts[10]+counts[9])/totalShots)*100).toFixed(1):0}%</td></tr>
          </tbody>
        </table>
      </div>
      <div class="app-card bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
        <table class="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
          <tbody>
            ${[10,9,7,5,3,0].map(s=>`<tr><td>${s}点</td><td>${counts[s]}本</td></tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }

  let analysisMode = "daily";
  function startAnalysis() {
    const date = analysisDateInput.value;
    const category = toolCategorySelect.value;
    const toolName = toolNameSelect.value;
    const filteredSets = loadAndFilterSets(date, category, toolName, analysisMode);
    const allMarkers = filteredSets.flatMap(set => set.markers || []);

    if (allMarkers.length === 0) {
      if (globalChart) globalChart.destroy();
      const ctx = targetCanvas.getContext("2d");
      ctx.clearRect(0,0,targetCanvas.width,targetCanvas.height);
      ctx.fillText('データがありません', targetCanvas.width/2, targetCanvas.height/2);
      document.getElementById("shotAnalysisContainer").innerHTML = `<p class='p-4 text-slate-500 italic'>データがありません。</p>`;
      return;
    }

    drawCanvas(targetCanvas, allMarkers);
    drawScoreChart(allMarkers);
    renderAnalysisTable(allMarkers);
  }

  function switchAnalysisMode(mode) {
    analysisMode = mode;
    const dailyTab = document.getElementById("dailyTab");
    const monthTab = document.getElementById("monthTab");
    if (mode === "daily") {
      dailyTab.classList.add("active","bg-primary","text-white");
      monthTab.classList.remove("active","bg-primary","text-white");
      analysisDateInput.style.display = 'block';
    } else {
      monthTab.classList.add("active","bg-primary","text-white");
      dailyTab.classList.remove("active","bg-primary","text-white");
      analysisDateInput.style.display = 'none';
    }
    startAnalysis();
  }

  window.addEventListener("DOMContentLoaded", () => {
    toolsData = loadTools();
    applySelectStyles();
    if (analysisDateInput) analysisDateInput.value = new Date().toISOString().split("T")[0];

    if (toolCategorySelect) {
      toolCategorySelect.addEventListener('change', e => updateToolNameSelect(e.target.value));
    }

    document.getElementById("dailyTab")?.addEventListener('click',()=>switchAnalysisMode("daily"));
    document.getElementById("monthTab")?.addEventListener('click',()=>switchAnalysisMode("monthly"));

    if (startAnalysisBtnTab) startAnalysisBtnTab.addEventListener("click",()=>{if(startAnalysisBtn) startAnalysisBtn.click();});
    if (startAnalysisBtn) startAnalysisBtn.addEventListener('click', startAnalysis);

  if (targetCanvas) {
  // ★サイズを大きめ（500×500）
  targetCanvas.width = 500;
  targetCanvas.height = 500;

  const ctx = targetCanvas.getContext("2d");
  const img = new Image();
  img.src = "img/target1.png";

  img.onload = () => {
    // キャンバス初期化
    ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);

    // 的を中央いっぱいに描画
    ctx.drawImage(img, 0, 0, targetCanvas.width, targetCanvas.height);

    // ★文字色は常に白
    ctx.fillStyle = "#ffffff";

    // フォントと中央配置設定
    ctx.font = "bold 24px 'Manrope', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // ★文字に柔らかい影を追加して視認性アップ
    ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
    ctx.shadowBlur = 6;

    // 中央にメッセージを描画
    ctx.fillText(
      "「分析を開始」ボタンを押してください",
      targetCanvas.width / 2,
      targetCanvas.height / 2
    );
  };

  img.onerror = () => {
    ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 20px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
    ctx.shadowBlur = 4;
    ctx.fillText(
      "的画像が見つかりません",
      targetCanvas.width / 2,
      targetCanvas.height / 2
    );
  };
}

window.startAnalysis = startAnalysis;
});

})();
