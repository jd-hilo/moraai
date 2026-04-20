import { prisma } from "@/lib/prisma";

interface ClerkWebhookEvent {
  type: string;
  data: {
    id: string;
    email_addresses?: Array<{
      email_address: string;
      id: string;
    }>;
    first_name?: string | null;
    last_name?: string | null;
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ClerkWebhookEvent;

    if (body.type === "user.created") {
      const { id: clerkId, email_addresses, first_name, last_name } = body.data;

      const email = email_addresses?.[0]?.email_address;
      if (!email) {
        return Response.json({ error: "No email found" }, { status: 400 });
      }

      const name = [first_name, last_name].filter(Boolean).join(" ") || null;
      const vaultPath = `vaults/${clerkId}/`;

      // Check if user already exists
      const existing = await prisma.user.findUnique({
        where: { clerkId },
      });

      if (!existing) {
        await prisma.user.create({
          data: {
            clerkId,
            email,
            name,
            vaultPath,
          },
        });
      }

      return Response.json({ success: true });
    }

    // Unhandled event type — acknowledge it
    return Response.json({ success: true, message: "Event type not handled" });
  } catch (error) {
    console.error("Clerk webhook error:", error);
    return Response.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
