import { renderLabel, type LabelConfig } from "./canvas";
import * as printer from "./printer";
import type { PrinterState } from "./printer";
import "./style.css";

// --- DOM elements ---
const pageTitle = document.getElementById("page-title")!;
const btnConnect = document.getElementById("btn-connect") as HTMLButtonElement;
const statusEl = document.getElementById("status")!;
const batteryEl = document.getElementById("battery")!;
const previewCanvas = document.getElementById("label-preview") as HTMLCanvasElement;
const inputText = document.getElementById("input-text") as HTMLTextAreaElement;
const inputFontSize = document.getElementById("input-font-size") as HTMLSelectElement;
const inputWidth = document.getElementById("input-width") as HTMLInputElement;
const inputHeight = document.getElementById("input-height") as HTMLInputElement;
const inputBold = document.getElementById("input-bold") as HTMLInputElement;
const btnPrint = document.getElementById("btn-print") as HTMLButtonElement;
const printProgress = document.getElementById("print-progress")!;

// --- State ---
let lastPrintCanvas: HTMLCanvasElement | null = null;

function getConfig(): LabelConfig {
  return {
    text: inputText.value,
    fontSize: Number(inputFontSize.value),
    bold: inputBold.checked,
    align: "center" as const,
    widthMm: Number(inputWidth.value),
    heightMm: Number(inputHeight.value),
  };
}

function updatePreview() {
  const config = getConfig();
  lastPrintCanvas = renderLabel(config, previewCanvas);
}

// --- Printer callbacks ---
function onStateChange(state: PrinterState) {
  switch (state) {
    case "disconnected":
      statusEl.textContent = "Disconnected";
      btnConnect.textContent = "Connect";
      btnConnect.classList.remove("connected");
      btnConnect.disabled = false;
      btnPrint.disabled = true;
      batteryEl.textContent = "";
      printProgress.textContent = "";
      pageTitle.textContent = "NIIMBOT D110";
      break;
    case "connecting":
      statusEl.textContent = "Connecting…";
      btnConnect.disabled = true;
      break;
    case "connected":
      statusEl.textContent = "Connected";
      btnConnect.textContent = "Disconnect";
      btnConnect.classList.add("connected");
      btnConnect.disabled = false;
      btnPrint.disabled = false;
      printProgress.textContent = "";
      break;
    case "printing":
      btnPrint.disabled = true;
      btnConnect.disabled = true;
      printProgress.textContent = "Printing…";
      break;
  }
}

printer.init({
  onStateChange,
  onPrinterInfo(info) {
    const name = printer.getDeviceName();
    if (name) pageTitle.textContent = name;
    const parts: string[] = [];
    if (info.serial) parts.push(`S/N: ${info.serial}`);
    if (info.softwareVersion) parts.push(`FW: ${info.softwareVersion}`);
    statusEl.textContent = `Connected${parts.length ? " — " + parts.join(", ") : ""}`;
  },
  onHeartbeat(data) {
    if (data.chargeLevel !== undefined) {
      const pct = data.chargeLevel * 25;
      batteryEl.textContent = `${pct}%`;
    }
  },
  onPrintProgress(e) {
    printProgress.textContent = `Page ${e.page + 1}/${e.pagesTotal} — print ${e.pagePrintProgress}%, feed ${e.pageFeedProgress}%`;
  },
  onError(msg) {
    printProgress.textContent = `Error: ${msg}`;
  },
});

// --- Event wiring ---
btnConnect.addEventListener("click", () => {
  if (printer.isConnected()) {
    printer.disconnect();
  } else {
    printer.connect();
  }
});

btnPrint.addEventListener("click", () => {
  if (!lastPrintCanvas) return;
  printer.print(lastPrintCanvas);
});

// --- Templates ---
const templates: Record<string, () => string> = {
  date: () => new Date().toISOString().slice(0, 10),
};

for (const btn of document.querySelectorAll<HTMLButtonElement>(".template-btn")) {
  btn.addEventListener("click", () => {
    const fn = templates[btn.dataset.template!];
    if (fn) {
      inputText.value = fn();
      updatePreview();
    }
  });
}

// Live preview on any input change
for (const el of [inputText, inputFontSize, inputWidth, inputHeight, inputBold]) {
  el.addEventListener("input", updatePreview);
}

// Initial render
updatePreview();
