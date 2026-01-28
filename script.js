//CONFIG / UTIL
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
  if (resultBox) resultBox.classList.add("hidden");
  if (errorBox) {
    errorBox.classList.remove("hidden");
    errorBox.textContent = msg;
  }
}

function clearError() {
  const errorBox = document.getElementById("errorBox");
  if (errorBox) {
    errorBox.classList.add("hidden");
    errorBox.textContent = "";
  }
}

function hideResult() {
  const resultBox = document.getElementById("resultBox");
  if (resultBox) resultBox.classList.add("hidden");
}

function renderResult(data) {
  clearError();

  const resultBox = document.getElementById("resultBox");
  const pillCategory = document.getElementById("pillCategory");
  const confidenceText = document.getElementById("confidenceText");
  const confidenceBar = document.getElementById("confidenceBar");
  const reasonText = document.getElementById("reasonText");
  const replyText = document.getElementById("replyText");

  if (!resultBox) return;

  resultBox.classList.remove("hidden");

  const isProd = data.category === "produtivo";
  if (pillCategory) {
    pillCategory.innerHTML = `${isProd ? "✅" : "ℹ️"} <span>${isProd ? "Produtivo" : "Improdutivo"}</span>`;
    pillCategory.className =
      "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold " +
      (isProd
        ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
        : "border-white/10 bg-white/5 text-slate-200");
  }

  const pct = Math.round((Number(data.confidence) || 0) * 100);
  if (confidenceText) confidenceText.textContent = `${pct}%`;
  if (confidenceBar) confidenceBar.style.width = `${pct}%`;

  if (reasonText) reasonText.textContent = data.reason || "";
  if (replyText) replyText.textContent = data.suggested_reply || "";

  setStatus("Analisado", "bg-emerald-400");
}

// ============================
// TABS
// ============================
function switchTab(btnActive, btnInactive, showPanel, hidePanel) {
  if (showPanel) showPanel.classList.remove("hidden");
  if (hidePanel) hidePanel.classList.add("hidden");

  if (btnActive) btnActive.classList.add("bg-white/10");
  if (btnInactive) btnInactive.classList.remove("bg-white/10");

  if (btnActive) btnActive.setAttribute("aria-selected", "true");
  if (btnInactive) btnInactive.setAttribute("aria-selected", "false");

  clearError();
  hideResult();
}

const btnPdf = document.getElementById("tabPdf");
const btnText = document.getElementById("tabText");
const panelPdf = document.getElementById("panelPdf");
const panelText = document.getElementById("panelText");

if (btnPdf && btnText && panelPdf && panelText) {
  btnPdf.addEventListener("click", () => switchTab(btnPdf, btnText, panelPdf, panelText));
  btnText.addEventListener("click", () => switchTab(btnText, btnPdf, panelText, panelPdf));
}

// ============================
// EXTRACTORS
// ============================

// PDF (pdf.js)
async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = "";
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item) => item.str).join(" ");
    fullText += pageText + "\n\n";
  }
  return fullText.trim();
}

// TXT
function readTextFromTXT(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Erro ao ler TXT"));

    reader.readAsText(file, "utf-8");
  });
}

//PDF INPUT / TXT
const pdfInput = document.getElementById("pdfFile");
const selectedPdf = document.getElementById("selectedPdf");
const pdfPreview = document.getElementById("pdfPreview");
const btnRemovePdf = document.getElementById("btnRemovePdf");

// guarda o texto extraído
let extractedFileText = "";

if (pdfInput) {
  pdfInput.addEventListener("change", async () => {
    const file = pdfInput.files?.[0];
    clearError();
    hideResult();
    extractedFileText = "";

    if (!file) {
      if (selectedPdf) selectedPdf.textContent = "Nenhum arquivo selecionado";
      if (pdfPreview) pdfPreview.textContent = "Assim que seu texto for extraído, mostrará um trecho aqui.";
      setStatus("Pronto", "bg-slate-400");
      return;
    }

    if (selectedPdf) selectedPdf.textContent = file.name;

    const name = file.name.toLowerCase();
    const isTxt = file.type === "text/plain" || name.endsWith(".txt");
    const isPdf = file.type === "application/pdf" || name.endsWith(".pdf");

    // TXT
    if (isTxt) {
      setStatus("Lendo TXT...", "bg-cyan-400");
      try {
        const text = await readTextFromTXT(file);
        extractedFileText = text;

        if (pdfPreview) {
          pdfPreview.textContent = text.slice(0, 600) + (text.length > 600 ? "…" : "");
        }
        setStatus("TXT pronto", "bg-emerald-400");
      } catch (e) {
        console.error(e);
        if (pdfPreview) pdfPreview.textContent = "Erro ao ler o TXT.";
        setStatus("Erro no TXT", "bg-red-400");
      }
      return;
    }

    // PDF
    if (isPdf) {
      setStatus("Extraindo PDF...", "bg-cyan-400");
      try {
        const text = await extractTextFromPDF(file);
        extractedFileText = text;

        if (!text) {
          if (pdfPreview) pdfPreview.textContent = "Não foi possível extrair texto (PDF pode ser escaneado/imagem).";
          setStatus("PDF sem texto", "bg-slate-400");
          return;
        }

        if (pdfPreview) {
          pdfPreview.textContent = text.slice(0, 600) + (text.length > 600 ? "…" : "");
        }
        setStatus("PDF pronto", "bg-emerald-400");
      } catch (e) {
        console.error(e);
        if (pdfPreview) pdfPreview.textContent = "Erro ao extrair texto do PDF.";
        setStatus("Erro no PDF", "bg-red-400");
      }
      return;
    }

    // formato não suportado
    if (pdfPreview) pdfPreview.textContent = "Formato não suportado. Use .pdf ou .txt";
    setStatus("Formato inválido", "bg-red-400");
  });
}

// limpar arquivo
if (btnRemovePdf) {
  btnRemovePdf.addEventListener("click", () => {
    if (pdfInput) pdfInput.value = "";
    if (selectedPdf) selectedPdf.textContent = "Nenhum arquivo";
    if (pdfPreview) pdfPreview.textContent = "Assim que seu texto for extraído, mostrará um trecho aqui.";
    extractedFileText = "";
    clearError();
    hideResult();
    setStatus("Pronto", "bg-slate-400");
  });
}

//REQUEST PRO BACKEND
async function analyzeEmail() {
  const btnAnalyze = document.getElementById("btnAnalyze");
  const original = btnAnalyze ? btnAnalyze.innerText : "";

  if (btnAnalyze) {
    btnAnalyze.disabled = true;
    btnAnalyze.textContent = "Analisando...";
  }

  clearError();
  hideResult();
  setStatus("Processando...", "bg-fuchsia-400");

  try {
    const isTextTab = btnText && btnText.getAttribute("aria-selected") === "true";

    let textToSend = "";

    if (isTextTab) {
      const emailTextEl = document.getElementById("emailText");
      const emailText = (emailTextEl?.value || "").trim();

      if (!emailText) {
        showError("Insira um texto para analisar.");
        setStatus("Pronto", "bg-slate-400");
        return;
      }

      textToSend = emailText;
    } else {
      const file = pdfInput?.files?.[0];
      if (!file) {
        showError("Selecione um arquivo (.pdf ou .txt) para analisar.");
        setStatus("Pronto", "bg-slate-400");
        return;
      }

      // usa cache se já foi extraído no change
      if (extractedFileText && extractedFileText.trim()) {
        textToSend = extractedFileText;
      } else {
        // fallback
        const name = file.name.toLowerCase();
        const isTxt = file.type === "text/plain" || name.endsWith(".txt");
        const isPdf = file.type === "application/pdf" || name.endsWith(".pdf");

        if (isTxt) {
          textToSend = await readTextFromTXT(file);
        } else if (isPdf) {
          textToSend = await extractTextFromPDF(file);
        } else {
          showError("Formato não suportado. Use .pdf ou .txt");
          setStatus("Pronto", "bg-slate-400");
          return;
        }
      }

      if (!textToSend || !textToSend.trim()) {
        showError("Não foi possível extrair texto do arquivo (PDF pode ser escaneado/imagem).");
        setStatus("Pronto", "bg-slate-400");
        return;
      }
    }

    const response = await fetch(`${API_BASE}/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
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
    if (btnAnalyze) {
      btnAnalyze.disabled = false;
      btnAnalyze.textContent = original;
    }
  }
}

// botão analisar
const btnAnalyze = document.getElementById("btnAnalyze");
if (btnAnalyze) btnAnalyze.addEventListener("click", analyzeEmail);

// demo
const btnDemo = document.getElementById("btnDemo");
if (btnDemo) {
  btnDemo.addEventListener("click", () => {
    location.hash = "#demo";
  });
}

// limpar tudo
const btnClear = document.getElementById("btnClear");
if (btnClear) {
  btnClear.addEventListener("click", () => {
    const emailTextEl = document.getElementById("emailText");
    if (emailTextEl) emailTextEl.value = "";

    if (pdfInput) pdfInput.value = "";
    if (selectedPdf) selectedPdf.textContent = "Nenhum arquivo";
    if (pdfPreview) pdfPreview.textContent = "Assim que seu texto for extraído, mostrará um trecho aqui.";

    extractedFileText = "";
    clearError();
    hideResult();
    setStatus("Pronto", "bg-slate-400");
  });
}

// copiar resposta
const btnCopyReply = document.getElementById("btnCopyReply");
if (btnCopyReply) {
  btnCopyReply.addEventListener("click", async () => {
    const reply = (document.getElementById("replyText")?.textContent || "").trim();
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
}
