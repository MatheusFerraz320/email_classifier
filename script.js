// API do server
const API_BASE = window.API_BASE || "http://localhost:8000";


function setStatus(text, dotClass = "bg-slate-400") {
  const statusText = document.getElementById("statusText");
  const statusDot = document.getElementById("statusDot");
  if (statusText) statusText.textContent = text;
  if (statusDot) statusDot.className = `h-2 w-2 rounded-full ${dotClass}`;
}

function showError(msg) {
  const errorBox = document.getElementById("errorBox");
  const resultBox = document.getElementById("resultBox");
  resultBox.classList.add("hidden");
  errorBox.classList.remove("hidden");
  errorBox.textContent = msg;
}

function clearError() {
  const errorBox = document.getElementById("errorBox");
  errorBox.classList.add("hidden");
  errorBox.textContent = "";
}

function hideResult() {
  document.getElementById("resultBox").classList.add("hidden");
}

function renderResult(data) {
  clearError();

  const resultBox = document.getElementById("resultBox");
  const pillCategory = document.getElementById("pillCategory");
  const confidenceText = document.getElementById("confidenceText");
  const confidenceBar = document.getElementById("confidenceBar");
  const reasonText = document.getElementById("reasonText");
  const replyText = document.getElementById("replyText");

  resultBox.classList.remove("hidden");

  const isProd = data.category === "produtivo";
  pillCategory.innerHTML = `${isProd ? "✅" : "ℹ️"} <span>${isProd ? "Produtivo" : "Improdutivo"}</span>`;
  pillCategory.className =
    "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold " +
    (isProd
      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
      : "border-white/10 bg-white/5 text-slate-200");

  const pct = Math.round((Number(data.confidence) || 0) * 100);
  confidenceText.textContent = `${pct}%`;
  confidenceBar.style.width = `${pct}%`;

  reasonText.textContent = data.reason || "";
  replyText.textContent = data.suggested_reply || "";

  setStatus("Analisado", "bg-emerald-400");
}

//switch tab
function switchTab(btnActive, btnInactive, showPanel, hidePanel) {
  showPanel.classList.remove("hidden");
  hidePanel.classList.add("hidden");

  btnActive.classList.add("bg-white/10");
  btnInactive.classList.remove("bg-white/10");

  btnActive.setAttribute("aria-selected", "true");
  btnInactive.setAttribute("aria-selected", "false");

  clearError();
  hideResult();
}

const btnPdf = document.getElementById("tabPdf");
const btnText = document.getElementById("tabText");
const panelPdf = document.getElementById("panelPdf");
const panelText = document.getElementById("panelText");

btnPdf.addEventListener("click", () => switchTab(btnPdf, btnText, panelPdf, panelText));
btnText.addEventListener("click", () => switchTab(btnText, btnPdf, panelText, panelPdf));

//extrair pdf
async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = "";
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(" ");
    fullText += pageText + "\n\n";
  }
  return fullText.trim();
}

// Visual do arquivo selecionado
const pdfInput = document.getElementById("pdfFile");
const selectedPdf = document.getElementById("selectedPdf");
const pdfPreview = document.getElementById("pdfPreview");
const btnRemovePdf = document.getElementById("btnRemovePdf");

pdfInput.addEventListener("change", async () => {
  const file = pdfInput.files?.[0];

  clearError();
  hideResult();

  if (!file) {
    selectedPdf.textContent = "Nenhum arquivo selecionado";
    pdfPreview.textContent = "Assim que seu texto for extraido, mostrará um trecho aqui.";
    return;
  }

  selectedPdf.textContent = `${file.name}`;
  setStatus("Extraindo PDF...", "bg-cyan-400");

  try {
    const text = await extractTextFromPDF(file);

    if (!text) {
      pdfPreview.textContent = "Não foi possível extrair texto (PDF pode ser escaneado/imagem).";
      setStatus("PDF sem texto", "bg-slate-400");
      return;
    }

    
    pdfPreview.textContent = text.slice(0, 600) + (text.length > 600 ? "…" : "");
    setStatus("PDF pronto", "bg-emerald-400");
  } catch (e) {
    console.error(e);
    pdfPreview.textContent = "Erro ao extrair texto do PDF.";
    setStatus("Erro no PDF", "bg-red-400");
  }
});

btnRemovePdf.addEventListener("click", () => {
  pdfInput.value = "";
  selectedPdf.textContent = "Nenhum arquivo";
  pdfPreview.textContent = "Assim que seu texto for extraido, mostrará um trecho aqui.";
  clearError();
  hideResult();
  setStatus("Pronto", "bg-slate-400");
});


async function analyzeEmail() {
  const btnAnalyze = document.getElementById("btnAnalyze");
  const original = btnAnalyze.innerText;

  btnAnalyze.disabled = true;
  btnAnalyze.textContent = "Analisando...";
  clearError();
  hideResult();
  setStatus("Processando...", "bg-fuchsia-400");

  try {
    const isTextTab = btnText.getAttribute("aria-selected") === "true";

    let textToSend = "";

    if (isTextTab) {
      const emailText = document.getElementById("emailText").value.trim();
      if (!emailText) {
        showError("Insira um texto para analisar.");
        setStatus("Pronto", "bg-slate-400");
        return;
      }
      textToSend = emailText;
    } else {
      const file = pdfInput.files?.[0];
      if (!file) {
        showError("Selecione um PDF para analisar.");
        setStatus("Pronto", "bg-slate-400");
        return;
      }
      const extracted = await extractTextFromPDF(file);
      if (!extracted) {
        showError("Não foi possível extrair texto do PDF (provável PDF escaneado/imagem).");
        setStatus("Pronto", "bg-slate-400");
        return;
      }
      textToSend = extracted;
    }

    const response = await fetch(`${API_BASE}/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({ text: textToSend }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const msg = data?.detail ? JSON.stringify(data.detail) : `Erro ${response.status}`;
      showError(msg);
      setStatus("Erro", "bg-red-400");
      return;
    }

    console.log("API:", data);
    renderResult(data);
  } catch (error) {
    console.error("Erro ao analisar email:", error);
    showError("Falha de conexão com a API. Verifique se o backend está rodando.");
    setStatus("Erro", "bg-red-400");
  } finally {
    btnAnalyze.disabled = false;
    btnAnalyze.textContent = original;
  }
}

// botão analisar
document.getElementById("btnAnalyze").addEventListener("click", analyzeEmail);


document.getElementById("btnDemo").addEventListener("click", () => {
  location.hash = "#demo";
});

//limpar
document.getElementById("btnClear").addEventListener("click", () => {
  document.getElementById("emailText").value = "";
  pdfInput.value = "";
  selectedPdf.textContent = "Nenhum arquivo";
  pdfPreview.textContent = "Assim que seu texto for extraido, mostrará um trecho aqui.";
  clearError();
  hideResult();
  setStatus("Pronto", "bg-slate-400");
});


//copiar
document.getElementById("btnCopyReply").addEventListener("click", async () => {
  const btnCopyReply = document.getElementById("btnCopyReply");
  const reply = document.getElementById("replyText").textContent.trim();
  if (!reply) return;

  try {
    await navigator.clipboard.writeText(reply);
    const original = btnCopyReply.innerHTML;
    btnCopyReply.innerHTML = "✅ Copiado";
    setTimeout(() => (btnCopyReply.innerHTML = original), 1200);
  } catch {
    alert("Não foi possível copiar automaticamente. Copie manualmente.");
  }
});
