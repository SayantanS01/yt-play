import { NextRequest, NextResponse } from "next/server";
import { getStreamUrl } from "@/lib/youtube";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

  try {
    const url = await getStreamUrl(id);
    const proxyUrl = `/api/youtube/proxy?url=${encodeURIComponent(url)}&type=stream`;
    return NextResponse.json({ url: proxyUrl });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
