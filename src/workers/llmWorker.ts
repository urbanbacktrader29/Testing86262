import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

// Runs the actual model inference off the main thread, so the UI never
// freezes while the local model is thinking. Talks to the main thread over
// the standard WebLLM worker message protocol.
const handler = new WebWorkerMLCEngineHandler();
self.onmessage = (msg: MessageEvent) => {
  handler.onmessage(msg);
};
