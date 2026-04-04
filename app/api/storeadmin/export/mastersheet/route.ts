import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/storeadmin/server/auth";
import { getDb } from "@/lib/storeadmin/server/database";
import ExcelJS from "exceljs";

export async function GET(request: NextRequest) {
  try {
    await authenticateRequest(request);

    const db = getDb();

    const { data: orders } = await db
      .from("orders")
      .select("*, customers(name, phone, instagram), artists(name)")
      .order("order_date");

    const { data: expenses } = await db
      .from("expenses")
      .select("*")
      .order("expense_date");

    const wb = new ExcelJS.Workbook();

    // Business Sheet
    const wsBiz = wb.addWorksheet("Business");
    wsBiz.addRow(["Date", "Artist", "Customer Name", "Phone", "Instagram", "Service / Product", "Mode of Payment", "Deposit", "Total", "Comments", "Source"]);
    for (const o of orders ?? []) {
      const customer = (o.customers as Record<string, unknown>) ?? {};
      const artist = (o.artists as Record<string, unknown>) ?? {};
      wsBiz.addRow([
        o.order_date ?? "",
        artist.name ?? "",
        customer.name ?? "",
        customer.phone ?? "",
        customer.instagram ?? "",
        o.service_description ?? "",
        o.payment_mode ?? "",
        Number(o.deposit ?? 0),
        Number(o.total ?? 0),
        o.comments ?? "",
        o.source ?? "",
      ]);
    }

    // Petty Sheet
    const wsPetty = wb.addWorksheet("Petty");
    wsPetty.addRow(["Date", "Type of Expense", "Debit", "Credit", "Balance", "Comments"]);
    for (const e of expenses ?? []) {
      wsPetty.addRow([
        e.expense_date ?? "",
        e.description ?? "",
        Number(e.amount ?? 0),
        "",
        "",
        e.raw_input ?? "",
      ]);
    }

    const buffer = await wb.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.xlsx",
        "Content-Disposition": "attachment; filename=PsyShot_Mastersheet.xlsx",
      },
    });
  } catch {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }
}
