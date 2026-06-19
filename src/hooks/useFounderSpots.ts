import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FounderSpots {
  taken: number;
  total: number;
  remaining: number;
  isOpen: boolean;
}

export function useFounderSpots() {
  return useQuery<FounderSpots>({
    queryKey: ["founder_spots"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("founder-spots");
      if (error) throw error;
      return data as FounderSpots;
    },
    refetchInterval: 30_000, // refresh every 30s for live counter feel
    staleTime: 15_000,
  });
}
