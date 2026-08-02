import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

/*
 * Client-upload token exchange for pitch/work video files (owner's ask
 * 2026-08-02: creatives upload the clip from their phone instead of hosting
 * it somewhere first). The browser uploads STRAIGHT to Blob storage with a
 * token minted here — the file never rides through a serverless function,
 * so phone-sized videos clear the platform's request-size limit. Tokens are
 * minted only for logged-in talent, video-only, size-capped. The media ROW
 * is registered by the follow-up server action, which is the same moderated
 * pending-first path as link media — uploads get no shortcut around review.
 */

const MAX_BYTES = 200 * 1024 * 1024; // 200MB — a phone-shot clip, not a film

export async function POST(request: Request): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user || user.role !== "talent") {
    return NextResponse.json({ error: "not allowed" }, { status: 403 });
  }

  const body = (await request.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [
          "video/mp4",
          "video/quicktime",
          "video/webm",
          "video/x-m4v",
        ],
        maximumSizeInBytes: MAX_BYTES,
        addRandomSuffix: true,
        // Scope object keys by user so nothing collides or overwrites.
        tokenPayload: user.id,
      }),
      onUploadCompleted: async () => {
        // Row registration happens via the registerUploadedPitch server
        // action from the client, which re-checks the session.
      },
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 400 },
    );
  }
}
