/**
 * non-module.js (統合版)
 * モジュール外の既存コードをベースに修正を入れた部分
 * 主目的: registeredRole が "player" のときも "manager" と同等の操作権限を付与する
 */

const SELECTIONS = [0,3,5,7,9,10];
const TEAM_SIZE = 3;
const ARROW_COUNT = 4;
let currentRoom = null; 
let isHistoryView = false;

document.addEventListener("DOMContentLoaded", () => {

  // UI要素キャッシュ
  const openRegisterModalBtn = document.getElementById("openRegisterModalBtn");
  const openManagementModalBtn = document.getElementById("openManagementModalBtn");
  const modalWrapper = document.getElementById("modalWrapper");
  const modalContent = document.getElementById("modalContent");
  const qrCodeDisplayModal = document.getElementById("qrCodeDisplayModal");
  const teamsContainer = document.getElementById("teamsContainer");
  const roomSummary = document.getElementById("roomSummary");
  const roomForm = document.getElementById("roomForm");
  const joinForm = document.getElementById("joinForm");
  const leaveBtn = document.getElementById("leaveRoomBtn");

  // ユーティリティ
  function calcPlayerTotal(player) { 
    if(!player || !player.scores) return 0; 
    const scoresArray = Array.isArray(player.scores) 
      ? player.scores 
      : Object.values(player.scores || []);
    return scoresArray.reduce((acc,v) => acc + (Number.isFinite(v) ? v : 0), 0); 
  }

  function calcTeamTotal(teamId) { 
    if (!currentRoom || !currentRoom.players) return 0;
    const playersArray = Object.values(currentRoom.players);
    const teamPlayers = playersArray.filter(p => p.teamId === teamId); 
    return teamPlayers.reduce((acc,p) => acc + calcPlayerTotal(p), 0); 
  }

  function calcTeamCount(teamId) { 
    if (!currentRoom || !currentRoom.players) return 0;
    const playersArray = Object.values(currentRoom.players);
    return playersArray.filter(p => p.teamId === teamId).length; 
  }

  // localStorage 登録フラグ
  function isUserRegisteredForRoom(roomId) { 
    return !!localStorage.getItem("MATOMA_user_registered_" + roomId); 
  }
  
  function setUserRegisteredForRoom(roomId, playerId) { 
    localStorage.setItem("MATOMA_user_registered_" + roomId, playerId || "1"); 
  }
  
  window.setUserRegisteredForRoom = setUserRegisteredForRoom;

  // 履歴保存 / 読み込み
  window.saveRoomToHistory = function (room) {
    try {
      if (!room || !room.id) return;
      const history = JSON.parse(localStorage.getItem("MATOMA_rooms_history") || "{}");
      history[room.id] = {
        id: room.id,
        name: room.name,
        createdAt: room.createdAt 
          ? (room.createdAt.seconds 
            ? new Date(room.createdAt.seconds * 1000).toISOString() 
            : new Date(room.createdAt).toISOString()) 
          : new Date().toISOString(),
        snapshot: room
      };
      localStorage.setItem("MATOMA_rooms_history", JSON.stringify(history));
    } catch (e) { 
      console.error("saveRoomToHistory error", e); 
    }
  };

  window.loadRoomFromHistory = function (roomId) {
    try {
      const history = JSON.parse(localStorage.getItem("MATOMA_rooms_history") || "{}");
      return history[roomId] ? history[roomId].snapshot || history[roomId] : null;
    } catch (e) { 
      return null; 
    }
  };

  // UI トグル(登録ボタン表示制御)
  function toggleMemberControlButtons(room) {
    if (!room || isHistoryView) {
      if (openRegisterModalBtn) openRegisterModalBtn.style.display = 'none';
      if (openManagementModalBtn) openManagementModalBtn.style.display = 'none';
      return;
    }
    const registered = isUserRegisteredForRoom(room.id);
    if(registered) {
      if (openRegisterModalBtn) openRegisterModalBtn.style.display = 'none';
      if (openManagementModalBtn) openManagementModalBtn.style.display = 'block';
    } else {
      if (openRegisterModalBtn) openRegisterModalBtn.style.display = 'block';
      if (openManagementModalBtn) openManagementModalBtn.style.display = 'none';
    }
  }

  // ルーム集計更新
  window.updateRoomSummary = function() {
    if(!currentRoom){ 
      if (roomSummary) roomSummary.innerText = "—"; 
      return; 
    }
    const playersArray = currentRoom.players 
      ? Object.values(currentRoom.players) 
      : [];
    const teamsArray = currentRoom.teams 
      ? (Array.isArray(currentRoom.teams) 
        ? currentRoom.teams 
        : Object.values(currentRoom.teams)) 
      : [];
    const totalPlayers = playersArray.length;
    const teamTotals = teamsArray.map(t => `${t.name}=${calcTeamTotal(t.id)}`);
    if (roomSummary) {
      roomSummary.innerText = `プレイヤー数: ${totalPlayers}\nチーム数: ${teamsArray.length}\n各チーム合計: ${teamTotals.join(" , ")}`;
    }
  };

  // チーム・プレイヤー描画(修正版: player を manager と同等に扱う)
  window.renderTeamsAndPlayers = function() {
    if (!teamsContainer) return;
    teamsContainer.innerHTML = "";
    if (!currentRoom) return;

    // Firestore 安全対策
    currentRoom.players = currentRoom.players || {};
    currentRoom.teams = currentRoom.teams || {};
    currentRoom.members = currentRoom.members || {};
    currentRoom.playersOrder = currentRoom.playersOrder || [];

    const playersArray = Object.values(currentRoom.players);
    const teamsArray = Array.isArray(currentRoom.teams)
      ? currentRoom.teams
      : Object.values(currentRoom.teams);

    // 登録順ソート
    if (currentRoom.playersOrder.length > 0) {
      playersArray.sort((a, b) => {
        const indexA = currentRoom.playersOrder.indexOf(a.id);
        const indexB = currentRoom.playersOrder.indexOf(b.id);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });
    }

    const scoreOptionsHtml = SELECTIONS.map(score => 
      `<option value="${score}">${score}</option>`
    ).join('');
    const ARROW_COUNT_CURRENT = currentRoom.settings?.arrowCount || ARROW_COUNT;

    // 登録者情報
    const registeredPlayerId = localStorage.getItem("MATOMA_user_registered_" + currentRoom.id);
    const registeredRole = currentRoom.members?.[registeredPlayerId]?.role;
    
    // ★ ここで player を manager と同等に扱うフラグを導入
    const isManagerLike = (registeredRole === "manager" || registeredRole === "player");
    const canEditRoom = !isHistoryView;

    // チームがない場合
    if (teamsArray.length === 0) {
      teamsContainer.innerHTML = '<p class="text-center text-slate-500">チームが設定されていません。管理画面からチームを追加してください。</p>';
    }

    // チームごとの描画
    teamsArray.forEach(team => {
      const teamPlayers = playersArray.filter(p => p.teamId === team.id);
      const card = document.createElement("div");
      card.className = "team-card app-card bg-white dark:bg-slate-900 rounded-2xl shadow p-4";

      // ヘッダー
      const header = document.createElement("div");
      header.className = "flex items-center justify-between mb-3";
      header.innerHTML = `
        <div>
          <strong class="text-lg">${team.name}</strong>
          <div class="text-sm text-slate-500">メンバー: ${teamPlayers.length}/${currentRoom.settings.teamSize}</div>
        </div>
      `;

      // チーム操作ボタン(manager と player 両方許可)
      const btns = document.createElement("div");
      btns.className = "flex gap-2";
      if (!isHistoryView && isManagerLike) {
        const addTeamBtn = document.createElement("button");
        addTeamBtn.className = "px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-md text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors";
        addTeamBtn.innerText = "チーム追加";
        addTeamBtn.onclick = () => {
          const name = prompt("新しいチーム名を入力してください:");
          if (name && name.trim()) {
            window.addTeamToRoom(currentRoom.id, name.trim())
              .then(() => {
                alert("チームを追加しました。");
              })
              .catch(err => {
                console.error("チーム追加エラー:", err);
                alert("チーム追加に失敗しました。");
              });
          }
        };

        const renameBtn = document.createElement("button");
        renameBtn.className = "px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-md text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors";
        renameBtn.innerText = "名前変更";
        renameBtn.onclick = () => {
          const n = prompt("チーム名を入力してください", team.name);
          if (n) {
            window.renameTeam 
              ? window.renameTeam(currentRoom.id, team.id, n) 
              : alert("renameTeam 未定義");
          }
        };

        btns.appendChild(addTeamBtn);
        btns.appendChild(renameBtn);
      }
      header.appendChild(btns);
      card.appendChild(header);

      // メンバーリスト
      const list = document.createElement("div");
      list.className = "space-y-2";

      teamPlayers.forEach(player => {
        const row = document.createElement("div");
        row.className = "player-row flex justify-between items-center";

        const left = document.createElement("div");
        left.className = "player-row-left flex items-center gap-2";

        const right = document.createElement("div");
        right.className = "player-row-right flex items-center gap-2";

        // 名前入力欄
        const nameInp = document.createElement("input");
        nameInp.value = player.name || "";
        nameInp.className = "rounded-md border-2 border-slate-200 dark:border-slate-700 px-2 py-1 text-sm bg-white dark:bg-slate-800";

        // ★ canEditName を isManagerLike に合わせて変更(player も編集できる)
        const canEditName = canEditRoom && isManagerLike;

        if (!canEditName) {
          nameInp.disabled = true;
          nameInp.classList.add("bg-gray-100", "dark:bg-slate-700", "opacity-70", "cursor-not-allowed");
        } else {
          nameInp.onchange = () => {
            if (window.updatePlayerInfo) {
              window.updatePlayerInfo(currentRoom.id, player.id, nameInp.value);
            } else {
              window.updatePlayerName(currentRoom.id, player.id, nameInp.value);
            }
          };
        }
        left.appendChild(nameInp);

        // チーム移動ボタン(player も可能)
        if (canEditRoom && isManagerLike) {
          const moveBtn = document.createElement("button");
          moveBtn.className = "px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-md text-xs hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors";
          moveBtn.innerText = "移動";
          moveBtn.onclick = () => {
            const options = teamsArray.map(t => `${t.id}:${t.name}`).join("\n");
            const sel = prompt("移動先のIDを入力(例: T2)\n" + options);
            if (sel) {
              const found = teamsArray.find(t => t.id === sel.trim());
              if (found) {
                if (window.movePlayerTeam) {
                  window.movePlayerTeam(currentRoom.id, player.id, found.id);
                } else {
                  alert("movePlayerTeam 未定義");
                }
              } else {
                alert("チームが見つかりませんでした");
              }
            }
          };
          left.appendChild(moveBtn);
        }

        row.appendChild(left);

        // スコア入力欄(player は manager と同等に編集可能)
        const canEditScore = canEditRoom && isManagerLike;

        const playerScores = Array.isArray(player.scores)
          ? player.scores
          : (player.scores ? Object.values(player.scores) : []);

        for (let arrowIndex = 0; arrowIndex < ARROW_COUNT_CURRENT; arrowIndex++) {
          const select = document.createElement("select");
          select.innerHTML = `<option value="">-</option>` + scoreOptionsHtml;

          const score = playerScores[arrowIndex];
          if (score !== null && score !== undefined) {
            select.value = score.toString();
          }

          select.className = "player-score-input rounded-md border-2 border-slate-200 dark:border-slate-700 px-1 py-1 text-sm text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800";

          if (!canEditScore) {
            select.disabled = true;
            select.classList.add("bg-gray-100", "dark:bg-slate-700", "opacity-70", "cursor-not-allowed");
          } else {
            select.onchange = () => {
              const v = parseInt(select.value);
              const newScore = Number.isNaN(v) ? null : v;
              if (window.updatePlayerTurnScore) {
                window.updatePlayerTurnScore(currentRoom.id, player.id, arrowIndex, newScore);
              }
            };
          }
          right.appendChild(select);
        }

        // 合計表示
        const total = document.createElement("div");
        total.id = `player-total-${player.id}`;
        total.className = "w-14 text-right font-semibold";
        total.innerText = calcPlayerTotal(player);
        right.appendChild(total);

        // 削除ボタン(player も可能)
        if (canEditRoom && isManagerLike) {
          const del = document.createElement("button");
          del.className = "px-2 py-1 bg-red-500 text-white rounded-md text-xs hover:bg-red-600 transition-colors";
          del.innerText = "削除";
          del.onclick = () => {
            if (window.deletePlayer) {
              window.deletePlayer(currentRoom.id, player.id);
            } else {
              // 簡易ローカル削除(実際は Firestore update を使ってください)
              if (confirm(`${player.name} を削除しますか?`)) {
                delete currentRoom.players[player.id];
                if (Array.isArray(currentRoom.playersOrder)) {
                  const idx = currentRoom.playersOrder.indexOf(player.id);
                  if (idx !== -1) currentRoom.playersOrder.splice(idx,1);
                }
                window.renderTeamsAndPlayers();
                window.updateRoomSummary();
              }
            }
          };
          right.appendChild(del);
        }

        row.appendChild(right);
        list.appendChild(row);
      });

      // チーム合計
      const teamTotal = document.createElement("div");
      teamTotal.className = `mt-3 text-sm font-bold team-total-display team-${team.id}-total`;
      teamTotal.innerText = `チーム合計: ${calcTeamTotal(team.id)}`;

      card.appendChild(list);
      card.appendChild(teamTotal);
      teamsContainer.appendChild(card);
    });

    // 未割当プレイヤー表示(割当ボタンは player も可能)
    const unassigned = playersArray.filter(p => !p.teamId || p.teamId === "unassigned");
    if (unassigned.length > 0) {
      const ucard = document.createElement("div");
      ucard.className = "team-card app-card bg-white dark:bg-slate-900 rounded-2xl shadow p-4";
      ucard.innerHTML = `<strong>未割当プレイヤー</strong><div class="text-sm text-slate-500">合計 ${unassigned.length}</div>`;

      unassigned.forEach(player => {
        const el = document.createElement("div");
        el.className = "flex items-center justify-between mt-2";
        el.innerHTML = `
          <div>${player.name}</div>
          ${(!isHistoryView && isManagerLike) 
            ? `<div class="flex gap-2"><button class="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-md text-xs assign-btn hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">割当</button></div>` 
            : ''}
        `;

        if (!isHistoryView && isManagerLike) {
          const btn = el.querySelector("button");
          if (btn) {
            btn.onclick = () => {
              let target = teamsArray.find(t => 
                calcTeamCount(t.id) < currentRoom.settings.teamSize
              );
              
              if (!target) {
                // チーム作成後に割当する
                const newTeamName = prompt("新しいチーム名を入力してください:");
                if (!newTeamName || !newTeamName.trim()) return;
                
                window.addTeamToRoom(currentRoom.id, newTeamName.trim())
                  .then((newId) => {
                    if (window.movePlayerTeam) {
                      window.movePlayerTeam(currentRoom.id, player.id, newId);
                    } else {
                      player.teamId = newId;
                      window.renderTeamsAndPlayers();
                    }
                  })
                  .catch(() => alert("チーム作成に失敗しました"));
              } else {
                if (window.movePlayerTeam) {
                  window.movePlayerTeam(currentRoom.id, player.id, target.id);
                } else {
                  player.teamId = target.id;
                  window.renderTeamsAndPlayers();
                }
              }
            };
          }
        }

        ucard.appendChild(el);
      });

      teamsContainer.appendChild(ucard);
    }

    // 監督者・その他欄(2カラムレイアウト)
    const specialContainer = document.getElementById("specialMemberContainer");
    if (specialContainer) {
      specialContainer.innerHTML = "";

      const managers = playersArray.filter(p => p.role === "manager");
      const others = playersArray.filter(p => p.role === "other");

      // 2カラムのグリッドコンテナを作成
      const gridContainer = document.createElement("div");
      gridContainer.className = "grid grid-cols-1 md:grid-cols-2 gap-4";

      const managerSection = document.createElement("section");
      managerSection.className = "p-4 bg-white dark:bg-slate-900 rounded-2xl shadow";
      managerSection.innerHTML = `<h3 class="text-lg font-bold mb-2">監督者</h3>` +
        (managers.length === 0
          ? `<p class="text-slate-500 text-sm">登録された監督者はいません。</p>`
          : managers.map(m => 
              `<div class="border-b border-slate-200 dark:border-slate-700 py-2">${m.name}</div>`
            ).join(""));

      const otherSection = document.createElement("section");
      otherSection.className = "p-4 bg-white dark:bg-slate-900 rounded-2xl shadow";
      otherSection.innerHTML = `<h3 class="text-lg font-bold mb-2">その他</h3>` +
        (others.length === 0
          ? `<p class="text-slate-500 text-sm">登録されたメンバーはいません。</p>`
          : others.map(o => 
              `<div class="border-b border-slate-200 dark:border-slate-700 py-2">${o.name}</div>`
            ).join(""));

      gridContainer.appendChild(managerSection);
      gridContainer.appendChild(otherSection);
      specialContainer.appendChild(gridContainer);
    }
  };

  // 合計再描画(個人・チーム)
  try {
    if (currentRoom && currentRoom.players) {
      Object.values(currentRoom.players).forEach(p => {
        const el = document.getElementById(`player-total-${p.id}`);
        if (el) el.innerText = calcPlayerTotal(p);
      });
    }

    if (currentRoom && currentRoom.teams) {
      const teamsArray = Array.isArray(currentRoom.teams)
        ? currentRoom.teams
        : Object.values(currentRoom.teams);
      teamsArray.forEach(t => {
        const totalEl = document.querySelector(`.team-${t.id}-total`);
        if (totalEl) totalEl.innerText = `チーム合計: ${calcTeamTotal(t.id)}`;
      });
    }
  } catch (e) {
    console.error("合計再描画エラー:", e);
  }

  // 履歴表示
  window.renderRoomHistory = function() {
    const historyList = document.getElementById("historyList");
    const roomHistoryElement = document.getElementById("roomHistory");
    
    // 履歴セクション全体を非表示にする
    if (roomHistoryElement) {
      roomHistoryElement.style.display = 'none';
    }
    
    // 以下のコードは実行されないが、将来的な実装のために残しておく
    /*
    const rooms = JSON.parse(localStorage.getItem("MATOMA_rooms_history") || "{}");
    const roomIds = Object.keys(rooms).sort((a,b) => 
      new Date(rooms[b].createdAt) - new Date(rooms[a].createdAt)
    );
    
    if (currentRoom) {
      if(roomHistoryElement) roomHistoryElement.style.display = 'none';
      return;
    } else {
      if(roomHistoryElement) roomHistoryElement.style.display = 'block';
    }
    
    if (!historyList) return;
    historyList.innerHTML = "";
    
    if (roomIds.length === 0) {
      historyList.innerHTML = '<p class="text-sm text-slate-500" id="noHistoryMessage">履歴はありません。</p>';
      return;
    }
    
    roomIds.forEach(id => {
      const room = rooms[id];
      const item = document.createElement("div");
      item.className = "flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors";
      item.innerHTML = `
        <div>
          <strong class="block">${room.name}</strong>
          <span class="text-xs text-slate-600 dark:text-slate-400">${room.id} (${new Date(room.createdAt).toLocaleDateString()})</span>
        </div>
        <button data-room-id="${id}" class="join-history-btn px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm transition-colors">詳細閲覧</button>
      `;
      historyList.appendChild(item);
    });
    
    historyList.querySelectorAll('.join-history-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const roomId = e.target.getAttribute('data-room-id');
        const room = window.loadRoomFromHistory(roomId);
        if (room) {
          isHistoryView = true; 
          window.renderRoom(room, true);
          
          const title = document.getElementById("roomTitle");
          const subtitle = document.getElementById("roomSubtitle");
          if (title) title.innerText = `${room.name} の【履歴閲覧中】`;
          if (subtitle) subtitle.innerText = `ルームID: ${room.id} - これは過去の記録です。スコア編集はできません。`;
          
          if (leaveBtn) leaveBtn.innerText = "履歴閲覧を終了";
          alert(`${room.name} の過去の記録を閲覧しています。編集はできません。`);
        }
      });
    });
    */
  };

  // モーダル制御
  window.closeModal = function() {
    if (!modalWrapper || !modalContent) return;
    modalWrapper.classList.add("hidden");
    modalWrapper.classList.remove("flex");
    modalContent.innerHTML = '';
    
    const qrBtn = document.getElementById("qrIconBtn");
    if (qrBtn) {
      qrBtn.classList.remove("bg-primary/20", "text-primary", "dark:bg-primary/50");
      qrBtn.classList.add("bg-slate-200", "dark:bg-slate-700", "text-slate-700", "dark:text-slate-200");
    }
  };

  // addPlayer 登録ハンドラ(修正版)
  window.handleRegisterSelf = async function() {
    if (!modalContent) return;
    const nameInput = modalContent.querySelector('#registerNameInput');
    const roleSelect = modalContent.querySelector('#registerRoleSelect');
    const name = (nameInput?.value || "").trim();
    const role = roleSelect?.value || 'player';
    
    if(!currentRoom){ 
      alert("ルームに参加していません。"); 
      window.closeModal(); 
      return; 
    }
    if(!name){ 
      alert("名前を入力してください"); 
      return; 
    }
    
    const playerId = await window.addPlayerToRoom(currentRoom.id, name, role);
    
    if (!playerId) {
      alert("プレイヤー登録に失敗しました。");
      return;
    }
    
    // 登録済みフラグをローカルにつける
    setUserRegisteredForRoom(currentRoom.id, playerId);
    
    // UI 再描画
    window.renderTeamsAndPlayers(); 
    
    isHistoryView = false;
    toggleMemberControlButtons(currentRoom); 
    window.closeModal();
    alert("登録しました。よろしくお願いします!");

    // 合計再描画
    try {
      if (currentRoom && currentRoom.players) {
        Object.values(currentRoom.players).forEach(p => {
          const el = document.getElementById(`player-total-${p.id}`);
          if (el) el.innerText = calcPlayerTotal(p);
        });
      }

      if (currentRoom && currentRoom.teams) {
        Object.values(currentRoom.teams).forEach(t => {
          const totalEl = document.querySelector(`.team-${t.id}-total`);
          if (totalEl) totalEl.innerText = `チーム合計: ${calcTeamTotal(t.id)}`;
        });
      }
    } catch (e) {
      console.error("合計再描画エラー:", e);
    }
  };

  window.handleAddPlayer = function() {
    if (!modalContent) return;
    const nameInput = modalContent.querySelector("#newPlayerNameModal");
    const name = (nameInput?.value || "").trim(); 
    if (!currentRoom) { 
      alert("ルーム情報が取得できません。"); 
      window.closeModal(); 
      return; 
    }
    if(!name){ 
      alert("プレイヤー名を入力してください"); 
      return; 
    }
    window.addPlayerToRoom(currentRoom.id, name, 'player'); 
    if (nameInput) nameInput.value = ""; 
    alert("プレイヤーを追加しました。");
  };

  window.handleAutoAssign = function() {
    if (!currentRoom) { 
      alert("ルーム情報が取得できません。"); 
      return; 
    }
    if (window.handleAutoAssignFirebase) {
      window.handleAutoAssignFirebase(currentRoom.id);
    } else {
      alert("自動割当処理が未定義です。");
    }
  };

  function openModal(contentId) {
    if (isHistoryView && contentId !== 'qrModalContent') {
      alert("履歴閲覧モードではメンバーの追加・管理はできません。");
      return;
    }
    
    const template = document.getElementById(contentId);
    if (template && modalContent && modalWrapper) {
      modalContent.innerHTML = `
        <div class="p-6 pb-0 flex justify-end">
          <button onclick="closeModal()" class="text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100 p-1 rounded-full transition-colors">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
      ` + template.innerHTML;
      
      modalWrapper.classList.remove("hidden");
      modalWrapper.classList.add("flex");
      
      if (contentId === 'registerModalContent') {
        modalContent.querySelector('#registerSelfBtn').onclick = window.handleRegisterSelf;
        modalContent.querySelector('#skipRegisterBtn').onclick = window.closeModal;
      } else if (contentId === 'managementModalContent') {
        modalContent.querySelector('#addPlayerBtnModal').onclick = window.handleAddPlayer; 
        modalContent.querySelector('#autoAssignBtnModal').onclick = window.handleAutoAssign;
        const closeBtn = modalContent.querySelector('button[onclick="closeModal()"]');
        if (closeBtn) closeBtn.onclick = window.closeModal;
      }
    }
  }

  // ルームUIイベント
  if (leaveBtn) {
    leaveBtn.addEventListener("click", () => leaveRoom(false));
  }
  
  if (openRegisterModalBtn) {
    openRegisterModalBtn.addEventListener('click', () => openModal('registerModalContent'));
  }
  
  if (openManagementModalBtn) {
    openManagementModalBtn.addEventListener('click', () => openModal('managementModalContent'));
  }

  const createRoomBtn = document.getElementById("createRoomBtn");
  if (createRoomBtn) {
    createRoomBtn.addEventListener("click", () => { 
      if (roomForm) roomForm.style.display = "block"; 
      if (joinForm) joinForm.style.display = "none"; 
      
      const rc = document.getElementById("roomControls"); 
      if (rc) rc.style.display = "block"; 
      
      window.closeModal();
      isHistoryView = false; 
      if (leaveBtn) leaveBtn.innerText = "退室";
    });
  }

  const cancelRoomBtn = document.getElementById("cancelRoomBtn");
  if (cancelRoomBtn) {
    cancelRoomBtn.addEventListener("click", () => { 
      if (roomForm) roomForm.style.display = "none"; 
    });
  }

  // ルーム作成(修正版: result を受け取る)
  const submitRoomBtn = document.getElementById("submitRoomBtn");
  if (submitRoomBtn) {
    submitRoomBtn.addEventListener("click", async () => {
      const nEl = document.getElementById("roomName");
      const n = nEl ? nEl.value.trim() : "";
      if(!n){ 
        alert("ルーム名を入力してください"); 
        return; 
      }
      
      const result = await window.doCreateRoom(n);
      if (result && result.roomId) {
        window.startScoreSynchronization(result.roomId);
        if (roomForm) roomForm.style.display = "none";
        alert(`ルーム「${n}」を作成しました。\n招待コード: ${result.inviteCode}\n参加者に共有してください。`);
      } else {
        alert("ルーム作成に失敗しました。");
      }
    });
  }

  const joinRoomBtn = document.getElementById("joinRoomBtn");
  if (joinRoomBtn) {
    joinRoomBtn.addEventListener("click", () => { 
      if (joinForm) joinForm.style.display = "block"; 
      if (roomForm) roomForm.style.display = "none"; 
      
      const rc = document.getElementById("roomControls"); 
      if (rc) rc.style.display = "block"; 
      
      window.closeModal();
      isHistoryView = false; 
      if (leaveBtn) leaveBtn.innerText = "退室";
    });
  }

  const cancelJoinBtn = document.getElementById("cancelJoinBtn");
  if (cancelJoinBtn) {
    cancelJoinBtn.addEventListener("click", () => { 
      if (joinForm) joinForm.style.display = "none"; 
    });
  }
  
  // ルーム参加(修正版)
  const doJoinBtn = document.getElementById("doJoinBtn");
  if (doJoinBtn) {
    doJoinBtn.addEventListener("click", async () => {
      const inputEl = document.getElementById("joinInput");
      const v = inputEl ? inputEl.value.trim() : "";
      if(!v) {
        return alert("招待コードまたはURLを入力してください");
      }
      
      let id = null; 
      if(v.startsWith("MATOMA_JOIN:")) {
        id = v.split(":")[1]; 
      } else { 
        const m = v.match(/[#?&]room=([A-Za-z0-9]+)/); 
        if(m) id = m[1]; 
      }
      
      if(!id) {
        return alert("招待コードまたはURLが見つかりません");
      }

      try {
        const roomId = await window.joinTeamMatch(id);

        if(roomId){ 
          window.startScoreSynchronization(roomId);
          isHistoryView = false; 
          if (joinForm) joinForm.style.display = "none"; 
          alert(`✅ ルームに参加しました。`);
        } else {
          console.warn("ルーム参加失敗: joinTeamMatch returned null");
        }
      } catch(err) {
        console.error("❌ joinボタン内エラー:", err);
        alert("ルーム参加に失敗しました: " + (err.message || "不明なエラー"));
      }
    });
  }

  // ハッシュ処理・最後のルーム・履歴閲覧処理
  (function handleHashOnLoad(){
    // URLパラメータから履歴閲覧モードをチェック
    const urlParams = new URLSearchParams(window.location.search);
    const historyParam = urlParams.get('history');
    
    if (historyParam) {
      // 履歴閲覧モードで起動
      const room = window.loadRoomFromHistory(historyParam);
      if (room) {
        isHistoryView = true;
        window.currentRoom = room;
        
        if (joinForm) joinForm.style.display = "none";
        if (roomForm) roomForm.style.display = "none";
        const rc = document.getElementById("roomControls");
        if (rc) rc.style.display = "block";
        
        window.renderRoom(room, true);
        
        const title = document.getElementById("roomTitle");
        const subtitle = document.getElementById("roomSubtitle");
        if (title) title.innerText = `${room.name} の【履歴閲覧中】`;
        if (subtitle) subtitle.innerText = `ルームID: ${room.id} - これは過去の記録です。スコア編集はできません。`;
        
        if (leaveBtn) {
          leaveBtn.style.display = "block";
          leaveBtn.innerText = "履歴閲覧を終了";
        }
        
        alert(`${room.name} の過去の記録を閲覧しています。編集はできません。`);
        return;
      }
    }
    
    // ハッシュからルームIDをチェック（通常の参加モード）
    const m = (location.hash || "").match(/room=([A-Za-z0-9]+)/);
    if(m){ 
      if (joinForm) joinForm.style.display = "block"; 
      const joinInput = document.getElementById("joinInput");
      if (joinInput) joinInput.value = `MATOMA_JOIN:${m[1]}`; 
      
      const rc = document.getElementById("roomControls"); 
      if (rc) rc.style.display = "block"; 
      
      const title = document.getElementById("roomTitle"); 
      if (title) title.innerText = `招待されています。参加コードを確認してください。`;
      
      const subtitle = document.getElementById("roomSubtitle"); 
      if (subtitle) subtitle.innerText = "「参加」を押して入室してください。";
      return; 
    }
    
    const lastRoomId = localStorage.getItem("MATOMA_last_room_id");
    if (lastRoomId) {
      if (joinForm) joinForm.style.display = "block"; 
      const joinInput = document.getElementById("joinInput");
      if (joinInput) joinInput.value = `MATOMA_JOIN:${lastRoomId}`;
      
      const rc = document.getElementById("roomControls"); 
      if (rc) rc.style.display = "block";
      
      const title = document.getElementById("roomTitle"); 
      if (title) title.innerText = `以前のルームに再参加しますか?`;
      
      const subtitle = document.getElementById("roomSubtitle"); 
      if (subtitle) subtitle.innerText = "「参加」を押して再入室してください。";
    }
  })();

  // ストップウォッチロジック(簡易)
  let swStartTime = 0, swElapsed = 0, swTimer = null;
  const swDisplay = document.getElementById("swDisplay");
  const floatingSwDisplay = document.getElementById("floatingSwDisplay");
  const lapList = document.getElementById("lapList");
  
  function formatTime(ms){ 
    const c = Math.floor(ms/10)%100;
    const s = Math.floor(ms/1000)%60;
    const m = Math.floor(ms/60000); 
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(c).padStart(2,'0')}`; 
  }
  
  function updateSwDisplay(){ 
    const val = swElapsed + (swStartTime ? (Date.now() - swStartTime) : 0); 
    const time = formatTime(val); 
    if (swDisplay) swDisplay.innerText = time; 
    if (floatingSwDisplay) floatingSwDisplay.innerText = time; 
  }
  
  const startAction = () => { 
    if(swTimer) return; 
    swStartTime = Date.now(); 
    swTimer = setInterval(updateSwDisplay, 50); 
  };
  
  const pauseAction = () => { 
    if(!swTimer) return; 
    swElapsed += Date.now() - swStartTime; 
    clearInterval(swTimer); 
    swTimer = null; 
    swStartTime = 0; 
  };
  
  const resetAction = () => { 
    swElapsed = 0; 
    swStartTime = 0; 
    clearInterval(swTimer); 
    swTimer = null; 
    updateSwDisplay(); 
    if (lapList) lapList.innerHTML = ""; 
  };
  
  const swStartBtn = document.getElementById("swStart");
  const swPauseBtn = document.getElementById("swPause");
  const swResetBtn = document.getElementById("swReset");
  const swLapBtn = document.getElementById("swLap");
  
  if (swStartBtn) swStartBtn.addEventListener("click", startAction);
  if (swPauseBtn) swPauseBtn.addEventListener("click", pauseAction);
  if (swResetBtn) swResetBtn.addEventListener("click", resetAction);
  if (swLapBtn) {
    swLapBtn.addEventListener("click", () => { 
      if (lapList) {
        const currentTime = swElapsed + (swStartTime ? (Date.now() - swStartTime) : 0);
        lapList.innerHTML = `<li>${formatTime(currentTime)}</li>` + lapList.innerHTML; 
      }
    });
  }

  // フローティングストップウォッチボタン
  const floatingSwStart = document.getElementById("floatingSwStart");
  const floatingSwPause = document.getElementById("floatingSwPause");
  const floatingSwReset = document.getElementById("floatingSwReset");
  const floatingSwLap = document.getElementById("floatingSwLap");
  
  if (floatingSwStart) floatingSwStart.addEventListener("click", startAction);
  if (floatingSwPause) floatingSwPause.addEventListener("click", pauseAction);
  if (floatingSwReset) floatingSwReset.addEventListener("click", resetAction);
  if (floatingSwLap) {
    floatingSwLap.addEventListener("click", () => { 
      if (lapList) {
        const currentTime = swElapsed + (swStartTime ? (Date.now() - swStartTime) : 0);
        lapList.innerHTML = `<li>${formatTime(currentTime)}</li>` + lapList.innerHTML; 
      }
    });
  }

  // QR / 共有設定関数
  function setupShareControls(room) {
    const qrIconBtn = document.getElementById("qrIconBtn");
    const shareIconBtn = document.getElementById("shareIconBtn");
    if (!qrIconBtn || !shareIconBtn) return;
    
    qrIconBtn.classList.remove("bg-slate-200", "dark:bg-slate-700", "text-slate-700", "dark:text-slate-200");
    qrIconBtn.classList.add("bg-primary/20", "text-primary", "dark:bg-primary/50");
    
    const code = `MATOMA_JOIN:${room.id}`;
    const link = location.href.split('#')[0] + "#room=" + room.id;
    
    shareIconBtn.onclick = async () => { 
      if (isHistoryView) {
        return alert("履歴閲覧モードでは共有できません。");
      }
      
      const textToCopy = `【MATOMA的 ルーム招待】\nルーム名: ${room.name}\n\nURL:\n${link}\n\n招待コード:\n${code}`;
      try { 
        await navigator.clipboard.writeText(textToCopy); 
        alert("共有リンクとコードをコピーしました!"); 
      } catch (err) { 
        prompt("コピーに失敗しました:", textToCopy); 
      }
    };
    
    qrIconBtn.onclick = () => { 
      if (isHistoryView) {
        return alert("履歴閲覧モードでは共有できません。");
      }
      
      openModal('qrModalContent');
      const qrDisplay = modalContent.querySelector("#qrCodeDisplayModal");
      if (qrDisplay) {
        qrDisplay.innerHTML = "";
        new QRCode(qrDisplay, { 
          text: link, 
          width: 200, 
          height: 200 
        });
      }
    };
  }

  // ルームのヘッダ反映
  function setRoomHeader(room) {
    const title = document.getElementById("roomTitle");
    const subtitle = document.getElementById("roomSubtitle");
    
    if (title) title.innerText = `${room.name} のルーム`;
    
    const createdAt = room.createdAt 
      ? (typeof room.createdAt === 'object' && room.createdAt.hasOwnProperty('seconds') 
        ? new Date(room.createdAt.seconds * 1000).toLocaleString() 
        : new Date(room.createdAt).toLocaleString()) 
      : '日時不明';
    
    if (subtitle) {
      subtitle.innerText = `ルームID: ${room.id} — 作成: ${createdAt}`;
    }
  }

  // レンダリング(外部から呼ばれる)
  window.renderRoom = function(roomData, isHistorical = false) {
    currentRoom = roomData;
    isHistoryView = isHistorical;

    if (!isHistorical) {
      window.saveRoomToHistory(currentRoom);
    }

    const rc = document.getElementById("roomControls");
    if (rc) rc.style.display = "block";
    
    setRoomHeader(currentRoom);
    setupShareControls(currentRoom); 
    toggleMemberControlButtons(currentRoom);
    window.renderTeamsAndPlayers(); 
    window.updateRoomSummary(); 
    
    if (document.getElementById("createRoomBtn")) {
      document.getElementById("createRoomBtn").style.display = 'none';
    }
    if (document.getElementById("joinRoomBtn")) {
      document.getElementById("joinRoomBtn").style.display = 'none';
    }
    if (leaveBtn) leaveBtn.style.display = "block";
    
    const icons = document.getElementById("roomShareIcons");
    if (icons) icons.style.display = "flex"; 
    
    const roomHistoryEl = document.getElementById("roomHistory");
    if (roomHistoryEl) roomHistoryEl.style.display = 'none';
    
    if (!isHistorical) {
      localStorage.setItem("MATOMA_last_room_id", currentRoom.id);
      if (leaveBtn) leaveBtn.innerText = "退室";
    }
  };

  // 退室
  function leaveRoom(isForced = false) {
    if (isForced) {
      alert("ルームデータが削除されたため、強制的に退室します。");
    } else {
      if (!currentRoom) return;
      
      const confirmMsg = isHistoryView 
        ? `ルーム「${currentRoom.name}」の履歴閲覧を終了しますか?` 
        : `ルーム「${currentRoom.name}」から退室しますか?\n(データはデータベースに残ります。次回再参加可能です。)`;
      
      if (!confirm(confirmMsg)) return;
    }

    if (window.currentRoomListener) {
      window.currentRoomListener();
      window.currentRoomListener = null;
    }

    isHistoryView = false;
    currentRoom = null;
    
    localStorage.removeItem("MATOMA_last_room_id");
    
    window.closeModal();
    
    const rc = document.getElementById("roomControls");
    if (rc) rc.style.display = "none";
    
    const icons = document.getElementById("roomShareIcons");
    if (icons) icons.style.display = "none"; 
    
    toggleMemberControlButtons(null);
    
    if (document.getElementById("createRoomBtn")) {
      document.getElementById("createRoomBtn").style.display = 'block';
    }
    if (document.getElementById("joinRoomBtn")) {
      document.getElementById("joinRoomBtn").style.display = 'block';
    }
    if (leaveBtn) leaveBtn.style.display = "none";
    
    const title = document.getElementById("roomTitle");
    const subtitle = document.getElementById("roomSubtitle");
    if (title) title.innerText = "団体用スコア管理";
    if (subtitle) subtitle.innerText = "ルームを作成して共有、メンバー登録ができます。";
    
    if (teamsContainer) teamsContainer.innerHTML = "";
    window.updateRoomSummary(); 
    
    const roomHistoryEl = document.getElementById("roomHistory");
    if (roomHistoryEl) roomHistoryEl.style.display = 'block';
    
    window.renderRoomHistory(); 
    
    if (!isForced) {
      alert("ルームから退室しました。");
    }
  }

  // 最初に履歴を表示
  window.renderRoomHistory();
});