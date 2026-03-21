import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized", code: 401 },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const paths: string[] = body.paths;

    if (!paths || !Array.isArray(paths)) {
      return NextResponse.json(
        { error: "paths array is required", code: 400 },
        { status: 400 }
      );
    }

    for (const path of paths) {
      revalidatePath(path);
    }

    return NextResponse.json({ revalidated: true, paths });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Revalidation failed";
    return NextResponse.json({ error: message, code: 500 }, { status: 500 });
  }
}
