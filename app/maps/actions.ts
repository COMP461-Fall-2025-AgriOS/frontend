import { Map } from "@/components/maps/types";
import { revalidatePath } from "next/cache";

export async function addMap({ id, name, width, height }: Map) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/map/${id}`,
    {
      method: "POST",
      body: JSON.stringify({ name: name, width: width, height: height }),
    }
  );
  if (!res.ok) {
    throw new Error("Failed to add map");
  }
  revalidatePath("/map");
}
