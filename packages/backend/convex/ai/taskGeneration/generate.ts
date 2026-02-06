import { action } from "../../_generated/server";
import { v } from "convex/values";
import { getOpencodeClient } from "../client";
import { logger } from "../../lib/logger";

// Re-implementing generateTaskConditions based on opencode.ts logic
export const generateConditions = async (params: {
  title: string;
  description: string;
  metrics: Array<{
    key: string;
    name: string;
    description: string;
    unit: string;
    allowed_relations: string[];
    allowed_target_types: string[];
  }>;
}): Promise<
  Array<{
    metric_key: string;
    relation: string;
    target: {
      type: string;
      value: any;
    };
  }>
> => {
  const client = await getOpencodeClient();

  const session = await client.session.create({
    body: { title: `Generate conditions for: ${params.title}` },
  });

  if (!session.data) {
    throw new Error("Failed to create opencode session");
  }

  const prompt = `Task Title: ${params.title}
Task Description: ${params.description}

Available Metrics:
${params.metrics.map((m) => `- ${m.key}: ${m.name} (${m.description}). Unit: ${m.unit}. Allowed relations: ${m.allowed_relations.join(", ")}`).join("\n")}

Generate 1-5 conditions for this task based on available metrics.
IMPORTANT: Return ONLY raw JSON array without any markdown formatting, code blocks, or explanation. Do NOT use \`\`\`json or \`\`\` markers.
Your response must start with [ and end with ] and contain only the JSON.

Expected format:
[
  {
    "metric_key": "string",
    "relation": "eq|neq|gt|gte|lt|lte|in|not_in|within|outside|exists|matches|range",
    "target": {
      "type": "number|string|boolean|array|range|file|log",
      "value": <appropriate value>
    }
  }
]`;

  try {
    const result = await client.session.prompt({
      path: { id: session.data.id },
      body: {
        model: { providerID: "opencode", modelID: "glm-4.7-free" },
        tools: { "*": false },
        parts: [{ type: "text", text: prompt }],
      },
      signal: AbortSignal.timeout(60_000),
    });

    const response = result.data?.parts?.find((p) => p.type === "text")?.text || "[]";
    // Basic cleanup if model adds markdown despite instructions
    const cleanResponse = response.replace(/^```json/, '').replace(/```$/, '').trim();
    
    const conditions = JSON.parse(cleanResponse);

    if (!Array.isArray(conditions)) {
      throw new Error("Invalid response format from opencode");
    }

    if (conditions.length === 0 || conditions.length > 5) {
      logger.warn(`Generated ${conditions.length} conditions, limiting to 1-5`);
      return conditions.slice(0, 5);
    }

    return conditions;
  } catch (error) {
    logger.error("AI_GENERATION_ERROR", error);
    throw new Error(
      `Failed to generate conditions: ${error instanceof Error ? error.message : String(error)}`,
    );
  } finally {
    if (session.data?.id) {
      await client.session.delete({ path: { id: session.data.id } });
    }
  }
};
