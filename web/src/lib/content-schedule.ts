export type Season = "Fall" | "Winter" | "Spring" | "Summer";

export type ThemeCycle = {
  cycle_number: number;
  season: Season;
  style_name: string;
  technique_and_finish: string;
  color_palette: string;
};

export type ScheduleEntry = ThemeCycle & {
  id: string;
  location_id: string;
  scheduled_for: string;
};

export const scheduleStartDate = "2026-10-06";
export const scheduleIntervalDays = 21;

export const themeCycles: ThemeCycle[] = [
  { cycle_number: 1, season: "Fall", style_name: "Tactile Crocodile Art", technique_and_finish: "3D sculpted texture, builder gel", color_palette: "Deep dark plum" },
  { cycle_number: 2, season: "Fall", style_name: "Transition Deepening", technique_and_finish: "High-gloss, precise Russian manicure cuticle lines", color_palette: "Rich espresso brown" },
  { cycle_number: 3, season: "Fall", style_name: "High-Gloss Vampy Plum", technique_and_finish: "Ultra-glossy top coat", color_palette: "Deep burgundies and near-black plum" },
  { cycle_number: 4, season: "Winter", style_name: "Heavy Metal Shimmer", technique_and_finish: "Platinum chrome line work over hardgel base", color_palette: "Platinum silver and sheer nude" },
  { cycle_number: 5, season: "Winter", style_name: "Reflective Charcoal Velvet", technique_and_finish: "Magnetic gel wands, velvet finish", color_palette: "Gunmetal shimmer and deep charcoal" },
  { cycle_number: 6, season: "Winter", style_name: "High-End Matte Espresso", technique_and_finish: "Ultra-matte top coat", color_palette: "Deep espresso brown" },
  { cycle_number: 7, season: "Winter", style_name: "Low-Profile Charcoal", technique_and_finish: "Flat, low-sheen finish", color_palette: "Dark industrial charcoal" },
  { cycle_number: 8, season: "Winter", style_name: "Sapphire Jewel Tones", technique_and_finish: "Meticulous hardgel base, high-gloss top coat", color_palette: "Deep sapphire blue" },
  { cycle_number: 9, season: "Winter", style_name: "Ceramic 3D Structures", technique_and_finish: "Minimalist raised 3D lines, ceramic effect finish", color_palette: "Opaque chalk white and structural neutrals" },
  { cycle_number: 10, season: "Spring", style_name: "The 'Clean Girl' Refresh", technique_and_finish: "Flawless dry cuticle prep, sheer overlay", color_palette: "Milky lavender veil" },
  { cycle_number: 11, season: "Spring", style_name: "Hardgel Mauve Veil", technique_and_finish: "Ultra-clean minimalist overlay", color_palette: "Cool grey-mauve" },
  { cycle_number: 12, season: "Spring", style_name: "Coachella Melted Metallics", technique_and_finish: "Liquid-style 3D sculpting", color_palette: "Molten silver accents" },
  { cycle_number: 13, season: "Spring", style_name: "Cyber-Streetwear Graphics", technique_and_finish: "Clear builder gel droplets", color_palette: "Transparent gloss over bare nail bed" },
  { cycle_number: 14, season: "Spring", style_name: "Matte Moss & Earth", technique_and_finish: "Flat, satin-finish top coat", color_palette: "Low-saturation olive greens" },
  { cycle_number: 15, season: "Spring", style_name: "Concrete Grey Satin", technique_and_finish: "Smooth architectural finish", color_palette: "Muted concrete grey" },
  { cycle_number: 16, season: "Summer", style_name: "Velvet June Gloom", technique_and_finish: "Reflective magnetic gel manipulation", color_palette: "Sapphire blue and overcast grey shift" },
  { cycle_number: 17, season: "Summer", style_name: "Glazed Citrus Chrome", technique_and_finish: "Ultra-reflective chrome powder overlay", color_palette: "Milky vanilla and soft peach base with orange-gold chrome" },
  { cycle_number: 18, season: "Summer", style_name: "Molten Chocolate Chrome", technique_and_finish: "Heavy dark metallic chrome top coat", color_palette: "Rich reflective chocolate brown" },
];

export function cycleDate(cycleNumber: number) {
  const date = new Date(`${scheduleStartDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + (cycleNumber - 1) * scheduleIntervalDays);
  return date.toISOString().slice(0, 10);
}

export function demoSchedule(locationIds: string[]): ScheduleEntry[] {
  return locationIds.flatMap((locationId) =>
    themeCycles.map((theme) => ({
      ...theme,
      id: `${locationId}-cycle-${theme.cycle_number}`,
      location_id: locationId,
      scheduled_for: cycleDate(theme.cycle_number),
    })),
  );
}
