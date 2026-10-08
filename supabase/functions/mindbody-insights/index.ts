import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { getMockInsights } from "./mock-data.ts";

export default {
  fetch: withSupabase({ auth: "user" }, async (req) => {
    if (req.method !== "POST") {
      return Response.json(
        { error: "Method not allowed. Use POST." },
        { status: 405, headers: { Allow: "POST" } },
      );
    }

    let body: { location_id?: unknown };
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "Request body must be valid JSON." }, {
        status: 400,
      });
    }
    if (
      body.location_id !== undefined && typeof body.location_id !== "string"
    ) {
      return Response.json({ error: "location_id must be a string." }, {
        status: 400,
      });
    }

    const locationId = body.location_id ?? null;
    const insights = getMockInsights(locationId);

    if (!insights) {
      return Response.json(
        { error: "Unknown mock location_id." },
        { status: 400 },
      );
    }

    return Response.json({
      source: "mock",
      is_mock_data: true,
      generated_at: new Date().toISOString(),
      privacy: {
        aggregated: true,
        includes_customer_data: false,
      },
      notice: "Illustrative sample only; no Mindbody API was contacted.",
      locations: insights,
    });
  }),
};
