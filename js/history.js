/* history.js -- 履歴ページのデータ集計・フィルタリング + ルーム履歴表示 + Excel/PDF出力 */

let historyControls;
let historyListContainer;
let historyRoomViewContainer;
let exportButtons; // 出力ボタンコンテナ
let exportExcelBtn; // Excelボタン
let exportPdfBtn; // PDFボタン
let historyData = []; // 全履歴データ
let filteredData = []; // 絞り込み後のデータ
let currentPage = 1;
const itemsPerPage = 10;

document.addEventListener("DOMContentLoaded", () => {
  const historyList = document.getElementById("historyList");
  const noResultsMessage = document.getElementById("noResultsMessage");
  const applyFiltersBtn = document.getElementById("applyFiltersBtn");
  const searchQuery = document.getElementById("searchQuery");
  const filterType = document.getElementById("filterType");
  const filterDate = document.getElementById("filterDate");
  const btnBack = document.getElementById("btnBackHistory"); // 戻るボタン

  // DOM要素のキャッシュ (HTML側でIDを追加した要素)
  historyControls = document.getElementById("historyControls");
  historyListContainer = document.getElementById("historyListContainer");
  historyRoomViewContainer = document.getElementById("historyRoomViewContainer");
  exportButtons = document.getElementById("exportButtons");
  exportExcelBtn = document.getElementById("exportExcelBtn");
  exportPdfBtn = document.getElementById("exportPdfBtn");

  // ページネーションコントロール (HTML側でIDを追加した要素)
  const paginationControls = document.getElementById("paginationControls");
  const prevPageBtn = document.getElementById("prevPageBtn");
  const nextPageBtn = document.getElementById("nextPageBtn");
  const pageInfo = document.getElementById("pageInfo");

  // 初期UI状態
  if (paginationControls) paginationControls.style.display = "flex";
  if (exportButtons) exportButtons.classList.add("hidden");

  // ===============================
  // 1. 個人記録データ取得 (main.js のデータ形式を想定)
  // ===============================
  function loadAllData() {
    const storedData = JSON.parse(
      localStorage.getItem("kyudoSetsByDate") || "{}"
    );
    const dates = Object.keys(storedData).sort().reverse();

    return dates.map((date) => {
      const sets = storedData[date] || [];
      const markers = sets.flatMap((s) => s.markers || []);
      const totalScore = markers.reduce((sum, m) => sum + (m.score || 0), 0);
      const hitCount = markers.filter((m) => (m.score || 0) > 0).length;
      const missCount = markers.length - hitCount;

      return {
        date,
        totalScore,
        hitCount,
        missCount,
        markerCount: markers.length,
        sets, // ★個人戦詳細表示のため sets データを保持
        title: `個人記録 (${hitCount}中${markers.length})`,
        summary: `合計点: ${totalScore}点, 🎯的中率: ${
          markers.length > 0
            ? ((hitCount / markers.length) * 100).toFixed(1)
            : 0
        }%`,
      };
    });
  }

  // ===============================
  // 2. 団体戦履歴データ取得 (non-module.js の保存形式に合わせる)
  // ===============================
  function loadRoomHistoryData() {
    try {
      // non-module.js (saveRoomToHistory) が保存するキー 'MATOMA_rooms_history' から読み込む
      // 保存形式は { roomId: { snapshot: ... } } というオブジェクト
      const historyObject = JSON.parse(
        localStorage.getItem("MATOMA_rooms_history") || "{}"
      );

      // オブジェクトの値を配列に変換して返す
      return Object.values(historyObject);
    } catch (e) {
      console.error("Error loading room history from localStorage:", e);
      return [];
    }
  }

  // ===============================
  // 3. 全履歴データ統合
  // ===============================
  function getAllHistory() {
    // 個人戦データを整形
    const individualHistory = loadAllData().map((item, index) => ({
      ...item,
      id: `individual-${item.date}-${index}-${Math.random()
        .toString(36)
        .substring(2, 9)}`, // ユニークID
      type: "individual",
      timestamp: new Date(item.date).getTime(),
    }));

    // 団体戦データを整形
    const teamHistory = loadRoomHistoryData()
      .map((room) => {
        // room の形式: { id: "RM...", name: "...", createdAt: "ISO_STRING", snapshot: {...} }

        // チームデータが存在しないか、不正な場合はスキップ
        if (!room.snapshot) return null;

        // チーム構造の汎用的な処理 (Object or Array)
        const teamsSnapshot = room.snapshot.teams || {};
        const teams = Array.isArray(teamsSnapshot)
          ? teamsSnapshot
          : Object.values(teamsSnapshot);

        const totalScore = teams.reduce((sum, team) => {
          // プレイヤー構造の汎用的な処理 (Object or Array)
          const playersSnapshot = team.players || {};
          const players = Array.isArray(playersSnapshot)
            ? playersSnapshot
            : Object.values(playersSnapshot);

          return (
            sum +
            players.reduce((pSum, player) => {
              // スコア配列の合計
              return (
                pSum +
                (player.scores || []).reduce((sSum, score) => sSum + (score || 0), 0)
              );
            }, 0)
          );
        }, 0);

        const numTeams = teams.length;

        // 'room.timestamp' の代わりに 'room.createdAt' (ISO文字列) を使用する
        const itemTimestamp = room.createdAt
          ? new Date(room.createdAt).getTime()
          : new Date().getTime();
        const itemDate = room.createdAt
          ? new Date(room.createdAt).toISOString().split("T")[0]
          : "日付不明";

        return {
          id: `team-${room.id}`,
          type: "team",
          date: itemDate,
          timestamp: itemTimestamp,
          title: `団体戦: ${room.snapshot.name || "Unnamed Room"}`,
          summary: `参加チーム: ${numTeams}, 合計点: ${totalScore}点`,
          snapshot: room.snapshot,
          originalId: room.id, // loadHistoricalRoomView に渡すID
        };
      })
      .filter((item) => item !== null); // nullをフィルタリング

    const allHistory = [...individualHistory, ...teamHistory];
    allHistory.sort((a, b) => b.timestamp - a.timestamp); // 新しい順にソート
    return allHistory;
  }

  // ===============================
  // 4. 絞り込み処理 (日付フィルターのロジックを修正)
  // ===============================
  function applyFilters() {
    const query = searchQuery.value.toLowerCase();
    const type = filterType.value; // (all, individual, team)
    const dateFilterValue = filterDate.value; // 'all', 'today', 'week', 'month'

    filteredData = historyData.filter((item) => {
      // タイプフィルタ
      if (type !== "all" && item.type !== type) return false;

      // 日付フィルタのロジック
      if (dateFilterValue !== "all") {
        const itemDate = new Date(item.timestamp);
        const now = new Date();
        // 今日の日付の 00:00:00 を取得
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        if (dateFilterValue === "today") {
          // itemDate が今日の 00:00:00 より前なら除外
          if (itemDate < today) return false;
        } else if (dateFilterValue === "week") {
          // 6日前 (合計7日間) の 00:00:00 を計算
          const sevenDaysAgo = new Date(
            today.getTime() - 6 * 24 * 60 * 60 * 1000
          );
          if (itemDate < sevenDaysAgo) return false;
        } else if (dateFilterValue === "month") {
          // 29日前 (合計30日間) の 00:00:00 を計算
          const thirtyDaysAgo = new Date(
            today.getTime() - 29 * 24 * 60 * 60 * 1000
          );
          if (itemDate < thirtyDaysAgo) return false;
        }
      }

      // キーワード検索 (title, summary, date)
      if (
        query &&
        !item.title.toLowerCase().includes(query) &&
        !item.summary.toLowerCase().includes(query) &&
        !item.date.includes(query)
      ) {
        return false;
      }

      return true;
    });

    currentPage = 1;
    renderHistoryList(filteredData);
  }

  // ===============================
  // 5. リスト描画処理 (★list-none追加)
  // ===============================
  function renderHistoryList(data) {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const itemsToShow = data.slice(start, end);

    let html = "";
    itemsToShow.forEach((item) => {
      const icon = item.type === "team" ? "group" : "person";

      let itemClass = "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700";
      let dataAttribute = "";
      if (item.type === "team") {
        itemClass += " team-history-item";
        dataAttribute = `data-room-id="${item.originalId}"`;
      } else if (item.type === "individual") {
        itemClass += " individual-history-item";
        dataAttribute = `data-item-id="${item.id}"`;
      }

      // ▼▼▼ 修正点: Tailwindの 'list-none' を追加して「・」を消す ▼▼▼
      html += `
        <li class="list-none bg-white dark:bg-slate-800 p-4 border-b border-slate-200 dark:border-slate-700 ${itemClass}" ${dataAttribute}>
          <div class="flex items-center space-x-4">
            <span class="material-symbols-outlined text-indigo-500 dark:text-indigo-400">${icon}</span>
            <div class="flex-1">
              <p class="text-lg font-semibold text-slate-800 dark:text-slate-100">${item.title}</p>
              <p class="text-sm text-slate-500 dark:text-slate-400">${item.date} - ${item.summary}</p>
            </div>
            ${
              item.type === "team" || item.type === "individual"
                ? '<span class="material-symbols-outlined text-slate-400">chevron_right</span>'
                : ""
            }
          </div>
        </li>
      `;
      // ▲▲▲ 修正点 ここまで ▲▲▲
    });

    historyList.innerHTML = html;

    if (data.length === 0) {
      noResultsMessage.classList.remove("hidden");
    } else {
      noResultsMessage.classList.add("hidden");
    }

    // 団体戦クリックイベントリスナー
    historyList.querySelectorAll(".team-history-item").forEach((el) => {
      el.addEventListener("click", () => {
        const roomId = el.getAttribute("data-room-id");
        if (roomId) {
          // 団体戦詳細表示関数を呼び出し
          window.loadHistoricalRoomView(roomId);
        }
      });
    });

    // 個人戦クリックイベントリスナー
    historyList.querySelectorAll(".individual-history-item").forEach((el) => {
      el.addEventListener("click", () => {
        const itemId = el.getAttribute("data-item-id");
        if (itemId) {
          // ★新規作成した個人戦詳細表示関数を呼び出し
          window.loadHistoricalIndividualView(itemId);
        }
      });
    });

    // ページネーションを更新
    updatePaginationControls(data.length);
  }

  // ページネーションコントロールの更新
  function updatePaginationControls(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (!pageInfo) return;

    pageInfo.textContent = `ページ ${
      totalPages > 0 ? currentPage : 0
    } / ${totalPages}`;

    if (prevPageBtn) prevPageBtn.disabled = currentPage === 1;
    if (nextPageBtn)
      nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;

    if (paginationControls) {
      if (totalItems > itemsPerPage) {
        paginationControls.style.display = "flex";
      } else {
        paginationControls.style.display = "none";
      }
    }
  }

  // ページネーションイベントリスナー
  if (prevPageBtn) {
    prevPageBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        renderHistoryList(filteredData);
      }
    });
  }

  if (nextPageBtn) {
    nextPageBtn.addEventListener("click", () => {
      const totalPages = Math.ceil(filteredData.length / itemsPerPage);
      if (currentPage < totalPages) {
        currentPage++;
        renderHistoryList(filteredData);
      }
    });
  }

  // ===============================
  // 6. 団体戦詳細表示関数 (non-module.js の関数を呼び出す)
  // ===============================
  window.loadHistoricalRoomView = function (roomId) {
    const roomData = loadRoomHistoryData();
    // originalId (room.id) で検索
    const historyRoom = roomData.find((r) => r.id === roomId);

    if (!historyRoom || !historyRoom.snapshot) {
      alert("履歴データが見つかりません。");
      return;
    }

    // UIの切り替え
    if (historyControls) historyControls.classList.add("hidden");
    if (historyListContainer) historyListContainer.classList.add("hidden");
    if (paginationControls) paginationControls.style.display = "none";

    if (historyRoomViewContainer) {
      historyRoomViewContainer.classList.remove("hidden");

      // non-module.js の renderRoom を「履歴モード(true)」で呼び出す
      if (window.renderRoom) {
        // スコアボードを読み取り専用で詳細表示
        window.renderRoom(historyRoom.snapshot, true);
      } else {
        historyRoomViewContainer.innerHTML =
          "<p>エラー: 詳細描画関数 (non-module.js) が見つかりません。</p>";
      }
    }

    // 戻るボタンと出力ボタンを表示
    if (btnBack) btnBack.classList.remove("hidden");
    if (exportButtons) exportButtons.classList.remove("hidden");

    // Excel/PDF出力のために currentRoom を設定
    window.currentRoom = historyRoom.snapshot;
  };

  // ===============================
  // 6.5. ★個人戦詳細表示関数 (新規追加)
  // ===============================
  window.loadHistoricalIndividualView = function (itemId) {
    const item = historyData.find((r) => r.id === itemId);

    if (!item || !item.sets) {
      alert("個人戦の履歴データが見つかりません。");
      return;
    }

    // UIの切り替え
    if (historyControls) historyControls.classList.add("hidden");
    if (historyListContainer) historyListContainer.classList.add("hidden");
    if (paginationControls) paginationControls.style.display = "none";

    if (historyRoomViewContainer) {
      historyRoomViewContainer.classList.remove("hidden");

      // 団体戦用のコンテナをクリア (history.html にはこれらがある)
      const teamsContainer = document.getElementById("teamsContainer");
      const specialMemberContainer = document.getElementById(
        "specialMemberContainer"
      );
      if (teamsContainer) teamsContainer.innerHTML = "";
      if (specialMemberContainer) specialMemberContainer.innerHTML = "";

      // 個人戦用のHTMLを生成して挿入
      historyRoomViewContainer.innerHTML = generateIndividualViewHTML(item);
    }

    // 戻るボタンを表示 (個人戦のExcel/PDF出力は未定義のため非表示)
    if (btnBack) btnBack.classList.remove("hidden");
    if (exportButtons) exportButtons.classList.add("hidden");

    // currentRoom を null に設定 (団体戦用のため)
    window.currentRoom = null;
  };

  // 個人戦詳細HTMLを生成するヘルパー関数
  function generateIndividualViewHTML(item) {
    let totalScore = 0;
    let totalShots = 0;

    const setsHTML = item.sets
      .map((set, index) => {
        const markers = set.markers || [];
        const setScore = markers.reduce((acc, m) => acc + (m.score || 0), 0);
        const setShots = markers.length;
        totalScore += setScore;
        totalShots += setShots;

        const scoresHTML = markers
          .map(
            (m, i) =>
              `<li class="text-sm">矢${i + 1}: ${m.score ?? 0}点 (X:${Math.round(
                m.x
              )}, Y:${Math.round(m.y)})</li>`
          )
          .join("");

        return `
          <div class="app-card p-4 bg-white dark:bg-slate-900 rounded-xl shadow-lg space-y-3 mb-4">
            <h3 class="font-bold text-lg border-b border-slate-200 dark:border-slate-700 pb-2">
              立ち ${index + 1} (合計: ${setScore}点 / ${setShots}射)
            </h3>
            <div class="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <ul class="space-y-1">${
                scoresHTML || "<li>記録なし</li>"
              }</ul>
            </div>
          </div>
        `;
      })
      .join("");

    return `
        <h2 class="text-2xl font-bold mb-4 text-slate-900 dark:text-white">
          個人記録詳細 (${item.date})
        </h2>
        <div class="app-card p-5 rounded-2xl shadow-lg mb-4">
          <h3 class="text-xl font-bold mb-2">総合計</h3>
          <p class="text-2xl font-bold text-primary">${totalScore}点 / ${totalShots}射</p>
        </div>
        ${setsHTML}
      `;
  }

  // ===============================
  // 7. 一覧へ戻る処理 (★汎用クリア処理に修正)
  // ===============================
  window.goBackToHistoryList = function () {
    // 詳細表示コンテナとボタンを非表示
    if (historyRoomViewContainer) {
      historyRoomViewContainer.classList.add("hidden");
      historyRoomViewContainer.innerHTML = ""; // ★ 中身をクリア

      // 団体戦用に元々あったコンテナを再生成 (history.html の構造に戻す)
      historyRoomViewContainer.innerHTML = `
          <div id="teamsContainer" class="space-y-4"></div>
          <div id="specialMemberContainer" class="mt-6"></div>
        `;
    }

    if (exportButtons) exportButtons.classList.add("hidden");
    if (btnBack) btnBack.classList.add("hidden");

    // non-module.js が描画した内容をクリアする (念のため残す)
    const teamsContainer = document.getElementById("teamsContainer");
    const specialMemberContainer = document.getElementById(
      "specialMemberContainer"
    );
    if (teamsContainer) teamsContainer.innerHTML = "";
    if (specialMemberContainer) specialMemberContainer.innerHTML = "";

    // コントロールとリストを表示
    if (historyControls) historyControls.classList.remove("hidden");
    if (historyListContainer) historyListContainer.classList.remove("hidden");
    if (paginationControls) paginationControls.style.display = "flex";

    // currentRoomをクリア
    window.currentRoom = null;

    // リストを再描画（現状のフィルターで）
    renderHistoryList(filteredData);
  };

  // ===============================
  // 8. Excel/PDF 出力イベントリスナー (変更なし)
  // ===============================
  if (exportExcelBtn) {
    exportExcelBtn.addEventListener("click", () => {
      // firebase-room.js で定義されている関数を優先して呼び出す
      if (
        window.currentRoom &&
        typeof window.exportPlayerScoresToXLSX === "function"
      ) {
        window.exportPlayerScoresToXLSX();
      } else if (
        window.currentRoom &&
        typeof window.exportToExcel === "function"
      ) {
        // フォールバック
        const fileName = `${
          window.currentRoom.name || "団体戦記録"
        }_${new Date().toISOString().split("T")[0]}`;
        window.exportToExcel(window.currentRoom, fileName);
      } else {
        alert("Excel出力に必要なデータまたは関数が見つかりません。");
      }
    });
  }

  if (exportPdfBtn) {
    exportPdfBtn.addEventListener("click", () => {
      // firebase-room.js で定義されている関数を優先して呼び出す
      if (
        window.currentRoom &&
        typeof window.exportPlayerScoresToPDF === "function"
      ) {
        window.exportPlayerScoresToPDF();
      } else if (
        window.currentRoom &&
        typeof window.exportToPDF === "function"
      ) {
        // フォールバック
        const fileName = `${
          window.currentRoom.name || "団体戦記録"
        }_${new Date().toISOString().split("T")[0]}`;
        window.exportToPDF(window.currentRoom, fileName);
      } else {
        alert("PDF出力に必要なデータまたは関数が見つかりません。");
      }
    });
  }

  // ===============================
  // 9. イベントリスナーと初期ロード
  // ===============================
  if (applyFiltersBtn) {
    applyFiltersBtn.addEventListener("click", (e) => {
      e.preventDefault();
      applyFilters();
    });
  }

  if (btnBack) {
    btnBack.addEventListener("click", window.goBackToHistoryList);
  }

  // 初期ロード
  historyData = getAllHistory();
  filteredData = historyData;
  renderHistoryList(filteredData);
});