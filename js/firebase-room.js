/**
 * firebase-room.js (統合版)
 * Firestore と匿名Authを利用した団体戦ルーム管理モジュール
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { 
  getFirestore, doc, setDoc, getDoc, updateDoc, onSnapshot, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import { 
  getAuth, signInAnonymously, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

// =======================================================
// Firebase 初期化
// =======================================================
const firebaseConfig = {
  apiKey: "AIzaSyBvDnppOLkPeBi8QLmzNclOWu-m9ODwZ1Q",
  authDomain: "matoma2-b9292.firebaseapp.com",
  projectId: "matoma2-b9292",
  storageBucket: "matoma2-b9292.appspot.com",
  messagingSenderId: "202661993563",
  appId: "1:202661993563:web:0b22ab2f0c5211aaef337e",
  measurementId: "G-FN8BHPK3GS"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// =======================================================
// 匿名ログイン
// =======================================================
onAuthStateChanged(auth, (user) => {
  if (!user) {
    signInAnonymously(auth)
      .then(() => console.log("✅ 匿名ログイン完了"))
      .catch((e) => console.error("❌ 匿名ログイン失敗:", e));
  } else {
    console.log("👤 ログイン中ユーザー:", user.uid);
  }
});

// =======================================================
// ルーム作成
// =======================================================
window.doCreateRoom = async function(roomName) {
  const user = auth.currentUser;
  if (!user) { 
    alert("認証が完了していません"); 
    return null; 
  }
  if (!roomName.trim()) { 
    alert("ルーム名を入力してください"); 
    return null; 
  }

  const roomId = ("RM" + Math.random().toString(36).slice(2, 8)).toUpperCase();
  const roomData = {
    id: roomId,
    name: roomName.trim(),
    createdAt: serverTimestamp(),
    owner: user.uid,
    players: {},
    playersOrder: [],
    members: {},
    teams: [{ id: "T1", name: "チーム 1" }],
    settings: { teamSize: 3, arrowCount: 4 },
  };

  try {
    await setDoc(doc(db, "rooms", roomId), roomData);
    console.log("✅ ルーム作成:", roomId);
    window.currentRoom = roomData;
    
    if (window.renderRoom) window.renderRoom(roomData);
    window.startScoreSynchronization(roomId);
    
    return { roomId, inviteCode: `MATOMA_JOIN:${roomId}` };
  } catch (err) {
    console.error("❌ ルーム作成エラー:", err);
    alert("ルーム作成に失敗しました");
    return null;
  }
};

// =======================================================
// ルーム参加
// =======================================================
window.joinTeamMatch = async function(roomId) {
  try {
    const ref = doc(db, "rooms", roomId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      console.warn("joinTeamMatch: room not found:", roomId);
      alert("ルームが見つかりません。");
      return null;
    }

    const data = snap.data();
    window.currentRoom = data;
    
    if (window.renderRoom) window.renderRoom(data);
    window.startScoreSynchronization(roomId);

    console.log("🏹 入室成功:", roomId);
    return roomId;
  } catch (err) {
    console.error("❌ ルーム入室エラー (joinTeamMatch):", err);
    return null;
  }
};

// =======================================================
// Firestoreリアルタイム同期
// =======================================================
window.startScoreSynchronization = function(roomId) {
  if (window.currentRoomListener) window.currentRoomListener();

  const ref = doc(db, "rooms", roomId);
  const unsub = onSnapshot(ref, (snap) => {
    if (!snap.exists()) return;

    const data = snap.data();
    window.currentRoom = data;

    if (window.renderRoom) {
      setTimeout(() => {
        window.renderRoom(data);
        console.log("🔄 Firestoreリアルタイム更新後の遅延再描画");
      }, 0);
    }
    console.log("🔄 Firestoreリアルタイム更新:", roomId);

  }, (err) => {
    console.error("❌ Firestore同期エラー:", err);
  });

  window.currentRoomListener = unsub;
};

// =======================================================
// プレイヤー名更新
// =======================================================
window.updatePlayerName = async function(roomId, playerId, newName) {
  if (!newName || newName.trim() === "") {
    console.warn("プレイヤー名が無効です");
    return;
  }
  const nameToUpdate = newName.trim();
  try {
    const ref = doc(db, "rooms", roomId);
    await updateDoc(ref, {
      [`players.${playerId}.name`]: nameToUpdate
    });
    console.log(`✅ プレイヤー名更新: ${playerId} → ${nameToUpdate}`);
  } catch (e) {
    console.error("❌ プレイヤー名更新エラー:", e);
  }
};

// =======================================================
// スコア更新
// =======================================================
window.updatePlayerTurnScore = async function(roomId, playerId, arrowIndex, newScore) {
  try {
    const ref = doc(db, "rooms", roomId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const room = snap.data();
    if (!room.players || !room.players[playerId]) return;
    
    if (!Array.isArray(room.players[playerId].scores)) {
      const arrowCount = room.settings?.arrowCount || 4;
      room.players[playerId].scores = Array(arrowCount).fill(null); 
    }
    
    room.players[playerId].scores[arrowIndex] = newScore;
    
    await updateDoc(ref, {
      [`players.${playerId}.scores`]: room.players[playerId].scores
    });
    console.log(`🎯 スコア更新: ${playerId} の ${arrowIndex} 番目 → ${newScore}`);
    
    window.currentRoom = room;
    if (window.renderRoom) {
      setTimeout(() => {
        window.renderRoom(window.currentRoom);
        console.log("📄 スコア入力後の遅延再描画");
      }, 0); 
    }

  } catch (e) {
    console.error("❌ スコア更新エラー:", e);
  }
};

// =======================================================
// チーム追加
// =======================================================
window.addTeamToRoom = async function(roomId, teamName) {
  if (!roomId) throw new Error("roomId が必要です");
  if (!teamName || !teamName.trim()) throw new Error("チーム名を入力してください");

  try {
    const ref = doc(db, "rooms", roomId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      console.warn("addTeamToRoom: room not found", roomId);
      return null;
    }

    const room = snap.data() || {};
    let teamsArray = Array.isArray(room.teams) 
      ? room.teams.slice() 
      : (Array.isArray(Object.values(room.teams || {})) 
        ? Object.values(room.teams) 
        : []);

    const existingIds = new Set(teamsArray.map(t => t.id));
    let base = 1;
    let newId;
    do {
      newId = "T" + (base++);
    } while (existingIds.has(newId));

    const newTeam = { id: newId, name: teamName.trim(), createdAt: Date.now() };
    teamsArray.push(newTeam);

    await updateDoc(ref, { teams: teamsArray });

    console.log("addTeamToRoom: added", newTeam);
    return newId;
  } catch (err) {
    console.error("addTeamToRoom error:", err);
    throw err;
  }
};

// =======================================================
// プレイヤー登録
// =======================================================
window.addPlayerToRoom = async function(roomId, name, role = "player") { 
  const ref = doc(db, "rooms", roomId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const room = snap.data();

  room.players = room.players || {};
  room.members = room.members || {};
  room.playersOrder = room.playersOrder || [];
  
  let teams = [];
  if (Array.isArray(room.teams)) {
    teams = room.teams;
  } else if (typeof room.teams === "object") {
    teams = Object.values(room.teams);
  }
  
  const teamSize = room.settings?.teamSize || 3;
  const newId = "P" + Date.now().toString(36);

  // 監督者の場合
  if (role === "manager") {
    room.players[newId] = {
      id: newId,
      name,
      role,
      teamId: "manager",
      scores: Array(room.settings?.arrowCount || 4).fill(null),
    };
    room.members[newId] = { role };
    room.playersOrder.push(newId);
    await updateDoc(ref, { 
      players: room.players, 
      members: room.members, 
      playersOrder: room.playersOrder 
    });
    console.log(`✅ manager を登録: ${name} (${newId})`);
    return newId;
  }

  // チームごとの人数カウント
  const teamCounts = {};
  Object.values(room.players).forEach(p => {
    if (!p.teamId) return;
    teamCounts[p.teamId] = (teamCounts[p.teamId] || 0) + 1;
  });

  // 空きのあるチームを探す
  let targetTeam = null;
  for (const t of teams) {
    if (!t.id) continue;
    const count = teamCounts[t.id] || 0;
    if (count < teamSize) {
      targetTeam = t;
      break;
    }
  }

  // 空きがなければ新チームを作る
  if (!targetTeam) {
    const newTeamName = `チーム ${teams.length + 1}`;
    let newTeamId;
    if (window.addTeamToRoom) {
      newTeamId = await window.addTeamToRoom(roomId, newTeamName);
      const updatedSnap = await getDoc(ref);
      const updatedRoom = updatedSnap.exists() ? updatedSnap.data() : room;
      teams = Array.isArray(updatedRoom.teams) 
        ? updatedRoom.teams 
        : Object.values(updatedRoom.teams || {});
      targetTeam = teams.find(t => t.id === newTeamId) || { id: newTeamId, name: newTeamName };
    } else {
      newTeamId = "T" + (teams.length + 1);
      const newTeam = { id: newTeamId, name: newTeamName, createdAt: Date.now() };
      teams.push(newTeam);
      await updateDoc(ref, { teams });
      targetTeam = newTeam;
    }
  }

  // プレイヤーオブジェクトを作成して保存
  room.players[newId] = {
    id: newId,
    name,
    role,
    scores: Array(room.settings?.arrowCount || 4).fill(null),
    teamId: targetTeam.id,
  };
  room.members[newId] = { role };
  room.playersOrder.push(newId);

  await updateDoc(ref, { 
    players: room.players,
    members: room.members,
    teams,
    playersOrder: room.playersOrder
  });

  console.log(`✅ ${name} を ${targetTeam.name} に登録 (${targetTeam.id}) => ${newId}`);
  return newId;
};

// =======================================================
// チーム名変更(renameTeam)
// =======================================================
window.renameTeam = async function(roomId, teamId, newName) {
  if (!roomId || !teamId) {
    alert("roomId と teamId が必要です");
    return;
  }
  if (!newName || !newName.trim()) {
    alert("チーム名を入力してください");
    return;
  }

  try {
    const ref = doc(db, "rooms", roomId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      alert("ルームが見つかりませんでした");
      return;
    }
    const room = snap.data();

    if (Array.isArray(room.teams)) {
      const idx = room.teams.findIndex(t => t.id === teamId);
      if (idx === -1) { 
        alert("チームが見つかりません"); 
        return; 
      }
      room.teams[idx].name = newName.trim();
      await updateDoc(ref, { teams: room.teams });
    } else if (room.teams && typeof room.teams === "object") {
      const teamsObj = { ...room.teams };
      if (!teamsObj[teamId]) { 
        alert("チームが見つかりません"); 
        return; 
      }
      teamsObj[teamId] = { ...teamsObj[teamId], name: newName.trim() };
      await updateDoc(ref, { teams: teamsObj });
    } else {
      alert("チームデータが不正です");
      return;
    }

    // 更新後、最新スナップショットを取得してUI再描画
    const updatedSnap = await getDoc(ref);
    if (updatedSnap.exists()) {
      window.currentRoom = updatedSnap.data();
      if (window.renderTeamsAndPlayers) window.renderTeamsAndPlayers();
    }
    console.log(`✅ renameTeam: ${teamId} → ${newName.trim()}`);
  } catch (err) {
    console.error("renameTeam error:", err);
    alert("チーム名の変更に失敗しました");
  }
};

// =======================================================
// チーム複製
// =======================================================
window.cloneTeam = async function(roomId, sourceTeamId, newTeamName) {
  if (!roomId || !sourceTeamId || !newTeamName.trim()) {
    alert("ルームID、元チームID、新しいチーム名が必要です。");
    return;
  }

  try {
    const ref = doc(db, "rooms", roomId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      alert("ルームが見つかりませんでした。");
      return;
    }
    const room = snap.data();
    
    let teamsArray = Array.isArray(room.teams) 
      ? room.teams.slice() 
      : Object.values(room.teams || {});
    
    const sourceTeam = teamsArray.find(t => t.id === sourceTeamId);
    if (!sourceTeam) {
      alert("元のチームが見つかりませんでした。");
      return;
    }

    const sourcePlayers = Object.values(room.players || {})
      .filter(p => p.teamId === sourceTeamId && p.role !== "manager");
    
    if (sourcePlayers.length === 0) {
      alert("元のチームにプレーヤーがいません。");
      return;
    }

    // 1. 新しいチームを作成
    const existingIds = new Set(teamsArray.map(t => t.id));
    let base = 1;
    let newTeamId;
    do {
      newTeamId = "T" + (base++);
    } while (existingIds.has(newTeamId));

    const newTeam = { 
      id: newTeamId, 
      name: newTeamName.trim(), 
      createdAt: Date.now() 
    };
    teamsArray.push(newTeam);

    // 2. プレイヤーを複製し、新しいチームIDを割り当てる
    room.players = room.players || {};
    room.playersOrder = room.playersOrder || [];
    const newPlayerIds = [];

    for (const player of sourcePlayers) {
      const newPlayerId = "P" + Date.now().toString(36) + Math.random().toString(36).slice(2, 4);
      newPlayerIds.push(newPlayerId);

      // スコアを除いたプロパティをコピー
      const newPlayer = {
        ...player,
        id: newPlayerId,
        teamId: newTeamId,
        scores: Array(room.settings?.arrowCount || 4).fill(null),
      };
      room.players[newPlayerId] = newPlayer;
      room.playersOrder.push(newPlayerId);
    }

    // 3. Firestoreを更新
    await updateDoc(ref, { 
      teams: teamsArray, 
      players: room.players,
      playersOrder: room.playersOrder
    });

    alert(`✅ チーム「${sourceTeam.name}」を「${newTeam.name}」として複製しました。`);
    console.log(`✅ Team cloned: ${sourceTeamId} -> ${newTeamId}`);

  } catch (err) {
    console.error("❌ cloneTeam error:", err);
    alert("チームの複製に失敗しました。");
  }
};

// =======================================================
// Excel出力(同構成横並び・最後作成チーム下)
// =======================================================
window.exportPlayerScoresToXLSX = async function() {
  const room = window.currentRoom;
  if (!room || !room.players) {
    alert("スコアデータがありません。");
    return;
  }

  const teams = Array.isArray(room.teams) 
    ? room.teams 
    : Object.values(room.teams || {});
  
  const wsData = [];
  const baseHeader = ["チーム名", "選手名", "一射目", "二射目", "三射目", "四射目", "合計"];
  const borderThin = { style: "thin", color: { rgb: "000000" } };
  const borderThick = { style: "medium", color: { rgb: "000000" } };
  const playersOrder = room.playersOrder || Object.keys(room.players);

  // チーム構成を特定するキー
  const getTeamKey = (teamPlayers) =>
    teamPlayers
      .filter(p => p.role !== "manager")
      .map(p => p.name)
      .sort()
      .join(",");

  // 同構成チームをグループ化(追加順を維持)
  const teamGroups = {};
  for (const team of teams) {
    const teamPlayers = playersOrder
      .map(id => room.players[id])
      .filter(p => p && p.teamId === team.id && p.role !== "manager");
    
    if (!teamPlayers.length) continue;

    const key = getTeamKey(teamPlayers);
    if (!teamGroups[key]) teamGroups[key] = [];
    teamGroups[key].push({ team, teamPlayers });
  }

  // グループごとに出力(最後作成チーム下)
  for (const key of Object.keys(teamGroups)) {
    const group = teamGroups[key];

    // ヘッダ(横並び)
    const headerRow = [];
    group.forEach(() => headerRow.push(...baseHeader));
    wsData.push(headerRow);

    // 選手名の集合(グループ内で共通)
    const memberNames = Array.from(
      new Set(group.flatMap(g => g.teamPlayers.map(p => p.name)))
    );

    // 各選手の行
    memberNames.forEach(member => {
      const row = [];
      group.forEach(({ team, teamPlayers }) => {
        const player = teamPlayers.find(p => p.name === member);
        const scores = player?.scores || [];
        const total = scores.reduce((a,b) => a+(b||0),0);
        row.push(team.name, member, ...scores.map(s=>s??""), total);
      });
      wsData.push(row);
    });

    // チーム合計行
    const totalRow = [];
    group.forEach(({ team, teamPlayers }) => {
      const teamTotal = teamPlayers.reduce(
        (sum,p) => sum + (p.scores||[]).reduce((a,b) => a+(b||0),0), 
        0
      );
      totalRow.push("", `${team.name} 合計`, "", "", "", "", teamTotal);
    });
    wsData.push(totalRow);

    // チーム間に空行
    wsData.push([]);
  }

  // シート作成
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Scores");

  // 枠線設定
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const cell = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cell]) ws[cell] = { v: "" };
      ws[cell].s = ws[cell].s || {};
      ws[cell].s.border = { 
        top: borderThin, 
        bottom: borderThin, 
        left: borderThin, 
        right: borderThin 
      };
    }
  }
  
  // 外枠を太線
  for (let C = range.s.c; C <= range.e.c; C++) {
    ws[XLSX.utils.encode_cell({ r: range.s.r, c: C })].s.border.top = borderThick;
    ws[XLSX.utils.encode_cell({ r: range.e.r, c: C })].s.border.bottom = borderThick;
  }
  for (let R = range.s.r; R <= range.e.r; R++) {
    ws[XLSX.utils.encode_cell({ r: R, c: range.s.c })].s.border.left = borderThick;
    ws[XLSX.utils.encode_cell({ r: R, c: range.e.c })].s.border.right = borderThick;
  }

  XLSX.writeFile(wb, `${room.name || "team_scores"}.xlsx`);
  alert("✅ 同構成横並びでPDFと同じ順序で出力しました(XLSX)");
};

// =======================================================
// PDF出力(同構成横並び・最後作成チーム下)
// =======================================================
window.exportPlayerScoresToPDF = async function() {
  const room = window.currentRoom;
  if (!room || !room.players) {
    alert("スコアデータがありません。");
    return;
  }

  const teams = Array.isArray(room.teams) 
    ? room.teams 
    : Object.values(room.teams || {});
  
  const playersOrder = (room.playersOrder || Object.keys(room.players))
    .filter(id => room.players[id]);
  
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  try {
    const fontUrl = "./fonts/NotoSansJP-Regular.ttf";
    const fontData = await fetch(fontUrl).then(r => r.arrayBuffer());
    
    function arrayBufferToBase64(buffer) {
      let binary = '';
      const bytes = new Uint8Array(buffer);
      const chunkSize = 0x8000;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, chunk);
      }
      return btoa(binary);
    }
    
    const fontBase64 = arrayBufferToBase64(fontData);
    doc.addFileToVFS("NotoSansJP-Regular.ttf", fontBase64);
    doc.addFont("NotoSansJP-Regular.ttf", "NotoSansJP", "normal");
    doc.setFont("NotoSansJP");
  } catch (e) {
    console.error("❌ フォント読み込み失敗:", e);
    alert("フォントの読み込みに失敗しました。PDF出力できません。");
    return;
  }

  let yOffset = 10;
  const baseHeader = ["チーム名", "選手名", "一射目", "二射目", "三射目", "四射目", "合計"];
  const getTeamKey = teamPlayers => 
    teamPlayers
      .filter(p => p.role !== "manager")
      .map(p => p.name)
      .sort()
      .join(",");

  // 同構成チームをグループ化
  const teamGroups = {};
  for (const team of teams) {
    const teamPlayers = playersOrder
      .map(id => room.players[id])
      .filter(p => p && p.teamId === team.id && p.role !== "manager");
    
    if (!teamPlayers.length) continue;
    
    const key = getTeamKey(teamPlayers);
    if (!teamGroups[key]) teamGroups[key] = [];
    teamGroups[key].push({ team, teamPlayers });
  }

  for (const key of Object.keys(teamGroups)) {
    const group = teamGroups[key];
    const headerRow = [];
    group.forEach(() => headerRow.push(...baseHeader));

    const tableData = [];
    const memberNames = Array.from(
      new Set(group.flatMap(g => g.teamPlayers.map(p => p.name)))
    );

    memberNames.forEach(member => {
      const row = [];
      group.forEach(({ team, teamPlayers }) => {
        const player = teamPlayers.find(p => p.name === member);
        const scores = player?.scores || [];
        const total = scores.reduce((a,b) => a+(b||0),0);
        row.push(team.name, member, ...scores.map(s => s??""), total);
      });
      tableData.push(row);
    });

    const totalRow = [];
    group.forEach(({ team, teamPlayers }) => {
      const teamTotal = teamPlayers.reduce(
        (sum,p) => sum + (p.scores||[]).reduce((a,b) => a+(b||0),0), 
        0
      );
      totalRow.push("", `${team.name} 合計`, "", "", "", "", teamTotal);
    });
    tableData.push(totalRow);

    doc.autoTable({
      startY: yOffset,
      head: [headerRow],
      body: tableData,
      theme: 'grid',
      styles: { font: "NotoSansJP", fontSize: 10 },
      headStyles: { fillColor: [220,220,220] }
    });

    yOffset = doc.lastAutoTable.finalY + 10;
  }

  doc.save(`${room.name || "team_scores"}.pdf`);
  alert("✅ 同構成横並びでPDFと同じ順序で出力しました(PDF)");
};
