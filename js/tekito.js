
window.addEventListener("DOMContentLoaded", () => {
  // URLハッシュからroomIdを自動検出
  const hash = location.hash;
  if (hash && hash.startsWith("#room=")) {
    const roomId = hash.replace("#room=", "").trim();
    if (roomId) {
      console.log("📡 ルーム自動参加:", roomId);
      window.joinTeamMatch(roomId).catch(err => {
        alert("ルームへの参加に失敗しました: " + err.message);
      });
    }
  }
});
