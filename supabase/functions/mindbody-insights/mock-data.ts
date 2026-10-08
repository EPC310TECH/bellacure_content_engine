export type LocationInsight = {
  location_id: string;
  location_name: string;
  sample_period: string;
  appointments_booked: number;
  open_slots_next_7_days: number;
  booking_fill_rate_percent: number;
  top_services: Array<{ service: string; bookings: number }>;
  busiest_day: string;
  busiest_time_block: string;
  content_opportunity: string;
};

const MOCK_INSIGHTS: LocationInsight[] = [
  {
    location_id: "beverly-hills",
    location_name: "Beverly Hills",
    sample_period: "Illustrative rolling 7-day sample",
    appointments_booked: 164,
    open_slots_next_7_days: 38,
    booking_fill_rate_percent: 81,
    top_services: [
      { service: "Structured gel manicure", bookings: 34 },
      { service: "Classic manicure", bookings: 28 },
      { service: "Nail art add-on", bookings: 19 },
    ],
    busiest_day: "Saturday",
    busiest_time_block: "11 AM–2 PM",
    content_opportunity: "Show a close-up structured-gel transformation.",
  },
  {
    location_id: "brentwood-village",
    location_name: "Brentwood Village",
    sample_period: "Illustrative rolling 7-day sample",
    appointments_booked: 137,
    open_slots_next_7_days: 46,
    booking_fill_rate_percent: 75,
    top_services: [
      { service: "Classic manicure", bookings: 31 },
      { service: "Structured gel manicure", bookings: 25 },
      { service: "Nail art add-on", bookings: 16 },
    ],
    busiest_day: "Friday",
    busiest_time_block: "12–3 PM",
    content_opportunity: "Feature a polished, low-maintenance weekday look.",
  },
  {
    location_id: "larchmont-village",
    location_name: "Larchmont Village",
    sample_period: "Illustrative rolling 7-day sample",
    appointments_booked: 128,
    open_slots_next_7_days: 51,
    booking_fill_rate_percent: 72,
    top_services: [
      { service: "Classic manicure", bookings: 29 },
      { service: "Structured gel manicure", bookings: 24 },
      { service: "Nail art add-on", bookings: 18 },
    ],
    busiest_day: "Saturday",
    busiest_time_block: "10 AM–1 PM",
    content_opportunity:
      "Pair a neighborhood-inspired palette with a classic set.",
  },
  {
    location_id: "santa-monica",
    location_name: "Santa Monica",
    sample_period: "Illustrative rolling 7-day sample",
    appointments_booked: 151,
    open_slots_next_7_days: 42,
    booking_fill_rate_percent: 79,
    top_services: [
      { service: "Structured gel manicure", bookings: 32 },
      { service: "Nail art add-on", bookings: 26 },
      { service: "Classic manicure", bookings: 23 },
    ],
    busiest_day: "Friday",
    busiest_time_block: "1–4 PM",
    content_opportunity: "Shoot reflective finishes in soft coastal daylight.",
  },
  {
    location_id: "south-bay",
    location_name: "South Bay",
    sample_period: "Illustrative rolling 7-day sample",
    appointments_booked: 119,
    open_slots_next_7_days: 58,
    booking_fill_rate_percent: 67,
    top_services: [
      { service: "Classic manicure", bookings: 27 },
      { service: "Structured gel manicure", bookings: 21 },
      { service: "Nail art add-on", bookings: 15 },
    ],
    busiest_day: "Saturday",
    busiest_time_block: "10 AM–12 PM",
    content_opportunity:
      "Highlight durable, easy-to-wear sets for a busy week.",
  },
  {
    location_id: "studio-city",
    location_name: "Studio City",
    sample_period: "Illustrative rolling 7-day sample",
    appointments_booked: 143,
    open_slots_next_7_days: 44,
    booking_fill_rate_percent: 76,
    top_services: [
      { service: "Nail art add-on", bookings: 30 },
      { service: "Structured gel manicure", bookings: 27 },
      { service: "Classic manicure", bookings: 22 },
    ],
    busiest_day: "Thursday",
    busiest_time_block: "2–5 PM",
    content_opportunity:
      "Use a short nail-art detail reveal as the opening shot.",
  },
  {
    location_id: "sunset",
    location_name: "Sunset",
    sample_period: "Illustrative rolling 7-day sample",
    appointments_booked: 158,
    open_slots_next_7_days: 36,
    booking_fill_rate_percent: 82,
    top_services: [
      { service: "Structured gel manicure", bookings: 33 },
      { service: "Nail art add-on", bookings: 29 },
      { service: "Classic manicure", bookings: 24 },
    ],
    busiest_day: "Friday",
    busiest_time_block: "3–6 PM",
    content_opportunity: "Capture a glossy evening-ready finish in warm light.",
  },
];

export function getMockInsights(): LocationInsight[];
export function getMockInsights(locationId: string): LocationInsight[] | null;
export function getMockInsights(
  locationId: string | null,
): LocationInsight[] | null;
export function getMockInsights(locationId: string | null = null) {
  if (locationId === null) return MOCK_INSIGHTS;
  const insight = MOCK_INSIGHTS.find((item) => item.location_id === locationId);
  return insight ? [insight] : null;
}
