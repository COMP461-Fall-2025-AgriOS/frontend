import { NextResponse } from "next/server";

function getBackendUrl() {
  const url = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
  return url ?? "http://localhost:3001";
}

export async function GET() {
  try {
    const res = await fetch(`${getBackendUrl()}/robots/`, {
      cache: "no-store",
    });
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: {
        "content-type": res.headers.get("content-type") || "application/json",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to fetch robots" },
      { status: 502 }
    );
  }
}

export async function DELETE() {
  try {
    const res = await fetch(`${getBackendUrl()}/robots/`, { method: "DELETE" });
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: {
        "content-type": res.headers.get("content-type") || "application/json",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to delete robots" },
      { status: 502 }
    );
  }
}
