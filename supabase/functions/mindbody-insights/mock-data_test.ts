import { assertEquals } from "jsr:@std/assert@1.0.14";
import { getMockInsights } from "./mock-data.ts";

Deno.test("returns mock insights for all seven salons", () => {
  const insights = getMockInsights();

  assertEquals(insights.length, 7);
  assertEquals(
    insights.map((insight) => insight.location_name),
    [
      "Beverly Hills",
      "Brentwood Village",
      "Larchmont Village",
      "Santa Monica",
      "South Bay",
      "Studio City",
      "Sunset",
    ],
  );
  assertEquals(
    insights.every((insight) =>
      insight.sample_period.startsWith("Illustrative") &&
      insight.appointments_booked > 0 &&
      insight.booking_fill_rate_percent >= 0 &&
      insight.booking_fill_rate_percent <= 100 &&
      insight.top_services.length > 0
    ),
    true,
  );
});

Deno.test("filters insights by a known location slug", () => {
  const insights = getMockInsights("santa-monica");

  assertEquals(insights?.length, 1);
  assertEquals(insights?.[0].location_name, "Santa Monica");
});

Deno.test("returns null for an unknown location slug", () => {
  assertEquals(getMockInsights("not-a-salon"), null);
});
