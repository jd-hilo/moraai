import { getAvailableModels, getDefaultModel } from "@/lib/models";

export async function GET() {
  try {
    const models = getAvailableModels();
    const defaultModel = getDefaultModel();
    return Response.json({
      models,
      defaultModelId: defaultModel.id,
    });
  } catch (error) {
    console.error("[/api/models] error:", error);
    return Response.json(
      { models: [], defaultModelId: null, error: (error as Error).message },
      { status: 500 }
    );
  }
}
