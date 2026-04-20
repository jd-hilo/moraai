import { getOrCreateUser } from "@/lib/get-or-create-user";
import { listVaultFiles, readVaultFile, writeVaultFile } from "@/lib/vault/storage";

export async function GET() {
  try {
    const user = await getOrCreateUser();
    if (!user) {
      return Response.json({ files: [] });
    }

    try {
      const files = await listVaultFiles(user.vaultPath);
      return Response.json({ files });
    } catch {
      return Response.json({ files: [] });
    }
  } catch (error) {
    console.error("Vault files GET error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getOrCreateUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { filename, content } = body as { filename?: string; content?: string };

    if (!filename || typeof content !== "string") {
      return Response.json(
        { error: "filename and content are required" },
        { status: 400 }
      );
    }

    // Prevent path traversal
    if (filename.includes("..") || filename.startsWith("/")) {
      return Response.json({ error: "Invalid filename" }, { status: 400 });
    }

    await writeVaultFile(user.vaultPath, filename, content);
    return Response.json({ success: true });
  } catch (error) {
    console.error("Vault files PUT error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
