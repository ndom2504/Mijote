import { json, api } from "@/server/http";
import { searchPlaces } from "@/server/geo/repository";

export const GET = api(async (request) => {
  const term = new URL(request.url).searchParams.get("q") ?? "";
  return json(await searchPlaces(term));
});
