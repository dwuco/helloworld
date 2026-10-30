"use client";

import { useParams, useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { DataGate } from "@/components/data-gate";
import { InventoryForm } from "@/components/inventory-form";
import { usePantry } from "@/components/pantry-provider";
import { Button, Card, ConfirmDialog, EmptyState, LinkButton, LoadingState, PageHeader } from "@/components/ui";
import type { InventoryInput } from "@/lib/types";

export default function EditItemPage() {
  return (
    <DataGate>
      <EditItem />
    </DataGate>
  );
}

function EditItem() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, mutate } = usePantry();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const item = data.inventory.find((i) => i.id === id);

  if (!item && leaving) return <LoadingState />;
  if (!item) {
    return (
      <EmptyState
        title="Item not found"
        description="It may have been deleted, possibly by someone else in your household."
        action={<LinkButton href="/inventory">Back to inventory</LinkButton>}
      />
    );
  }

  const initial: InventoryInput = {
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    location: item.location,
    category: item.category,
    expiresOn: item.expiresOn,
    lowStockThreshold: item.lowStockThreshold,
    notes: item.notes,
  };

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title={`Edit ${item.name}`}
        actions={
          <Button variant="secondary" className="text-danger" onClick={() => setConfirming(true)}>
            <Trash2 className="size-4" aria-hidden /> Delete
          </Button>
        }
      />
      <Card>
        <InventoryForm
          key={item.id}
          initial={initial}
          isNew={false}
          submitLabel="Save changes"
          onCancel={() => router.back()}
          onSubmit={async (input) => {
            const saved = await mutate((repo) => repo.updateInventory(item.id, input), { success: "Saved." });
            if (!saved) return false;
            router.push(`/inventory?location=${saved.location}`);
            return true;
          }}
        />
      </Card>
      <ConfirmDialog
        open={confirming}
        title="Delete item?"
        message={
          <>
            Remove <strong>{item.name}</strong> from your inventory? This can&apos;t be undone.
          </>
        }
        confirmLabel="Delete"
        busy={deleting}
        onCancel={() => setConfirming(false)}
        onConfirm={async () => {
          setDeleting(true);
          setLeaving(true);
          const location = item.location;
          const ok = await mutate((repo) => repo.deleteInventory(item.id).then(() => true), { success: `Deleted ${item.name}.` });
          setDeleting(false);
          setConfirming(false);
          if (ok) router.push(`/inventory?location=${location}`);
          else setLeaving(false);
        }}
      />
    </div>
  );
}
