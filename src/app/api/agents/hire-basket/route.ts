import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "This endpoint has been deprecated. Please use /pricing to subscribe to a plan." },
    { status: 410 },
  );
}
