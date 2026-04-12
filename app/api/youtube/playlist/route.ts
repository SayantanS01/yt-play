import { NextRequest, NextResponse } from "next/server";
import { getPlaylistMetadata } from "@/lib/youtube";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 });

    const videos = await getPlaylistMetadata(url);
    return NextResponse.json({ videos });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
