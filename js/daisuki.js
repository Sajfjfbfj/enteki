
window.addNewTeam = async function(roomId) {
  if (!roomId) {
    alert("ルームが選択されていません。");
    return;
  }
  if (!window.addTeamToRoom) {
    alert("addTeamToRoom 関数が読み込まれていません。");
    return;
  }

  try {
    const teamName = prompt("新しいチーム名を入力してください", "新チーム");
    if (!teamName) return;

    const teamId = await window.addTeamToRoom(roomId, teamName);
    if (!teamId) {
      alert("チーム追加に失敗しました。");
      return;
    }

    alert(`チーム「${teamName}」を追加しました。`);
    // 再描画（Firestore があれば同期で更新されます）
    if (window.renderTeamsAndPlayers) window.renderTeamsAndPlayers();
  } catch (err) {
    console.error("addNewTeam error:", err);
    alert("チーム追加中にエラーが発生しました。");
  }
};
