document.addEventListener("DOMContentLoaded", () => {
  const message = document.getElementById("message");
  const editBtn = document.getElementById("editBtn");
  const editArea = document.getElementById("editArea");
  const saveToolsBtn = document.getElementById("saveToolsBtn");
  const messageOverlayEl = document.getElementById("messageOverlay");
  const messageOverlay = messageOverlayEl ? messageOverlayEl.firstElementChild : null;

  const centerBtn = document.getElementById("centerActionBtn");
  const centerIcon = document.getElementById("centerIcon");

  const item = "kyudoTools";
  const categories = ["弽", "弓", "矢", "弦"];
  let toolsData = loadTools();
  let isEditing = false;

  function loadTools() {
    const data = localStorage.getItem(item);
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        console.error("tools load parse error", e);
      }
    }
    const init = {};
    categories.forEach(cat => (init[cat] = []));
    return init;
  }

  function saveTools(data) {
    try {
      localStorage.setItem(item, JSON.stringify(data));
      showOverlay("道具を保存しました！");
      renderMessage();
      updateCenterButton();
    } catch (e) {
      console.error("保存に失敗しました", e);
      showOverlay("保存に失敗しました…");
    }
  }

  /** ======================
   *  登録内容の表示（カード風）
   ======================= */
  function renderMessage() {
    const hasData = categories.some(cat => toolsData[cat] && toolsData[cat].length > 0);
    if (!hasData) {
      if (message) message.textContent = "道具を登録しましょう";
    } else {
      let html = "";
      categories.forEach(cat => {
        const list = toolsData[cat] || [];
        if (list.length > 0) {
          html += `
            <div class="tool-card">
              <h3>${cat}</h3>
              <ul>
                ${list
                  .map(
                    t => `
                    <li>
                      <span class="tool-name">${t.name}</span>
                      <span class="tool-feature">${t.feature}</span>
                    </li>
                  `
                  )
                  .join("")}
              </ul>
            </div>
          `;
        }
      });
      if (message) message.innerHTML = html;
    }
  }

  function showOverlay(msg) {
    if (!messageOverlay) return;
    messageOverlay.textContent = msg;
    messageOverlay.classList.add("show");
    setTimeout(() => messageOverlay.classList.remove("show"), 2000);
  }

  function createInput(placeholder, value = "", isNew = false) {
    const input = document.createElement("input");
    input.placeholder = placeholder;
    input.value = value;
    input.className = "border rounded px-2 py-1 w-full dark:bg-slate-700 dark:text-white";
    if (isNew) input.dataset.new = "true";
    return input;
  }

  function createButton(text, onClick, color = "primary") {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = text;
    const colorClasses = {
      primary: "bg-blue-600 hover:bg-blue-700",
      red: "bg-red-600 hover:bg-red-700",
      gray: "bg-gray-600 hover:bg-gray-700"
    };
    btn.className = `px-2 py-1 rounded text-white ${colorClasses[color] || colorClasses.primary}`;
    btn.addEventListener("click", onClick);
    return btn;
  }

  function renderEditArea() {
    if (!editArea) return;
    editArea.innerHTML = "";

    categories.forEach(category => {
      const wrapper = document.createElement("div");
      wrapper.className = "category-wrapper space-y-2 p-4 border rounded bg-white dark:bg-slate-800";

      const title = document.createElement("h3");
      title.textContent = category;
      title.className = "font-bold text-lg";
      wrapper.appendChild(title);

      const ul = document.createElement("ul");
      (toolsData[category] || []).forEach((tool, index) => {
        const li = document.createElement("li");
        li.className = "flex gap-2 items-center mb-1";

        const nameInput = createInput("道具名", tool.name);
        const featureInput = createInput("特徴", tool.feature);
        const delBtn = createButton("削除", () => {
          toolsData[category].splice(index, 1);
          renderEditArea();
          renderMessage();
        }, "red");

        li.appendChild(nameInput);
        li.appendChild(featureInput);
        li.appendChild(delBtn);
        ul.appendChild(li);
      });
      wrapper.appendChild(ul);

      // 新規追加 input
      const newName = createInput("道具名", "", true);
      const newFeature = createInput("特徴", "", true);
      const addBtn = createButton("追加", () => {
        const name = newName.value.trim() || "名前なし";
        const feature = newFeature.value.trim() || "特徴なし";
        toolsData[category] = toolsData[category] || [];
        toolsData[category].push({ name, feature });
        renderEditArea();
        renderMessage();
      }, "primary");

      wrapper.appendChild(newName);
      wrapper.appendChild(newFeature);
      wrapper.appendChild(addBtn);

      editArea.appendChild(wrapper);
    });
  }

  function updateCenterButton() {
    if (!centerBtn) return;
    const hasMessage = message && message.textContent && message.textContent.trim().length > 0;
    if (!hasMessage && !isEditing) centerBtn.classList.add("hidden");
    else centerBtn.classList.remove("hidden");
    if (centerIcon) {
      centerIcon.textContent = isEditing ? "save" : "edit";
      centerBtn.setAttribute("aria-label", isEditing ? "保存" : "編集");
    }
  }

  function enterEditMode() {
    isEditing = true;
    if (editArea) editArea.classList.remove("hidden");
    renderEditArea();
    updateCenterButton();
    const firstInput = editArea.querySelector("input, textarea, [contenteditable='true']");
    if (firstInput) firstInput.focus();
  }

  function exitEditMode() {
    isEditing = false;
    if (editArea) editArea.classList.add("hidden");
    updateCenterButton();
  }

  function doSave() {
    // 全カテゴリの input を正確に反映
    document.querySelectorAll(".category-wrapper").forEach((wrapper, i) => {
      const category = categories[i];
      const lis = wrapper.querySelectorAll("ul li");
      const updated = [];

      lis.forEach(li => {
        const name = li.querySelector("input[placeholder='道具名']")?.value.trim() || "名前なし";
        const feature = li.querySelector("input[placeholder='特徴']")?.value.trim() || "特徴なし";
        updated.push({ name, feature });
      });

      // 新規 input も確実に取得
      const newInputs = wrapper.querySelectorAll("input[data-new='true']");
      if (newInputs.length >= 2) {
        const newName = newInputs[0].value.trim();
        const newFeature = newInputs[1].value.trim();
        if (newName || newFeature) {
          updated.push({ name: newName || "名前なし", feature: newFeature || "特徴なし" });
        }
      }

      toolsData[category] = updated;
    });

    saveTools(toolsData);
    exitEditMode();
  }

  // 中央ボタン挙動
  if (centerBtn) {
    centerBtn.addEventListener("click", e => {
      e.preventDefault();
      if (isEditing) doSave();
      else enterEditMode();
    });
  }

  // 編集ボタン
  if (editBtn) {
    editBtn.addEventListener("click", e => {
      e.preventDefault();
      enterEditMode();
    });
  }

  // 保存ボタン
  if (saveToolsBtn) {
    saveToolsBtn.addEventListener("click", e => {
      e.preventDefault();
      doSave();
    });
  }

  // message の変化を監視して中央ボタン更新
  if (message) {
    const mo = new MutationObserver(() => updateCenterButton());
    mo.observe(message, { childList: true, characterData: true, subtree: true });
  }

  // 初期表示
  renderMessage();
  updateCenterButton();
});
