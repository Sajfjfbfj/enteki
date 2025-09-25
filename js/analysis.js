/* analysis.js -- 日別・過去30日タブ切替版 */
document.addEventListener("DOMContentLoaded", () => {
  const container = document.querySelector("#targetCanvas").parentElement;
  
  // タブ UI
  const tabContainer = document.createElement("div");
  tabContainer.className = "flex gap-2 mb-4";
  
  const dailyTab = document.createElement("button");
  dailyTab.textContent = "日別";
  dailyTab.className = "px-4 py-2 font-bold rounded bg-primary text-white";
  
  const monthTab = document.createElement("button");
  monthTab.textContent = "過去30日";
  monthTab.className = "px-4 py-2 font-bold rounded bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-200";
  
  tabContainer.appendChild(dailyTab);
  tabContainer.appendChild(monthTab);
  container.insertBefore(tabContainer, container.firstChild);
  
  // 日付入力
  const matchDateInput = document.createElement("input");
  matchDateInput.type = "date";
  matchDateInput.className = "mb-4 p-2 border rounded";
  container.insertBefore(matchDateInput, container.firstChild.nextSibling);
  let currentDate = new Date().toISOString().split("T")[0];
  matchDateInput.value = currentDate;
  
  const targetCanvas = document.getElementById("targetCanvas");
  const scoreChartCanvas = document.getElementById("scoreChart");
  const ctx = targetCanvas.getContext("2d");
  const scoreCtx = scoreChartCanvas.getContext("2d");
  let chart = null;
  
  const img = new Image();
  img.src = "img/target1.png";
  const markerRadius = 20;
  let dailyMarkers = [];
  let monthMarkers = [];
  let currentTab = "daily";
  
  img.onload = () => {
    resizeCanvas();
    loadDailyMarkers(currentDate);
    drawDaily();
    drawMonthlyMarkers();
  };
  
  window.addEventListener("resize", () => {
    resizeCanvas();
    if(currentTab==="daily") drawDaily();
    else drawMonth();
  });
  
  dailyTab.addEventListener("click", () => {
    currentTab="daily";
    dailyTab.classList.add("bg-primary","text-white");
    dailyTab.classList.remove("bg-slate-300","dark:bg-slate-700","text-slate-800","dark:text-slate-200");
    monthTab.classList.remove("bg-primary","text-white");
    monthTab.classList.add("bg-slate-300","dark:bg-slate-700","text-slate-800","dark:text-slate-200");
    drawDaily();
  });
  
  monthTab.addEventListener("click", () => {
    currentTab="month";
    monthTab.classList.add("bg-primary","text-white");
    monthTab.classList.remove("bg-slate-300","dark:bg-slate-700","text-slate-800","dark:text-slate-200");
    dailyTab.classList.remove("bg-primary","text-white");
    dailyTab.classList.add("bg-slate-300","dark:bg-slate-700","text-slate-800","dark:text-slate-200");
    drawMonth();
  });
  
  matchDateInput.addEventListener("change", () => {
    currentDate = matchDateInput.value;
    loadDailyMarkers(currentDate);
    if(currentTab==="daily") drawDaily();
  });
  
  function resizeCanvas(){
    targetCanvas.width = targetCanvas.parentElement.clientWidth;
    targetCanvas.height = Math.max(targetCanvas.parentElement.clientHeight, 400);
  }
  
  /* ---------- データロード ---------- */
  function loadDailyMarkers(date){
    const storedData = JSON.parse(localStorage.getItem("kyudoSetsByDate") || "{}");
    dailyMarkers = [];
    const sets = storedData[date] || [];
    sets.forEach(set => {
      if(set.markers) dailyMarkers.push(...set.markers.map(m => ({...m})));
    });
  }
  
  function drawDaily(){
    drawCanvas(targetCanvas, dailyMarkers);
    drawScoreChart(dailyMarkers, "日別得点分布");
  }
  
  function drawMonthlyMarkers(){
    const storedData = JSON.parse(localStorage.getItem("kyudoSetsByDate") || "{}");
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime()-30*24*60*60*1000);
    monthMarkers = [];
    
    Object.keys(storedData).forEach(dateStr=>{
      const d = new Date(dateStr);
      if(d >= thirtyDaysAgo && d <= today){
        storedData[dateStr].forEach(set=>{
          if(set.markers) monthMarkers.push(...set.markers.map(m => ({...m})));
        });
      }
    });
  }
  
  function drawMonth(){
    drawCanvas(targetCanvas, dailyMarkers); // 日別も薄く表示
    const ctxOverlay = targetCanvas.getContext("2d");
    ctxOverlay.save();
    ctxOverlay.globalAlpha = 0.3;
    monthMarkers.forEach(m=>{
      ctxOverlay.beginPath();
      ctxOverlay.arc(m.x/img.width*targetCanvas.width, m.y/img.height*targetCanvas.height, 10, 0, Math.PI*2);
      ctxOverlay.fillStyle='purple';
      ctxOverlay.fill();
    });
    ctxOverlay.restore();
    drawScoreChart(monthMarkers, "過去30日得点分布");
  }
  
  /* ---------- 描画 ---------- */
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
      options:{
        responsive:true,
        plugins:{legend:{display:false}},
        scales:{y:{beginAtZero:true, stepSize:1}}
      }
    });
  }
});

