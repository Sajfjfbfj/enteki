document.addEventListener("DOMContentLoaded", () => {
  const targetCanvas = document.getElementById("targetCanvas");
  const scoreChartCanvas = document.getElementById("scoreChart");
  const scoreCtx = scoreChartCanvas.getContext("2d");
  let chart = null;

  const matchDateInput = document.getElementById("matchDate");
  let currentDate = new Date().toISOString().split("T")[0];
  matchDateInput.value = currentDate;

  const dailyTab = document.getElementById("dailyTab");
  const monthTab = document.getElementById("monthTab");
  let currentTab = "daily";

  const toolCategorySelect = document.getElementById("toolCategorySelect");
  const toolNameSelect = document.getElementById("toolNameSelect");
  const filterToolBtn = document.getElementById("filterToolBtn");

  const shotAnalysisContainerId = "shotAnalysisContainer";

  let dailySets = [];
  let monthSets = [];

  const markerRadius = 20;
  const img = new Image();
  img.src = "img/target1.png";

  const toolCategories = ["弽","弓","矢","弦"];
  let toolsData = loadTools();
  let selectedCategory = "";
  let selectedToolName = "";

  function loadTools() {
    const data = localStorage.getItem("kyudoTools");
    if(data) return JSON.parse(data);
    const init = {};
    toolCategories.forEach(cat => init[cat]=[]);
    return init;
  }

  toolCategorySelect.addEventListener("change", () => {
    selectedCategory = toolCategorySelect.value;
    renderToolNames(selectedCategory);
  });

  toolNameSelect.addEventListener("change", () => {
    selectedToolName = toolNameSelect.value;
  });

  function renderToolNames(category) {
    toolNameSelect.innerHTML = "<option value=''>-- 道具を選択 --</option>";
    if(category && toolsData[category]){
      toolsData[category].forEach(tool => {
        const opt = document.createElement("option");
        opt.value = tool.name;
        opt.textContent = tool.name;
        toolNameSelect.appendChild(opt);
      });
    }
    if(selectedToolName){
      toolNameSelect.value = selectedToolName;
    }
  }

  img.onload = () => {
    resizeCanvas();
    loadDailySets(currentDate);
    drawDaily();
    loadMonthSets();
    drawMonth();
  };

  window.addEventListener("resize", () => {
    resizeCanvas();
    redrawCurrentTab();
  });

  dailyTab.addEventListener("click", ()=>{ currentTab="daily"; updateTabs(); redrawCurrentTab(); });
  monthTab.addEventListener("click", ()=>{ currentTab="month"; updateTabs(); redrawCurrentTab(); });

  matchDateInput.addEventListener("change", ()=>{ currentDate = matchDateInput.value; loadDailySets(currentDate); redrawCurrentTab(); });

  filterToolBtn.addEventListener("click", ()=>{ redrawCurrentTab(); });

  function resizeCanvas(){
    targetCanvas.width = targetCanvas.parentElement.clientWidth;
    targetCanvas.height = Math.max(targetCanvas.parentElement.clientHeight, 400);
  }

  function updateTabs(){
    if(currentTab==="daily"){
      dailyTab.classList.add("bg-primary","text-white");
      dailyTab.classList.remove("bg-slate-300","dark:bg-slate-700","text-slate-800","dark:text-slate-200");
      monthTab.classList.remove("bg-primary","text-white");
      monthTab.classList.add("bg-slate-300","dark:bg-slate-700","text-slate-800","dark:text-slate-200");
    } else {
      monthTab.classList.add("bg-primary","text-white");
      monthTab.classList.remove("bg-slate-300","dark:bg-slate-700","text-slate-800","dark:text-slate-200");
      dailyTab.classList.remove("bg-primary","text-white");
      dailyTab.classList.add("bg-slate-300","dark:bg-slate-700","text-slate-800","dark:text-slate-200");
    }
  }

  function redrawCurrentTab() {
    if(currentTab==="daily") drawDaily();
    else drawMonth();
  }

  /* ---------- データロード ---------- */
  function loadDailySets(date){
    const storedData = JSON.parse(localStorage.getItem("kyudoSetsByDate") || "{}");
    dailySets = [];
    const sets = storedData[date] || [];
    sets.forEach(set=>{ if(set.markers) dailySets.push({...set, markers:set.markers.map(m=>({...m}))}); });
  }

  function loadMonthSets(){
    const storedData = JSON.parse(localStorage.getItem("kyudoSetsByDate") || "{}");
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime()-30*24*60*60*1000);
    monthSets = [];
    Object.keys(storedData).forEach(dateStr=>{
      const d = new Date(dateStr);
      if(d>=thirtyDaysAgo && d<=today){
        storedData[dateStr].forEach(set=>{
          if(set.markers) monthSets.push({...set, markers:set.markers.map(m=>({...m}))});
        });
      }
    });
  }

  /* ---------- 描画 ---------- */
  function drawDaily(){
    const markers = filterSets(dailySets);
    drawCanvas(targetCanvas, markers);
    drawScoreChart(markers, "日別得点分布");
    renderShotAnalysis(dailySets, shotAnalysisContainerId);
  }

  function drawMonth(){
    const markers = filterSets(monthSets);
    drawCanvas(targetCanvas, markers);
    drawScoreChart(markers, "過去30日得点分布");
    renderShotAnalysis(monthSets, shotAnalysisContainerId);
  }

  function filterSets(sets){
    if(!selectedCategory || !selectedToolName) return sets.flatMap(s=>s.markers);
    return sets.flatMap(set=> (set.tools && set.tools[selectedCategory]===selectedToolName) ? set.markers : []);
  }

  function drawCanvas(canvas, markers){
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(img,0,0,canvas.width,canvas.height);
    markers.forEach((m,i)=>{
      let strokeColor;
      switch(m.score){
        case 10: strokeColor='yellow'; break;
        case 9: strokeColor='red'; break;
        case 7: strokeColor='blue'; break;
        case 5: strokeColor='black'; break;
        case 3: strokeColor='white'; break;
        default: strokeColor='gray';
      }
      ctx.beginPath();
      ctx.arc(m.x/img.width*canvas.width, m.y/img.height*canvas.height, markerRadius,0,Math.PI*2);
      ctx.fillStyle='white';
      ctx.fill();
      ctx.strokeStyle=strokeColor;
      ctx.lineWidth=2;
      ctx.stroke();
      ctx.fillStyle='black';
      ctx.font='bold 18px sans-serif';
      ctx.textAlign='center';
      ctx.textBaseline='middle';
      ctx.fillText(i+1, m.x/img.width*canvas.width, m.y/img.height*canvas.height);
    });
  }

  function drawScoreChart(markers, label){
    const scores = markers.map(m=>m.score||0);
    const counts = [0,3,5,7,9,10].map(v=>scores.filter(s=>s===v).length);
    const data = {
      labels: ["0点","3点","5点","7点","9点","10点"],
      datasets:[{label,data:counts,backgroundColor:['gray','white','black','blue','red','yellow']}]
    };
    if(chart) chart.destroy();
    chart = new Chart(scoreCtx,{
      type:'bar',
      data,
      options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,stepSize:1}}}
    });
  }

  /* ---------- 立ちごとの得点分析 ---------- */
  function analyzeShots(sets){
    const shotMap = {};
    sets.forEach(set => {
      set.markers.forEach((m,i)=>{
        if(!shotMap[i+1]) shotMap[i+1]=[];
        shotMap[i+1].push(m.score||0);
      });
    });
    const result = [];
    Object.keys(shotMap).forEach(shotIndex=>{
      const scores = shotMap[shotIndex];
      const total = scores.length;
      const avg = scores.reduce((a,b)=>a+b,0)/total || 0;
      const distribution = [0,3,5,7,9,10].map(v=>{
        const count = scores.filter(s=>s===v).length;
        return {score:v,count,rate:((count/total)*100).toFixed(1)};
      });
      result.push({shot:shotIndex,avg,distribution});
    });
    return result;
  }

  function renderShotAnalysis(sets, containerId){
    const analysis = analyzeShots(sets);
    const container = document.getElementById(containerId);
    container.innerHTML="";
    analysis.forEach(a=>{
      const div = document.createElement("div");
      div.innerHTML=`<strong>${a.shot}立目 平均 ${a.avg.toFixed(1)}点</strong>`;
      a.distribution.forEach(d=>{
        div.innerHTML+=`<div>${d.score}点: ${d.count}回 (${d.rate}%)</div>`;
      });
      div.classList.add("mb-2","p-2","border","rounded");
      container.appendChild(div);
    });
  }

});
