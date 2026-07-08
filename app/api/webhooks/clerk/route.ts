import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  let event;
  try {
    event = await verifyWebhook(request);
  } catch (error) {
    console.error("Clerk webhook verification failed:", error);
    return Response.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  try {
    if (event.type === "user.created") {
      const {
        id: clerkId,
        email_addresses,
        primary_email_address_id,
        first_name,
        last_name,
      } = event.data;

      const primaryEmail = email_addresses.find(
        ({ id }) => id === primary_email_address_id
      );
      if (
        !primaryEmail ||
        primaryEmail.verification?.status !== "verified"
      ) {
        // Account resolution will retry through Clerk after verification.
        return Response.json({ success: true, accountCreationPending: true });
      }

      const email = primaryEmail.email_address.trim().toLowerCase();
      const name = [first_name, last_name].filter(Boolean).join(" ") || null;
      const vaultPath = `vaults/${clerkId}/`;

      const [existing, existingByEmail] = await Promise.all([
        prisma.user.findUnique({ where: { clerkId } }),
        prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } }),
      ]);

      if (!existing && !existingByEmail) {
        try {
          await prisma.user.create({
            data: { clerkId, email, name, vaultPath },
          });
        } catch (error) {
          if (
            typeof error !== "object" ||
            error === null ||
            !("code" in error) ||
            error.code !== "P2002"
          ) {
            throw error;
          }
          const racedUser = await prisma.user.findFirst({
            where: { OR: [{ clerkId }, { email }] },
          });
          if (!racedUser) throw error;
        }
      }

      // A legacy row with the same email is intentionally not relinked here.
      // This webhook does not establish interactive ownership; the authenticated
      // resolver performs the verified-email migration on the user's next request.
      return Response.json({
        success: true,
        accountLinkPending: Boolean(existingByEmail && existingByEmail.clerkId !== clerkId),
      });
    }

    // Unhandled event type — acknowledge it
    return Response.json({ success: true, message: "Event type not handled" });
  } catch (error) {
    console.error("Clerk webhook processing failed:", error);
    return Response.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
