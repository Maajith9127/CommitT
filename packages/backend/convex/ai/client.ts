import { createOpencodeClient } from "@opencode-ai/sdk/client";
import { internal } from "../_generated/api";

let opencodeClient: ReturnType<typeof createOpencodeClient> | null = null;

const OPENCODE_BASE_URL = process.env.OPENCODE_BASE_URL!;

export async function getOpencodeClient() {
  if (!opencodeClient) {
    opencodeClient = createOpencodeClient({
      baseUrl: OPENCODE_BASE_URL,
    });
  }
  return opencodeClient;
}
