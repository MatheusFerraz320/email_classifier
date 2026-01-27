//redirect demo
const btnDemo = document.getElementById("btnDemo");
btnDemo.addEventListener("click", () => {
  location.hash = "#demo";
});

//limpar campo
const btnClear = document.getElementById("btnClear");
btnClear.addEventListener("click", () => {
    document.getElementById("emailText").value = "";
    document.getElementById("emailText").focus();
});

//trocar pdf para text 
function switchTab (btncActive , btncInactive , showPanel , hidePanel) {
    showPanel.classList.remove("hidden")
    hidePanel.classList.add("hidden")
    btncActive.classList.add("bg-white/10");
    btncInactive.classList.remove("bg-white/10");
    btnActive.setAttribute("aria-selected", "true");
    btnInactive.setAttribute("aria-selected", "false");
}

//aplicação da função no bloco
const btnPdf  = document.getElementById("tabPdf");
const btnText = document.getElementById("tabText");
const panelPdf  = document.getElementById("panelPdf");
const panelText = document.getElementById("panelText");
btnPdf.addEventListener("click", () =>
  switchTab(btnPdf, btnText , panelPdf , panelText)
);
btnText.addEventListener("click", () =>
  switchTab(btnText, btnPdf , panelText , panelPdf)
);
//aplicação da função de troca pdf - text


//copiar resposta
function copyText() {   
  const btnCopyReply = document.getElementById("btnCopyReply");
  btnCopyReply.addEventListener("click", async () => {
    const text = document.getElementById("pdfPreview").innerText.trim();
    if (!text) return;

    await navigator.clipboard.writeText(text);
    const original = btnCopyReply.innerHTML
    btnCopyReply.innerHTML= "✅ Copiado";
       setTimeout(() => {
      btnCopyReply.innerHTML = original;
    }, 1200); 
  });
}
copyText()

async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = "";

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    const pageText = textContent.items
      .map(item => item.str)
      .join(" ");

    fullText += pageText + "\n\n";
  }

  return fullText.trim();
}

//Visual do arquivo selecionado//
const pdfInput = document.getElementById("pdfFile");
const selectedPdf = document.getElementById("selectedPdf");
pdfInput.addEventListener("change", () => {
  const file = pdfInput.files?.[0];

  if (!file) {
    selectedPdf.textContent = "Nenhum arquivo selecionado";
    return;
  }

  selectedPdf.textContent = `📄 ${file.name}`;
});
const pdfRemove = document.getElementById("btnRemovePdf")
    pdfRemove.addEventListener("click", () => {
    pdfInput = ""
    selectedPdf.textContent = "Nenhum arquivo"
});
//Visual do arquivo selecionado//

const analyzeText = document.getElementById("btnAnalyze");
analyzeText.addEventListener("click", async () => {
  const file = pdfInput.files[0];
  if (!file) return;

  const text = await extractTextFromPDF(file);
  console.log(text);
});

