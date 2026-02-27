import {
  NiimbotBluetoothClient,
  ImageEncoder,
  LabelType,
} from "@mmote/niimbluelib";
import type {
  PrinterInfo,
  HeartbeatData,
  PrintProgressEvent,
} from "@mmote/niimbluelib";

export type PrinterState = "disconnected" | "connecting" | "connected" | "printing";

export interface PrinterCallbacks {
  onStateChange: (state: PrinterState) => void;
  onPrinterInfo: (info: PrinterInfo) => void;
  onHeartbeat: (data: HeartbeatData) => void;
  onPrintProgress: (event: PrintProgressEvent) => void;
  onError: (message: string) => void;
}

const client = new NiimbotBluetoothClient();
let state: PrinterState = "disconnected";
let callbacks: PrinterCallbacks;

function setState(s: PrinterState) {
  state = s;
  callbacks.onStateChange(s);
}

export function init(cb: PrinterCallbacks) {
  callbacks = cb;

  client.on("disconnect", () => setState("disconnected"));

  client.on("printerinfofetched", (e) => callbacks.onPrinterInfo(e.info));

  client.on("heartbeat", (e) => callbacks.onHeartbeat(e.data));

  client.on("printprogress", (e) => callbacks.onPrintProgress(e));
}

export async function connect() {
  if (state !== "disconnected") return;
  setState("connecting");
  try {
    await client.connect();
    setState("connected");
  } catch (err) {
    setState("disconnected");
    callbacks.onError(err instanceof Error ? err.message : String(err));
  }
}

export async function disconnect() {
  if (state === "disconnected") return;
  await client.disconnect();
  setState("disconnected");
}

export function isConnected() {
  return state === "connected";
}

export async function print(canvas: HTMLCanvasElement) {
  if (state !== "connected") return;
  setState("printing");

  try {
    const encoded = ImageEncoder.encodeCanvas(canvas, "left");

    const taskType = client.getPrintTaskType() ?? "D110";
    const printTask = client.abstraction.newPrintTask(taskType, {
      totalPages: 1,
      density: 2,
      labelType: LabelType.WithGaps,
    });

    await printTask.printInit();
    await printTask.printPage(encoded, 1);
    await printTask.waitForFinished();
    await printTask.printEnd();

    setState("connected");
  } catch (err) {
    setState("connected");
    callbacks.onError(err instanceof Error ? err.message : String(err));
  }
}
