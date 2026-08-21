import { supabase } from "@/lib/supabase/client";

export async function fetchLocations(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from("md_locations")
      .select("id, name, location_id, code, type, city, province")
      .order("name", { ascending: true });

    if (error) {
      console.warn("fetchLocations error:", error.message);
      return [];
    }

    return ((data as any[]) || []).map((loc: any) => ({
      ...loc,
      location_id: loc.location_id || loc.id,
    }));
  } catch (err) {
    console.error("fetchLocations exception:", err);
    return [];
  }
}
