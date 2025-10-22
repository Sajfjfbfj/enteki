/* matchSet.js -- Pixelなどでもスクロール可能対応済み + 道具保存対応（完全版） */
document.addEventListener("DOMContentLoaded", () => {
  const addSetBtn = document.getElementById("addSetBtnTab")
  const setsContainer = document.getElementById("setsContainer")
  const matchDate = document.getElementById("matchDate")
  const summaryContainer = document.getElementById("dailySummary")

  let setCount = 0
  let currentDate = new Date().toISOString().split("T")[0]
  matchDate.value = currentDate

  /* ---------- summary ---------- */
  function loadSummary() {
    const storedData = JSON.parse(localStorage.getItem("kyudoSetsByDate") || "{}")
    summaryContainer.innerHTML = ""

    const currentMonth = new Date().getMonth() + 1
    const currentYear = new Date().getFullYear()

    const dates = Object.keys(storedData).sort().reverse()
    const filteredDates = dates.filter((date) => {
      const [year, month] = date.split("-").map(Number)
      return year === currentYear && month === currentMonth
    })

    if (filteredDates.length === 0) {
      summaryContainer.textContent = `${currentMonth}月の記録はありません`
      return
    }

    const grouped = {}
    filteredDates.forEach((date) => {
      const [year, month] = date.split("-").slice(0, 2)
      const key = `${year}年${month}月`
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(date)
    })

    Object.keys(grouped).forEach((monthKey) => {
      const monthDiv = document.createElement("div")
      const title = document.createElement("h3")
      title.textContent = monthKey
      monthDiv.appendChild(title)

      const ul = document.createElement("ul")
      ul.className = "space-y-1"
      grouped[monthKey].forEach((date) => {
        const sets = storedData[date] || []
        const tachisu = sets.length
        let total = 0
        sets.forEach((set) =>
          set.markers.forEach((m) => {
            total += m.score
          }),
        )
        const li = document.createElement("li")
        li.textContent = `${date}　立ち ${tachisu}　合計 ${total}点`
        li.style.cursor = "pointer"
        li.className = "px-2 py-1 rounded hover:bg-primary/20 dark:hover:bg-primary/30"
        li.addEventListener("click", () => setCurrentDate(date))
        ul.appendChild(li)
      })
      monthDiv.appendChild(ul)
      summaryContainer.appendChild(monthDiv)
    })
  }

  /* ---------- tools ---------- */
  function loadTools() {
    const data = localStorage.getItem("kyudoTools")
    return data ? JSON.parse(data) : { 弽: [], 弓: [], 矢: [], 弦: [] }
  }

  /* ---------- persistence & helpers ---------- */
  function loadSetsForDate(date) {
    const storedData = JSON.parse(localStorage.getItem("kyudoSetsByDate") || "{}")
    const setsData = storedData[date] || []
    setsContainer.innerHTML = ""
    setCount = 0
    setsData.forEach((set) => window.addSet(set)) // 変更点: グローバルに公開した window.addSet を使用
    loadSummary()
  }

  function saveSetsForDate(date, setsData) {
    const storedData = JSON.parse(localStorage.getItem("kyudoSetsByDate") || "{}")
    storedData[date] = setsData
    localStorage.setItem("kyudoSetsByDate", JSON.stringify(storedData))
    loadSummary()
  }

  function getAllSetsData() {
    const setsData = []
    setsContainer.querySelectorAll(".set-wrapper").forEach((setWrapper) => {
      // マーカーデータを取得
      const canvas = setWrapper.querySelector("canvas")
      const markers = canvas && canvas.markers ? canvas.markers.map((m) => ({ ...m })) : []

      // 道具選択も保存（data-category をキーに）
      const toolSelections = {}
      setWrapper.querySelectorAll(".tool-select").forEach((select) => {
        const category = select.dataset.category
        toolSelections[category] = select.value
      })

      setsData.push({ markers, tools: toolSelections })
    })
    return setsData
  }

  function setCurrentDate(newDate) {
    // 現在の日付のデータを保存してから切り替え
    saveSetsForDate(currentDate, getAllSetsData())
    currentDate = newDate
    matchDate.value = currentDate
    loadSetsForDate(currentDate)
  }

  matchDate.addEventListener("change", () => setCurrentDate(matchDate.value))

  // 【削除】中央ボタンへのイベントリスナーは index.html 側で一元管理するため、この無条件な登録を削除します。
  // if (addSetBtn) {
  //   addSetBtn.addEventListener("click", () => {
  //     addNewSet()
  //     saveSetsForDate(currentDate, getAllSetsData())
  //   })
  // }

  /* ---------- add set UI ---------- */
  // 変更点: addNewSet を window.addSet としてグローバルに公開し、index.html のスクリプトブロックから呼び出せるようにします。
  window.addSet = function(existingSet = null) {
    const setIndex = setCount++
    const setWrapper = document.createElement("div")
    setWrapper.className = "set-wrapper p-4 bg-white dark:bg-slate-900 rounded-xl shadow-lg space-y-2"
    setWrapper.dataset.index = setIndex

    const titleDiv = document.createElement("div")
    titleDiv.className = "flex justify-between items-center"
    const title = document.createElement("h2")
    title.textContent = `立ち ${setIndex + 1}`
    title.className = "font-bold text-lg"
    titleDiv.appendChild(title)

    const buttonGroup = document.createElement("div")
    buttonGroup.className = "flex gap-2"

    const resetBtn = document.createElement("button")
    resetBtn.textContent = "リセット"
    resetBtn.className = "px-3 py-1 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700"
    resetBtn.addEventListener("click", () => {
      const canvas = setWrapper.querySelector("canvas")
      // canvas.markers は initializeCanvas で設定される
      if (canvas && canvas.markers) {
        canvas.markers.length = 0
        // drawCanvas 関数は下で定義されている
        drawCanvas(canvas, canvas.img, canvas.markers, canvas.scale, canvas.offsetX, canvas.offsetY)
        saveSetsForDate(currentDate, getAllSetsData())
      }
    })
    buttonGroup.appendChild(resetBtn)

    const delSetBtn = document.createElement("button")
    delSetBtn.textContent = "削除"
    delSetBtn.className = "px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
    delSetBtn.addEventListener("click", () => {
      setWrapper.remove()
      // setCount の調整は不要（削除によって index が変わるが、保存データは影響を受けないため）
      saveSetsForDate(currentDate, getAllSetsData())
    })
    buttonGroup.appendChild(delSetBtn)

    titleDiv.appendChild(buttonGroup)
    setWrapper.appendChild(titleDiv)

    // tools area
    const toolSection = document.createElement("div")
    toolSection.className = "tools space-y-1"
    const tools = loadTools()
    Object.keys(tools).forEach((category) => {
      const label = document.createElement("label")
      label.textContent = category + ": "
      label.className = "tool-label block"

      const select = document.createElement("select")
      select.className = "tool-select rounded border px-2 py-1 w-full dark:bg-slate-700 dark:text-white"
      select.dataset.category = category // ← ここでカテゴリを data 属性として保持

      const emptyOpt = document.createElement("option")
      emptyOpt.value = ""
      emptyOpt.textContent = "選択してください"
      select.appendChild(emptyOpt)

      tools[category].forEach((item) => {
        const opt = document.createElement("option")
        opt.value = item.name
        opt.textContent = `${item.name}${item.feature ? " (" + item.feature + ")" : ""}`
        select.appendChild(opt)
      })

      // 既存データがあれば復元（data-category をキーに）
      if (existingSet && existingSet.tools && existingSet.tools[category]) {
        select.value = existingSet.tools[category]
      }

      // 変更したら保存
      select.addEventListener("change", () => {
        saveSetsForDate(currentDate, getAllSetsData())
      })

      label.appendChild(select)
      toolSection.appendChild(label)
    })
    setWrapper.appendChild(toolSection)

    // canvas
    const canvasContainer = document.createElement("div")
    canvasContainer.className = "canvas-container"
    const canvas = document.createElement("canvas")
    canvas.id = `targetCanvas_${setIndex}`
    canvas.style.touchAction = "auto" // ← スクロール可能に
    canvasContainer.appendChild(canvas)
    setWrapper.appendChild(canvasContainer)

    // scoreboard
    const scoreBoard = document.createElement("div")
    scoreBoard.className = "score-board space-y-1"
    const ul = document.createElement("ul")
    ul.id = `scoreList_${setIndex}`
    ul.className = "score-list space-y-1"
    scoreBoard.appendChild(ul)
    const totalP = document.createElement("p")
    totalP.innerHTML = `合計: <span id="totalScore_${setIndex}">0</span>`
    scoreBoard.appendChild(totalP)

    setWrapper.appendChild(scoreBoard)
    setsContainer.appendChild(setWrapper)

    initializeCanvas(canvas, `#scoreList_${setIndex}`, `#totalScore_${setIndex}`, existingSet)

    setTimeout(() => {
      setWrapper.scrollIntoView({ behavior: "smooth", block: "center" })
    }, 100)

    // 追加直後に保存しておく（ページを切り替える前に状態が確実に入るよう）
    saveSetsForDate(currentDate, getAllSetsData())
  }

  /* ---------- canvas initialization ---------- */
  function initializeCanvas(canvas, scoreListSelector, totalScoreSelector, existingSet = null) {
    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    const img = new Image()
    img.src = "img/target1.png"

    canvas.img = img
    // 既存データがあればmarkersを復元し、なければ空の配列
    canvas.markers = existingSet && existingSet.markers ? existingSet.markers.map((m) => ({ ...m })) : []
    canvas.scale = 1
    canvas.offsetX = 0
    canvas.offsetY = 0

    const markerRadius = 20
    let dragIndex = null
    let startPos = null
    let moved = false

    canvas.style.touchAction = "auto"

    img.onload = () => {
      resizeCanvas()
      drawCanvas(canvas, img, canvas.markers, canvas.scale, canvas.offsetX, canvas.offsetY)
    }

    function resizeCanvas() {
      const parentW = canvas.parentElement.clientWidth || 300
      // スマホ版では正方形に近い形にする
      const parentH = parentW
      canvas.width = parentW
      canvas.height = parentH
      const scaleX = canvas.width / img.width
      const scaleY = canvas.height / img.height
      canvas.scale = Math.min(scaleX, scaleY)
      canvas.offsetX = (canvas.width - img.width * canvas.scale) / 2
      canvas.offsetY = (canvas.height - img.height * canvas.scale) / 2
      drawCanvas(canvas, img, canvas.markers, canvas.scale, canvas.offsetX, canvas.offsetY)
    }

    window.addEventListener("resize", resizeCanvas)

    function getEventPosition(e) {
      const rect = canvas.getBoundingClientRect()
      let clientX, clientY
      if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX
        clientY = e.touches[0].clientY
      } else {
        clientX = e.clientX
        clientY = e.clientY
      }
      // キャンバスの描画スケールとオフセットを考慮して、画像上の座標を返す
      const x = (clientX - rect.left - canvas.offsetX) / canvas.scale
      const y = (clientY - rect.top - canvas.offsetY) / canvas.scale
      return { x, y, pageX: clientX, pageY: clientY }
    }

    function startDrag(e) {
      startPos = getEventPosition(e)
      moved = false
      dragIndex = null
      // マーカーの上をクリックしたかチェック
      for (let i = canvas.markers.length - 1; i >= 0; i--) {
        const dx = startPos.x - canvas.markers[i].x
        const dy = startPos.y - canvas.markers[i].y
        if (dx * dx + dy * dy <= markerRadius * markerRadius) {
          dragIndex = i
          break
        }
      }
    }

    function onDrag(e) {
      if (!startPos) return
      const pos = getEventPosition(e)
      const dx = pos.x - startPos.x
      const dy = pos.y - startPos.y
      // 5px以上移動したらドラッグと判定
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) moved = true
      
      if (dragIndex !== null) {
        // マーカーをドラッグ中
        if (e.type && e.type.startsWith("touch")) e.preventDefault() // ドラッグ中のみスクロール停止
        canvas.markers[dragIndex].x = pos.x
        canvas.markers[dragIndex].y = pos.y
        drawCanvas(canvas, img, canvas.markers, canvas.scale, canvas.offsetX, canvas.offsetY)
      }
    }

    function endDrag(e) {
      // e が null の場合（mouseleave で発生しうる）も考慮
      const pos = e ? getEventPosition(e) : null
      
      // 移動しておらず、かつマーカーをドラッグしていない（＝クリック/タップ）の場合にマーカーを追加
      if (!moved && dragIndex === null && startPos && pos) {
        // 既存マーカーと近すぎないかチェック
        const near = canvas.markers.some((m) => {
          const dx = m.x - pos.x,
            dy = m.y - pos.y
          return dx * dx + dy * dy < 4 // 4ピクセル未満の距離を近すぎると判定
        })
        if (!near) {
          const pixel = getImagePixelColorOnImage(canvas.img, pos.x, pos.y)
          const score = getScoreFromColor(pixel)
          canvas.markers.push({ x: pos.x, y: pos.y, score })
        }
      }
      
      dragIndex = null
      startPos = null
      moved = false // 状態をリセット
      
      // 画像範囲外のマーカーは削除（ドラッグで外に出た場合を考慮）
      canvas.markers = canvas.markers.filter((m) => m.x >= 0 && m.x <= img.width && m.y >= 0 && m.y <= img.height)
      
      drawCanvas(canvas, img, canvas.markers, canvas.scale, canvas.offsetX, canvas.offsetY)
      saveSetsForDate(currentDate, getAllSetsData())
    }

    // ⭐⭐⭐ ここが修正箇所 ⭐⭐⭐
    // mouse
    canvas.addEventListener("mousedown", startDrag)
    // document への登録を canvas への登録に変更
    canvas.addEventListener("mousemove", onDrag)
    canvas.addEventListener("mouseup", endDrag)
    canvas.addEventListener("mouseleave", endDrag) // canvas からマウスが離れた時も終了

    // touch - passive:false on move so we can preventDefault while dragging
    canvas.addEventListener("touchstart", startDrag, { passive: true })
    canvas.addEventListener("touchmove", onDrag, { passive: false })
    canvas.addEventListener("touchend", endDrag, { passive: true })
    canvas.addEventListener("touchcancel", endDrag, { passive: true })
  }

  /* ---------- draw & score ---------- */
  function drawCanvas(canvas, img, markers, scale, offsetX = 0, offsetY = 0) {
    const ctx = canvas.getContext("2d")
    const markerRadius = 20
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY)
    ctx.drawImage(img, 0, 0)

    markers.forEach((marker, index) => {
      let strokeColor
      switch (marker.score) {
        case 10:
          strokeColor = "yellow"
          break
        case 9:
          strokeColor = "red"
          break
        case 7:
          strokeColor = "blue"
          break
        case 5:
          strokeColor = "black"
          break
        case 3:
          strokeColor = "white"
          break
        default:
          strokeColor = "gray"
      }
      ctx.beginPath()
      ctx.arc(marker.x, marker.y, markerRadius, 0, Math.PI * 2)
      ctx.fillStyle = "white"
      ctx.fill()
      ctx.strokeStyle = strokeColor
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.fillStyle = "black"
      ctx.font = "bold 18px sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(index + 1, marker.x, marker.y)
    })

    ctx.restore()
    // スコアボードの更新
    updateScoreBoard(canvas, `#scoreList_${canvas.id.split("_")[1]}`, `#totalScore_${canvas.id.split("_")[1]}`, markers)
  }

function updateScoreBoard(canvas, scoreListSelector, totalScoreSelector, markers = null) {
  const list = document.querySelector(scoreListSelector);
  if (!list) return;
  markers = markers || canvas.markers;
  let total = 0;

  // 必要な行数を揃える
  while (list.children.length < markers.length) {
    const li = document.createElement("li");
    li.className = "score-item flex items-center justify-between";

    // ラベル（矢1など）→ 常に黒文字で表示
    const span = document.createElement("span");
    span.className = "arrow-label font-medium";
    span.style.color = "#1e293b"; // ← 黒固定
    li.appendChild(span);

    // セレクトボックス
    const select = document.createElement("select");
    select.className =
      "score-select rounded border px-2 py-1 text-slate-800 dark:text-slate-100 dark:bg-slate-700";
    select.style.fontSize = "18px";
    select.style.minWidth = "84px";

    // 0, 3, 5, 7, 9, 10 の順序で追加
    [0, 3, 5, 7, 9, 10].forEach((v) => {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v + "点";
      select.appendChild(opt);
    });

    select.addEventListener("change", () => {
      const idx = Array.from(list.children).indexOf(li);
      if (idx >= 0 && markers[idx]) { // markers[idx]の存在チェックを追加
        markers[idx].score = Number.parseInt(select.value);
        // スコアが変わったら再描画して、スコアボードも再更新（合計点更新のため）
        drawCanvas(canvas, canvas.img, markers, canvas.scale, canvas.offsetX, canvas.offsetY);
        // drawCanvas 内で updateScoreBoard が呼ばれるため、ここでは保存のみ
        saveSetsForDate(currentDate, getAllSetsData());
      }
    });

    li.appendChild(select);
    list.appendChild(li);
  }

  // 各行の内容更新
  markers.forEach((m, i) => {
    total += m.score || 0;
    const li = list.children[i];
    const label = li.querySelector(".arrow-label");
    label.textContent = `矢${i + 1}: `;
    label.style.color = "#1e293b"; // ← ダークでも黒固定
    // m.score が null や undefined の場合も 0 を選択
    li.querySelector("select.score-select").value = m.score ?? 0; 
  });

  // マーカーが減った分、リストの要素を削除
  while (list.children.length > markers.length) {
    list.removeChild(list.lastChild);
  }

  // 合計の表示部分
  const totalElem = document.querySelector(totalScoreSelector);
  if (totalElem) {
    // スコア数字
    totalElem.textContent = total;
    totalElem.style.color = "#1e293b"; // ← 数値も黒固定

    // 「合計:」ラベル部分を検出して黒文字固定
    const parent = totalElem.parentElement;
    if (parent) {
      // 既に span でラップされているかチェック（複数回呼ばれた場合の重複防止）
      const existingSpan = parent.querySelector(".total-label-span");
      if (existingSpan) {
        // 既存の span があれば何もしない
      } else {
        // テキストノード「合計:」を探す
        const labelNode = Array.from(parent.childNodes).find(
          (node) => node.nodeType === 3 && node.textContent.includes("合計")
        );
        if (labelNode) {
          // 「合計:」というテキストノードを <span> で包んで色指定
          const span = document.createElement("span");
          span.textContent = "合計: ";
          span.className = "total-label-span";
          span.style.color = "#1e293b"; // ← 黒固定
          parent.insertBefore(span, totalElem);
          parent.removeChild(labelNode);
        }
      }
    }
  }
}

  /* ---------- helper ---------- */
  function getImagePixelColorOnImage(img, x, y) {
    const tempCanvas = document.createElement("canvas")
    tempCanvas.width = img.width
    tempCanvas.height = img.height
    const tempCtx = tempCanvas.getContext("2d")
    tempCtx.drawImage(img, 0, 0)
    return tempCtx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data
  }

  function colorDistance([r, g, b], [tr, tg, tb]) {
    return Math.sqrt((r - tr) ** 2 + (g - tg) ** 2 + (b - tb) ** 2)
  }

  function getScoreFromColor([r, g, b, a]) {
    if (a === 0) return 0
    const targets = [
      { color: [255, 255, 0], score: 10 },
      { color: [255, 0, 0], score: 9 },
      { color: [0, 0, 255], score: 7 },
      { color: [0, 0, 0], score: 5 },
      { color: [255, 255, 255], score: 3 },
    ]
    let minDist = Number.POSITIVE_INFINITY,
      bestScore = 0
    targets.forEach((t) => {
        const d = colorDistance([r, g, b], t.color)
      if (d < minDist) {
        minDist = d
        bestScore = t.score
      }
    })
    return bestScore
  }

  /* ---------- ensure current data saved on unload (safety) ---------- */
  window.addEventListener("beforeunload", () => {
    try {
      saveSetsForDate(currentDate, getAllSetsData())
    } catch (e) {
      // ignore
    }
  })

  /* ---------- init ---------- */
  loadSetsForDate(currentDate)
})