import { getOrCreateUser } from "@/lib/get-or-create-user";
import { readAllVaultFiles } from "@/lib/vault/storage";
import JSZip from "jszip";

export async function GET(request: Request) {
  try {
    const user = await getOrCreateUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const format = url.searchParams.get("format") || "obsidian";

    let files: Record<string, string>;
    try {
      files = await readAllVaultFiles(user.vaultPath);
    } catch {
      files = {};
    }

    if (Object.keys(files).length === 0) {
      return Response.json({ error: "No vault files to export" }, { status: 404 });
    }

    if (format === "json") {
      // Export as JSON
      const jsonContent = JSON.stringify(files, null, 2);
      return new Response(jsonContent, {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": "attachment; filename=mora-vault.json",
        },
      });
    }

    // Export as zip (Obsidian format)
    const zip = new JSZip();
    const folder = zip.folder("mora-vault");

    if (folder) {
      for (const [filename, content] of Object.entries(files)) {
        folder.file(filename, content);
      }
    }

    const zipBuffer = await zip.generateAsync({ type: "uint8array" });

    return new Response(zipBuffer.buffer as ArrayBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": "attachment; filename=mora-vault.zip",
      },
    });
  } catch (error) {
    console.error("Vault export error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
