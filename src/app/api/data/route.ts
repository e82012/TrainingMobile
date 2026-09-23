import { NextResponse } from "next/server";
import { fetchDashboardData } from "@/lib/sheets";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await fetchDashboardData();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("API /api/data error:", error);
    return NextResponse.json(
      { error: "無法讀取訓練資料", message: error.message },
      { status: 500 }
    );
  }
}
