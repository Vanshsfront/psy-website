import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// TODO: Integrate Razorpay when credentials are available
export async function POST(req: NextRequest) {
  return NextResponse.json(
    { error: "Payment integration not yet configured" },
    { status: 501 }
  )
}
