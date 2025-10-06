document.addEventListener("DOMContentLoaded", () => {
  const message = document.getElementById("message");
  const editBtn = document.getElementById("editBtn");
  const editArea = document.getElementById("editArea");
  const saveToolsBtn = document.getElementById("saveToolsBtn");
  const messageOverlay = document.getElementById("messageOverlay").firstElementChild;

  const item = "kyudoTools";
  const categories = ["弽", "弓", "矢", "弦"];
  let toolsData = loadTools();

  function loadTools() {
    const data = localStorage.getItem(item);
    if (data) return JSON.parse(data);
    const init = {};
    categories.forEach(cat => (init[cat] = []));
    return init;
  }

  function saveTools(data) {
    localStorage.setItem(item, JSON.stringify(data));
    showOverlay("道具を保存しました！");
    renderMessage();
  }

  function renderMessage() {
    if (!editArea.classList.contains("hidden")) {
      message.textContent = "";
      return;
    }

    const hasData = categories.some(cat => toolsData[cat].length > 0);
    if (!hasData) {
      message.textContent = "道具を登録しましょう";
    } else {
      const items = [];
      categories.forEach(cat => {
        if (toolsData[cat].length > 0) {
          // 最新2件のみ表示
          const latestTools = toolsData[cat].slice(-2).map(t => t.name);
          items.push(`${cat}: ${latestTools.join(", ")}`);
        }
      });
      // 縦並び表示
      message.textContent = "登録済みの道具:\n" + items.join("\n");
    }
  }

  function createInput(placeholder, value = "") {
    const input = document.createElement("input");
    input.placeholder = placeholder;
    input.value = value;
    input.className = "border rounded px-2 py-1 w-full dark:bg-slate-700 dark:text-white";
    return input;
  }

  function createButton(text, onClick, color = "primary") {
    const btn = document.createElement("button");
    btn.textContent = text;
    btn.className = `px-2 py-1 rounded bg-${color}-600 text-white hover:bg-${color}-700`;
    btn.addEventListener("click", onClick);
    return btn;
  }

  function renderEditArea() {
    editArea.innerHTML = "";
    categories.forEach((category) => {
      const wrapper = document.createElement("div");
      wrapper.className = "category-wrapper space-y-2 p-4 border rounded bg-white dark:bg-slate-800";

      const title = document.createElement("h3");
      title.textContent = category;
      title.className = "font-bold text-lg";
      wrapper.appendChild(title);

      const ul = document.createElement("ul");
      toolsData[category].forEach((tool, index) => {
        const li = document.createElement("li");
        li.className = "flex gap-2 items-center mb-1";

        const nameInput = createInput("道具名", tool.name);
        const featureInput = createInput("特徴", tool.feature);
        const delBtn = createButton(
          "削除",
          () => {
            toolsData[category].splice(index, 1);
            renderEditArea();
          },
          "red"
        );

        li.appendChild(nameInput);
        li.appendChild(featureInput);
        li.appendChild(delBtn);
        ul.appendChild(li);
      });
      wrapper.appendChild(ul);

      const newName = createInput("道具名");
      const newFeature = createInput("特徴");
      const addBtn = createButton(
        "追加",
        () => {
          const name = newName.value.trim() || "名前なし";
          const feature = newFeature.value.trim() || "特徴なし";
          toolsData[category].push({ name, feature });
          renderEditArea();
        },
        "primary"
      );

      wrapper.appendChild(newName);
      wrapper.appendChild(newFeature);
      wrapper.appendChild(addBtn);

      editArea.appendChild(wrapper);
    });
  }

  function showOverlay(msg) {
    messageOverlay.textContent = msg;
    messageOverlay.classList.add("show");

    setTimeout(() => {
      messageOverlay.classList.remove("show");
    }, 2000);
  }

  editBtn.addEventListener("click", () => {
    const isHidden = editArea.classList.contains("hidden");

    if (isHidden) {
      renderEditArea();
      editArea.classList.remove("hidden");
      saveToolsBtn.classList.remove("hidden");
      message.textContent = "";
    } else {
      editArea.classList.add("hidden");
      saveToolsBtn.classList.add("hidden");
      renderMessage();
    }
  });

  saveToolsBtn.addEventListener("click", () => {
    document.querySelectorAll(".category-wrapper").forEach((wrapper, i) => {
      const category = categories[i];
      const lis = wrapper.querySelectorAll("ul li");
      const updated = [];

      lis.forEach((li) => {
        const name = li.querySelector("input[placeholder='道具名']")?.value.trim() || "名前なし";
        const feature = li.querySelector("input[placeholder='特徴']")?.value.trim() || "特徴なし";
        updated.push({ name, feature });
      });

      const extraInputs = wrapper.querySelectorAll("input[placeholder]");
      if (extraInputs.length >= 2) {
        const newName = extraInputs[extraInputs.length - 2].value.trim();
        const newFeature = extraInputs[extraInputs.length - 1].value.trim();
        if (newName || newFeature) {
          updated.push({ name: newName || "名前なし", feature: newFeature || "特徴なし" });
        }
      }

      toolsData[category] = updated;
    });

    saveTools(toolsData);
    editArea.classList.add("hidden");
    saveToolsBtn.classList.add("hidden");
    renderMessage();
  });

  renderMessage();
});
