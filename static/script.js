const btnClear = document.getElementById("btnClear");
btnClear.addEventListener("click", () => {
    document.getElementById("emailText").value = "";
    document.getElementById("emailText").focus();
});

const btnPdf = document.getElementById("tabPdf");
btnPdf.addEventListener("click", () => {
    document.getElementById("panelPdf").classList.remove("hidden");
    document.getElementById("panelText").classList.add("hidden");
    btnPdf.classList.add("bg-white/10");
    btnText.classList.remove("bg-white/10");
})

const btnText = document.getElementById("tabText");
btnText.addEventListener("click", () => {
    document.getElementById("panelText").classList.remove("hidden");
    document.getElementById("panelPdf").classList.add("hidden");
    btnPdf.classList.remove("bg-white/10");
    btnText.classList.add("bg-white/10");
})
