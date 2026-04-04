import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/storeadmin/server/auth";
import { searchCustomersByConditions } from "@/lib/storeadmin/server/database";
import { parseNlFilter, buildSupabaseQueryFromConditions, runInference } from "@/lib/storeadmin/server/nl-filter";

export async function POST(request: NextRequest) {
  try {
    await authenticateRequest(request);
    const { filter_text } = await request.json();

    const filterResult = await parseNlFilter(filter_text);

    if (!filterResult.success) {
      return NextResponse.json({
        success: false,
        error: filterResult.error,
        suggestion: filterResult.suggestion,
        customers: [],
        inference_caution: null,
        inferred_fields: [],
      });
    }

    const conditions = filterResult.conditions;
    const inferredFields = filterResult.inferred_fields;

    let customers: Array<Record<string, unknown>>;
    if (conditions.length) {
      const queryInfo = buildSupabaseQueryFromConditions(conditions);
      customers = await searchCustomersByConditions(queryInfo.simple_filters, queryInfo.computed_filters);
    } else {
      customers = await searchCustomersByConditions([], []);
    }

    if (inferredFields.length) {
      customers = await runInference(customers, inferredFields);
    }

    return NextResponse.json({
      success: true,
      customers,
      count: customers.length,
      filter_conditions: conditions,
      raw_ai_response: filterResult.raw_response,
      inference_caution: filterResult.inference_caution,
      inferred_fields: inferredFields,
    });
  } catch {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }
}
