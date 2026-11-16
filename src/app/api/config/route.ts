import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const serverYoutubeKey = Boolean(process.env.YOUTUBE_API_KEY && process.env.YOUTUBE_API_KEY.trim().length > 0);
  const serverGeminiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);

  return NextResponse.json({
    serverYoutubeKey,
    serverGeminiKey,
  });
}
