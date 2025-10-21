window.exportPlayerScoresToPDF = async function() {
  const room = window.currentRoom;
  if (!room || !room.players) {
    alert("スコアデータがありません。");
    return;
  }

  // ---------- ArrayBuffer → Base64 ----------
  function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    let binary = "";
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  }

  // ---------- 日本語フォント埋め込み ----------
  async function embedNotoSansJP(doc) {
    const candidates = ["NotoSansJPRegular", "NotoSansJP_Regular_Base64", "NotoSansJPBase64", "NotoSansJP"];
    for (const name of candidates) {
      if (window[name] && typeof window[name] === "string" && window[name].length > 200) {
        try {
          const pure = window[name].replace(/^data:.*;base64,/, "");
          doc.addFileToVFS("NotoSansJP-Regular.ttf", pure);
          doc.addFont("NotoSansJP-Regular.ttf", "NotoSansJP", "normal");
          doc.setFont("NotoSansJP", "normal");
          console.log("✅ フォントを埋め込み変数から読み込み成功:", name);
          return true;
        } catch (e) {
          console.warn("⚠️ フォント埋め込み失敗 (Base64):", e);
        }
      }
    }

    // ローカルフォント読み込み
    const localPaths = [
      "/fonts/NotoSansJP-Regular.ttf",
      "fonts/NotoSansJP-Regular.ttf",
      "/assets/fonts/NotoSansJP-Regular.ttf"
    ];
    for (const p of localPaths) {
      try {
        const res = await fetch(p);
        if (!res.ok) continue;
        const buf = await res.arrayBuffer();
        const b64 = arrayBufferToBase64(buf);
        doc.addFileToVFS("NotoSansJP-Regular.ttf", b64);
        doc.addFont("NotoSansJP-Regular.ttf", "NotoSansJP", "normal");
        doc.setFont("NotoSansJP", "normal");
        console.log("✅ フォントをローカルから読み込み成功:", p);
        return true;
      } catch (e) {
        console.warn("⚠️ フォント読み込みエラー:", p, e);
      }
    }

    // フォント見つからなければデフォルト英字
    console.warn("⚠️ NotoSansJP が見つかりません。helvetica に切り替えます。");
    doc.setFont("helvetica", "normal");
    return false;
  }

  // ---------- PDF 初期化 ----------
  const { jsPDF } = window.jspdf;
  if (!jsPDF) {
    alert("jsPDF が読み込まれていません。");
    return;
  }

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  const fontLoaded = await embedNotoSansJP(doc);
  const availableFonts = doc.getFontList ? Object.keys(doc.getFontList()) : [];
  const activeFont = fontLoaded && availableFonts.includes("NotoSansJP") ? "NotoSansJP" : "helvetica";

  // ---------- データ構築（Excel構成） ----------
  const teams = Array.isArray(room.teams) ? room.teams : Object.values(room.teams || {});
  const playersOrder = room.playersOrder || Object.keys(room.players);
  const players = room.players;

  const allTables = [];

  for (const team of teams) {
    const members = playersOrder
      .map(id => players[id])
      .filter(p => p && p.teamId === team.id && p.role !== "manager");

    if (members.length === 0) continue;

    const headers = ["チーム名", "選手名", "一射目", "二射目", "三射目", "四射目", "合計"];
    const rows = [];

    members.forEach(p => {
      const scores = Array.isArray(p.scores)
        ? p.scores
        : (p.scores ? Object.values(p.scores) : []);
      const total = scores.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
      const shotCells = [0, 1, 2, 3].map(i => (scores[i] ?? ""));
      rows.push([team.name, p.name, ...shotCells, total]);
    });

    const teamTotal = members.reduce(
      (sum, p) => sum + (Array.isArray(p.scores)
        ? p.scores.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0)
        : 0), 0
    );
    rows.push(["", `${team.name} 合計`, "", "", "", "", teamTotal]);

    allTables.push({ teamName: team.name, headers, rows });
  }

  // ---------- PDF 出力（autoTable） ----------
  try {
    doc.setFont(activeFont, "normal");
  } catch {
    doc.setFont("helvetica", "normal");
  }

  doc.setFontSize(14);
  doc.text(room.name || "チームスコア表", 10, 10);

  let currentY = 20;
  for (const table of allTables) {
    try {
      doc.autoTable({
        startY: currentY,
        head: [table.headers],
        body: table.rows,
        styles: {
          font: activeFont,
          fontStyle: "normal",
          fontSize: 9,
          cellPadding: 2,
          lineWidth: 0.1,
          lineColor: [0, 0, 0],
        },
        headStyles: {
          fillColor: [230, 230, 230],
          textColor: [0, 0, 0],
          fontStyle: "bold",
        },
        margin: { left: 10, right: 10 },
        tableLineWidth: 0.5,
        tableLineColor: [0, 0, 0],
      });

      const last = doc.lastAutoTable;
      currentY = last?.finalY ? last.finalY + 10 : currentY + 60;
      if (currentY > 180) {
        doc.addPage();
        currentY = 20;
      }
    } catch (e) {
      console.warn("autoTable出力時エラー:", e);
    }
  }

  // ---------- 保存 ----------
  try {
    doc.save(`${room.name || "team_scores"}.pdf`);
    alert("✅ Excel構成でPDF出力が完了しました（エラーなし）");
  } catch (e) {
    console.error("PDF save error:", e);
    alert("⚠️ PDF保存時に問題が発生しました。");
  } 
};
