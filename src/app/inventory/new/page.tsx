"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { DataGate } from "@/components/data-gate";
import { InventoryForm, emptyInventoryInput } from "@/components/inventory-form";
import { usePantry } from "@/components/pantry-provider";
import { Card, LoadingState, PageHeader } from "@/components/ui";
import { LOCATIONS, type StorageLocation } from "@/lib/types";

export default function NewItemPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <DataGate>
        <NewItem />
      </DataGate>
    </Suspense>
  );
}

function NewItem() {
  const router = useRouter();
  const params = useSearchParams();
  const { mutate } = usePantry();
  const loc = params.get("location");
  const location: StorageLocation = LOCATIONS.includes(loc as StorageLocation) ? (loc as StorageLocation) : "fridge";

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Add Food" description="Add an item to your fridge, freezer or pantry." />
      <Card>
        <InventoryForm
          initial={emptyInventoryInput(location)}
          isNew
          submitLabel="Save item"
          onCancel={() => router.back()}
          onSubmit={async (input, { addAnother }) => {
            const created = await mutate((repo) => repo.createInventory(input), { success: `Added ${input.name}.` });
            if (!created) return false;
            if (!addAnother) router.push(`/inventory?location=${created.location}`);
            return true;
          }}
        />
      </Card>
    </div>
  );
}
