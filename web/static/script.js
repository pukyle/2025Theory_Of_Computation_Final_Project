let currentStep = 1;
const totalSteps = 11; 

const agentMessages = {
    1: "嗨！我是你的 AI 情感諮商師。<br>我們慢慢來，先告訴我怎麼稱呼你？",
    2: "很高興認識你，<span style='color:#d65d7a;font-weight:bold;'>{name}</span>。<br>請問你想聊聊關於誰的事情呢？",
    3: "好的。在開始分析對話之前，<br>能先稍微描述一下你們最近發生了什麼問題嗎？",
    4: "了解...這確實不容易。<br>最後，請貼上你們的聊天紀錄，讓我幫你深入分析。",
    5: "收到。<br>我正在用心閱讀你們的故事，並分析其中的依附類型與溝通模式，請稍候...", 
    "5_done": "分析結果出來了！<br>我已經將報告整理成冊，請點擊「查看報告」開始閱讀。🌸",
};

document.addEventListener("DOMContentLoaded", () => {
    validateStep(1);
    updateZIndexes(); 
});

function validateStep(step) {
    let isValid = false;
    const el = (id) => document.getElementById(id).value.trim();
    if (step === 1) isValid = el("user_name").length > 0;
    if (step === 2) isValid = el("partner_name").length > 0;
    if (step === 3) isValid = el("context").length > 0;
    if (step === 4) isValid = el("chat_logs").length > 0;

    const btnId = step === 4 ? "btn-submit" : `btn-next-${step}`;
    const btn = document.getElementById(btnId);
    if(btn) btn.disabled = !isValid;
}

function nextStep(target) {
    if (currentStep >= totalSteps) return;
    let oldRobotId = currentStep === 1 ? 'agent-content-base' : `agent-content-${currentStep - 1}`;
    let oldRobot = document.getElementById(oldRobotId);
    if (oldRobot) oldRobot.classList.add('agent-fade-out');

    const currentEl = document.getElementById(`step-${currentStep}`);
    currentEl.classList.add('flipping');
    currentEl.classList.add('flipped');

    updateSpecificAgentText(target);
    
    setTimeout(() => {
        currentEl.classList.remove('flipping');
        updateZIndexes(); 
    }, 1800);

    currentStep = target;
    updateZIndexes();
}

function prevStep(target) {
    if (currentStep <= 1) return;
    const prevEl = document.getElementById(`step-${target}`);
    prevEl.classList.add('flipping');
    prevEl.classList.remove('flipped');
    
    let restoreRobotId = target === 1 ? 'agent-content-base' : `agent-content-${target - 1}`;
    let restoreRobot = document.getElementById(restoreRobotId);
    if (restoreRobot) restoreRobot.classList.remove('agent-fade-out');

    setTimeout(() => {
        prevEl.classList.remove('flipping');
        updateZIndexes(); 
    }, 1800);

    currentStep = target;
    updateZIndexes();
}

function updateSpecificAgentText(targetStep) {
    let backIndex = targetStep - 1; 
    let targetId = `agent-text-${backIndex}`;
    if (backIndex === 0) targetId = `agent-text-base`;
    
    let msgKey = targetStep;
    if (targetStep === 5 && document.getElementById("btn-result-ready").disabled === false) {
        msgKey = "5_done";
    }

    let text = agentMessages[msgKey];
    if (text) {
        const name = document.getElementById("user_name").value || "朋友";
        text = text.replace("{name}", name);
        const el = document.getElementById(targetId);
        if (el) el.innerHTML = text;
    }
}

function updateZIndexes() {
    for (let i = 1; i <= totalSteps; i++) {
        const el = document.getElementById(`step-${i}`);
        if (!el) continue;
        if (el.classList.contains('flipping')) continue;
        if (el.classList.contains('flipped')) {
            el.style.zIndex = i; 
        } else {
            el.style.zIndex = 100 - i;
        }
    }
}

// === 核心：API 與 報告切割 ===

async function send() {
    nextStep(5);
    const btnResult = document.getElementById("btn-result-ready");
    const loadingText = document.getElementById("loading-text");
    btnResult.disabled = true;
    btnResult.textContent = "分析中...";

    const payload = {
        user_name: document.getElementById("user_name").value,
        partner_name: document.getElementById("partner_name").value,
        context: document.getElementById("context").value,
        chat_logs: document.getElementById("chat_logs").value,
    };

    try {
        const r = await fetch("/analyze", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(payload)
        });
        const data = await r.json();
        
        parseAndDistribute(data.report, payload);

        if (data.download_url) {
            document.getElementById("downloadBtn").href = data.download_url;
            document.getElementById("downloadBtn").style.display = "inline-block";
        }

        loadingText.textContent = "分析完成！請翻閱您的專屬報告書。";
        btnResult.textContent = "查看報告 ➜";
        btnResult.disabled = false;
        updateSpecificAgentText(5);

    } catch (err) {
        alert("分析失敗，請稍後再試。");
        console.error(err);
        prevStep(4);
    }
}

// 改良版切割邏輯 (Robust Parsing) 
function parseAndDistribute(fullMarkdown, inputData) {
    if (typeof marked === 'undefined') return;

    // 定義區塊容器
    const parts = {};

    // --- Part 1-3: 知識導讀 (靜態切割) ---
    // 先找分割線
    let splitMain = fullMarkdown.split("============================================================");
    let knowledgeText = splitMain.length > 1 ? splitMain[0] : fullMarkdown;
    let analysisText = splitMain.length > 1 ? splitMain[1] : fullMarkdown;

    // 用關鍵字找切點
    let idxModel1 = knowledgeText.indexOf("模型一：依附理論");
    let idxModel2 = knowledgeText.indexOf("模型二：Gottman");

    if (idxModel1 !== -1 && idxModel2 !== -1) {
        parts[1] = knowledgeText.substring(0, idxModel1); // 導讀
        parts[2] = "### " + knowledgeText.substring(idxModel1, idxModel2); // 模型一
        parts[3] = "### " + knowledgeText.substring(idxModel2); // 模型二
    } else {
        parts[1] = knowledgeText; // Fallback
    }

    // --- Part 4-6: 使用者資料 (直接生成) ---
    parts[4] = `## 背景資料\n\n- **您的姓名**：${inputData.user_name}\n- **對方姓名**：${inputData.partner_name}`;
    parts[5] = `## 情感問題描述\n\n${inputData.context}`;
    let formattedLogs = inputData.chat_logs.replace(/\n/g, "\n\n"); 
    parts[6] = `## 實際聊天紀錄\n\n${formattedLogs}`;

    
    // 定義關鍵字順序
    const keywords = [
        "依附類型",       // Part 7
        "末日四騎士",     // Part 8
        "惡性循環",       // Part 9
        "具體建議",       // Part 10
        "結語"           // Part 11
    ];

    // 找出所有關鍵字的位置
    const indices = keywords.map(kw => analysisText.search(new RegExp(`(##|###|一、|二、|三、|四、|五、).*?${kw}`, "i")));
    
    // 加上結尾
    const cutPoints = [...indices, analysisText.length].filter(i => i !== -1).sort((a,b) => a-b);

    // 填充
    // cutPoints[0] 是 Part 7 的開始
    // cutPoints[1] 是 Part 8 的開始...
    
    // 為了安全，如果找不到關鍵字，就 fallback 到顯示全文
    if (cutPoints.length < 5) {
        parts[7] = analysisText;
        parts[8] = "(內容解析異常，請參考前頁)";
    } else {
        parts[7] = analysisText.substring(cutPoints[0], cutPoints[1]);
        parts[8] = analysisText.substring(cutPoints[1], cutPoints[2]);
        parts[9] = analysisText.substring(cutPoints[2], cutPoints[3]);
        parts[10] = analysisText.substring(cutPoints[3], cutPoints[4]);
        parts[11] = analysisText.substring(cutPoints[4]);
    }

    // 渲染
    for (let i = 1; i <= 11; i++) {
        const container = document.getElementById(`report-part-${i}`);
        if (container) {
            // 如果內容是空的，顯示提示
            if (!parts[i] || parts[i].trim() === "") {
                container.innerHTML = "<p>（此部分無內容）</p>";
            } else {
                container.innerHTML = marked.parse(parts[i]);
            }
        }
    }
}

// Load / Save (不變)
document.getElementById('loadChatFile').addEventListener('change', function(e) { /*...*/ });
async function saveChat() { /*...*/ }

// ===============================
// Chat Mode (對話模式)
// ===============================

let chatSession = null;

function setMode(mode) {
  document.querySelector(".scene").style.display = mode === "book" ? "block" : "none";
  document.getElementById("chat-overlay").style.display = mode === "chat" ? "flex" : "none";
}

async function enterChatMode() {
  setMode("chat");

  const r = await fetch("/chat/start", { method: "POST" });
  const d = await r.json();

  chatSession = d.session_id;
  const box = document.getElementById("chat-box");
  box.innerHTML = `<div class="chat-ai">${d.reply}</div>`;
}

async function sendChat() {
  const input = document.getElementById("chat-input");
  const msg = input.value.trim();
  if (!msg || !chatSession) return;
  input.value = "";

  const box = document.getElementById("chat-box");
  box.innerHTML += `<div class="chat-user">${msg}</div>`;

  // 建立暫時 AI 氣泡
  const thinkingBubble = document.createElement("div");
  thinkingBubble.className = "chat-ai thinking";
  thinkingBubble.textContent = "思考中.";
  box.appendChild(thinkingBubble);
  box.scrollTop = box.scrollHeight;

  // 動畫
  let dots = 1;
  const timer = setInterval(() => {
    dots = (dots % 3) + 1;
    thinkingBubble.textContent = "思考中" + ".".repeat(dots);
  }, 500);

  try {
    const r = await fetch("/chat/message", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        session_id: chatSession,
        message: msg
      })
    });

    const d = await r.json();

    clearInterval(timer);
    thinkingBubble.innerHTML = marked.parse(d.reply);
    thinkingBubble.classList.remove("thinking");

  } catch (err) {
    clearInterval(timer);
    thinkingBubble.textContent = "（發生錯誤，請再試一次）";
    console.error(err);
  }

  box.scrollTop = box.scrollHeight;
}

// ===============================
// Load / Save Logic (Implementation)
// ===============================

// 1. Loading Chat History
document.getElementById('loadChatFile').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);

            // Fill in the fields
            if (data.user_name) document.getElementById('user_name').value = data.user_name;
            if (data.partner_name) document.getElementById('partner_name').value = data.partner_name;
            if (data.context) document.getElementById('context').value = data.context;
            if (data.chat_logs) document.getElementById('chat_logs').value = data.chat_logs;

            // Trigger validation to enable buttons
            validateStep(1);
            validateStep(2);
            validateStep(3);
            validateStep(4);

            alert("讀取成功！");
        } catch (err) {
            console.error(err);
            alert("讀取失敗，檔案格式可能錯誤。");
        }
    };
    reader.readAsText(file);
    // Reset value so the same file can be selected again if needed
    event.target.value = '';
});

// 2. Saving Chat History
async function saveChat() {
    const payload = {
        user_name: document.getElementById("user_name").value,
        partner_name: document.getElementById("partner_name").value,
        context: document.getElementById("context").value,
        chat_logs: document.getElementById("chat_logs").value,
    };

    try {
        const response = await fetch("/save_history", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error("Network response was not ok");
        }

        const data = await response.json();

        if (data.download_url) {
            // Use the hidden anchor tag in index.html to trigger download
            const a = document.getElementById("downloadChatBtn");
            a.href = data.download_url;
            a.download = `chat_history_${data.file_id || 'backup'}.json`;
            a.click();
        } else {
            alert("儲存失敗：未收到下載連結");
        }

    } catch (error) {
        console.error("Error saving chat:", error);
        alert("儲存失敗，請檢查伺服器連線。");
    }
}
function handleChatKey(event) {
  if (event.key === "Enter" && !event.isComposing) {
    event.preventDefault();
    sendChat();
  }
}
