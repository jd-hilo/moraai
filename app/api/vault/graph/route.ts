import { getOrCreateUser } from "@/lib/get-or-create-user";
import { readAllVaultFiles } from "@/lib/vault/storage";
import { parseVaultToGraph } from "@/lib/vault/parser";

export async function GET() {
  try {
    const user = await getOrCreateUser();
    if (!user) {
      return Response.json({ nodes: [], edges: [] });
    }

    try {
      const files = await readAllVaultFiles(user.vaultPath);
      const graphData = parseVaultToGraph(files);
      return Response.json(graphData);
    } catch {
      // No vault files yet
      return Response.json({ nodes: [], edges: [] });
    }
  } catch (error) {
    console.error("Vault graph API error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
