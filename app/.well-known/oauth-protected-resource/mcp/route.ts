import {
  metadataCorsOptionsRequestHandler,
  protectedResourceHandlerClerk,
} from "@clerk/mcp-tools/next";

const handler = protectedResourceHandlerClerk({
  scopes_supported: ["profile", "email"],
});
const options = metadataCorsOptionsRequestHandler();

export { handler as GET, options as OPTIONS };
