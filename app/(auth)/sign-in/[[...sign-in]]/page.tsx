import { SignIn } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Image from "next/image";

export default async function SignInPage() {
  const { userId } = await auth();
  if (userId) redirect("/chat");
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(180deg, #fafaf8 0%, #f5f0ff 60%, #fafaf8 100%)",
        padding: "24px",
        gap: "32px",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "fixed",
          top: "10%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "80vw",
          height: "60vh",
          background:
            "radial-gradient(ellipse 60% 50% at 50% 40%, rgba(198,166,240,0.35) 0%, rgba(255,198,225,0.25) 50%, transparent 80%)",
          filter: "blur(32px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "32px" }}>
        <Image
          src="/mora-logo.png"
          alt="Mora"
          width={140}
          height={46}
          style={{ height: 38, width: "auto" }}
          priority
        />
        <SignIn forceRedirectUrl="/chat" />
      </div>
    </div>
  );
}
