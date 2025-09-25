document.addEventListener("DOMContentLoaded", () => {
  const matchDate = document.getElementById("matchDate");
  const summaryBox = document.getElementById("dailySummary");

  let currentDate = matchDate.value || new Date().toISOString().split('T')[0];

  // -----------------------------
  // 日別集計を表示
  // -----------------------------
  function showDailySummary(date) {
    const storedData = JSON.parse(localStorage.getItem("kyudoSetsByDate") || "{}");
    const sets = storedData[date] || [];

    if (sets.length === 0) {
      summaryBox.innerHTML = "<p>この日のデータはありません</p>";
      return;
    }

    let totalScore = 0;
    sets.forEach(set => {
      if (set.markers) {
        set.markers.forEach(m => totalScore += (m.score || 0));
      }
    });

    let html = `<h3>${date}</h3>`;
    html += `<p>立ち数: ${sets.length}　合計点数: ${totalScore}</p>`;
    summaryBox.innerHTML = html;
  }

  // -----------------------------
  // 日付変更時
  // -----------------------------
  function updateDate(newDate) {
    currentDate = newDate;
    matchDate.value = newDate;
    if (typeof setCurrentDate === "function") {
      setCurrentDate(newDate);
    }
    showDailySummary(newDate);
  }

  matchDate.addEventListener("change", e => updateDate(e.target.value));

  // 初期表示
  showDailySummary(currentDate);
});


