import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type CaptureInput } from "@shared/routes";

export function useCaptures() {
  return useQuery({
    queryKey: [api.captures.list.path],
    queryFn: async () => {
      const res = await fetch(api.captures.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch captures");
      return api.captures.list.responses[200].parse(await res.json());
    },
  });
}

export function useCapture(id: number) {
  return useQuery({
    queryKey: [api.captures.get.path, id],
    queryFn: async () => {
      const url = api.captures.get.path.replace(":id", String(id));
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch capture");
      return api.captures.get.responses[200].parse(await res.json());
    },
  });
}

export function useCreateCapture() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CaptureInput) => {
      const validated = api.captures.create.input.parse(data);
      const res = await fetch(api.captures.create.path, {
        method: api.captures.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.captures.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to save capture");
      }
      return api.captures.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.captures.list.path] });
    },
  });
}
