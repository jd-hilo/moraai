import { prisma } from "@/lib/prisma";
import { writeMultipleVaultFiles } from "@/lib/vault/storage";
import { generateVaultFiles } from "@/lib/vault/writer";
import { extractEntitiesFromBatch } from "./extract";
import { mergeEntities } from "./merge";
import type { ParsedConversation, ExtractedEntity } from "@/lib/vault/types";

/**
 * Run the full import pipeline: extract, merge, generate, write.
 */
export async function runImportPipeline(
  userId: string,
  vaultPath: string,
  conversations: ParsedConversation[],
  onProgress: (msg: string) => void
): Promise<void> {
  onProgress(`Found ${conversations.length} conversations to process.`);

  // 1. Batch conversations into groups of 10
  const batchSize = 10;
  const batches: ParsedConversation[][] = [];
  for (let i = 0; i < conversations.length; i += batchSize) {
    batches.push(conversations.slice(i, i + batchSize));
  }

  onProgress(`Processing ${batches.length} batches...`);

  // 2. Extract entities from each batch in parallel
  const allEntities: ExtractedEntity[] = [];
  const extractionPromises = batches.map(async (batch, i) => {
    onProgress(`Extracting knowledge from batch ${i + 1}/${batches.length}...`);
    const entities = await extractEntitiesFromBatch(batch);
    return entities;
  });

  const batchResults = await Promise.all(extractionPromises);
  for (const entities of batchResults) {
    allEntities.push(...entities);
  }

  onProgress(`Extracted ${allEntities.length} entities. Merging duplicates...`);

  // 3. Merge entities
  const { entities: mergedEntities, user_name } = await mergeEntities(allEntities);

  onProgress(
    `Merged into ${mergedEntities.length} unique entities.${user_name ? ` Hello, ${user_name}.` : ""}`
  );

  // 4. Generate vault files
  onProgress("Building your memory vault...");
  const vaultFiles = generateVaultFiles(mergedEntities);

  onProgress(`Generated ${vaultFiles.length} vault files. Writing to storage...`);

  // 5. Write to S3
  await writeMultipleVaultFiles(vaultPath, vaultFiles);

  // 6. Update user record
  await prisma.user.update({
    where: { id: userId },
    data: {
      onboardingComplete: true,
      importStatus: "complete",
    },
  });

  onProgress("Done. I know you now.");
}
