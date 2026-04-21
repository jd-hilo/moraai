import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { parseChatGPTExport, parseClaudeExport } from "@/lib/utils";
import { runImportPipeline } from "@/lib/pipelines/import-pipeline";
import { requireCredits, CreditsExhaustedError } from "@/lib/credits";
import JSZip from "jszip";

// Ballpark credit cost of an import: tens of extract batches + 1 merge at
// Haiku pricing. 90 credits keeps a user with a near-empty wallet from
// starting an import they can't finish.
const MIN_CREDITS_IMPORT = 90;

export async function POST(request: Request) {
  try {
    const user = await getOrCreateUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Gate: must have enough credits for the full extract + merge run.
    try {
      await requireCredits(user.id, MIN_CREDITS_IMPORT);
    } catch (err) {
      if (err instanceof CreditsExhaustedError) {
        return Response.json(
          {
            error: `Need at least ${MIN_CREDITS_IMPORT} credits to run an import.`,
            credits: err.credits,
            resetsAt: err.creditsResetAt.toISOString(),
          },
          { status: 402 }
        );
      }
      throw err;
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const source = (formData.get("source") as string) || "chatgpt";

    if (!file) {
      return Response.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Update import status
    await prisma.user.update({
      where: { id: user.id },
      data: { importStatus: "processing" },
    });

    // Read file contents
    let jsonData: unknown;

    if (file.name.endsWith(".zip")) {
      // Extract JSON from zip
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);

      // Look for conversations.json (ChatGPT format)
      const jsonFile =
        zip.file("conversations.json") ||
        Object.values(zip.files).find((f) => f.name.endsWith(".json"));

      if (!jsonFile) {
        return Response.json(
          { error: "No JSON file found in zip" },
          { status: 400 }
        );
      }

      const jsonText = await jsonFile.async("text");
      jsonData = JSON.parse(jsonText);
    } else {
      // Direct JSON file
      const text = await file.text();
      jsonData = JSON.parse(text);
    }

    // Parse conversations based on source
    const conversations =
      source === "claude"
        ? parseClaudeExport(jsonData)
        : parseChatGPTExport(jsonData);

    if (conversations.length === 0) {
      return Response.json(
        { error: "No conversations found in the export file" },
        { status: 400 }
      );
    }

    // Stream progress via SSE
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        const sendMessage = (msg: string) => {
          controller.enqueue(encoder.encode(`data: ${msg}\n\n`));
        };

        try {
          await runImportPipeline(
            user.id,
            user.vaultPath,
            conversations,
            sendMessage
          );
        } catch (error) {
          console.error("Import pipeline error:", error);
          sendMessage("An error occurred during import. Please try again.");

          await prisma.user.update({
            where: { id: user.id },
            data: { importStatus: "failed" },
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Import API error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
