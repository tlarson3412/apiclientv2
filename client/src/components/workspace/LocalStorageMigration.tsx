import { useState, useEffect } from "react";
import { useWorkspace } from "@/hooks/use-workspace";
import { useCollections } from "@/hooks/use-collections";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal";
import { Upload, Trash2 } from "lucide-react";

interface LegacyData {
  collections: any[];
  requests: any[];
}

function detectLegacyData(): LegacyData | null {
  try {
    const raw = localStorage.getItem("usb-api-client");
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const state = parsed?.state;
    if (!state) return null;

    const collections = state.collections || [];
    const requests = state.requests || [];

    if (collections.length === 0 && requests.length === 0) return null;

    return { collections, requests };
  } catch {
    return null;
  }
}

export function LocalStorageMigration() {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const { importCollections, isLoading: collectionsLoading } = useCollections();
  const [legacyData, setLegacyData] = useState<LegacyData | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!user || !activeWorkspace || collectionsLoading) return;

    const migrationKey = `usb-migration-done-${user.id}`;
    if (localStorage.getItem(migrationKey)) return;

    const data = detectLegacyData();
    if (data) {
      setLegacyData(data);
      setShowModal(true);
    }
  }, [user, activeWorkspace, collectionsLoading]);

  const handleImport = async () => {
    if (!legacyData || !activeWorkspace || !user) return;
    setImporting(true);

    try {
      const importData = legacyData.collections.map(col => {
        const colRequests = legacyData.requests.filter(r => r.collectionId === col.id);
        return {
          name: col.name,
          description: col.description || "",
          starred: col.starred || false,
          variables: col.variables || [],
          auth: col.auth,
          folders: col.folders || [],
          requests: colRequests,
        };
      });

      const orphanRequests = legacyData.requests.filter(r => !r.collectionId);
      if (orphanRequests.length > 0) {
        importData.push({
          name: "Imported Requests",
          description: "Requests imported from local storage",
          starred: false,
          variables: [],
          auth: undefined,
          folders: [],
          requests: orphanRequests,
        });
      }

      if (importData.length > 0) {
        await importCollections(importData);
      }

      localStorage.setItem(`usb-migration-done-${user.id}`, "true");
      setDone(true);
    } catch (err) {
      console.error("Migration failed:", err);
    } finally {
      setImporting(false);
    }
  };

  const handleSkip = () => {
    if (user) {
      localStorage.setItem(`usb-migration-done-${user.id}`, "true");
    }
    setShowModal(false);
  };

  const handleClose = () => {
    setShowModal(false);
  };

  if (!showModal) return null;

  return (
    <Modal open={showModal} onOpenChange={(v) => !v && handleClose()}>
      <ModalContent className="max-w-md">
        <ModalHeader>
          <ModalTitle>
            {done ? "Import Complete" : "Import Local Data"}
          </ModalTitle>
          <ModalDescription>
            {done
              ? "Your data has been imported to your workspace."
              : "We found existing API collections stored locally on this device."}
          </ModalDescription>
        </ModalHeader>

        <ModalBody>
          {done ? (
            <Typography variant="body-small" className="text-label-mid">
              All collections and requests are now saved to your workspace and will be available across devices.
            </Typography>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="p-3 rounded-md bg-surface-alternate-muted">
                <Typography variant="subheading-small">Found locally:</Typography>
                <ul className="mt-1 text-[13px] text-label-mid list-disc list-inside">
                  <li>{legacyData?.collections.length || 0} collection(s)</li>
                  <li>{legacyData?.requests.length || 0} request(s)</li>
                </ul>
              </div>
              <Typography variant="body-small" className="text-label-mid">
                Import them to <strong>{activeWorkspace?.name}</strong> so your team can access them?
              </Typography>
            </div>
          )}
        </ModalBody>

        {done ? (
          <ModalFooter
            buttonCount={1}
            primaryLabel="Done"
            onPrimaryClick={handleClose}
          />
        ) : (
          <ModalFooter
            buttonCount={2}
            primaryLabel={importing ? "Importing..." : "Import"}
            secondaryLabel="Skip"
            onPrimaryClick={handleImport}
            onSecondaryClick={handleSkip}
          />
        )}
      </ModalContent>
    </Modal>
  );
}
