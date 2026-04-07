import type { JsonSchema, UISchemaElement } from "@jsonforms/core";
import { JsonForms } from "@jsonforms/react";
import {
  applySchemaDefaults,
  repoAjv,
  repoCells,
  repoRenderers,
} from "@repo/jsonforms";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Textarea,
} from "@repo/ui";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { serviceTypeQueryOptions } from "../../../admin/service-types/data/service-types.query";
import {
  loadCategories,
  loadOrgUnits,
  loadServiceTypes,
  resolveCategory,
  resolveOrgUnit,
  resolveServiceType,
} from "../data/async-select-loaders";
import { useCreateService } from "../data/services.mutations";

interface CreateServiceDialogProps {
  trigger?: React.ReactNode;
  onCreated?: (svc: { id: string }) => void;
}

const selectorSchema: JsonSchema = {
  type: "object",
  properties: {
    orgUnitId: { type: "string", minLength: 1 },
    serviceTypeId: { type: "string", minLength: 1 },
  },
  required: ["orgUnitId", "serviceTypeId"],
};

const selectorUiSchema: UISchemaElement = {
  type: "VerticalLayout",
  elements: [
    {
      type: "Control",
      scope: "#/properties/orgUnitId",
      label: "Org Unit",
      options: {
        format: "asyncSelect",
        asyncSelectKey: "orgUnits",
        placeholder: "Search org units…",
      },
    },
    {
      type: "Control",
      scope: "#/properties/serviceTypeId",
      label: "Service Type",
      options: {
        format: "asyncSelect",
        asyncSelectKey: "serviceTypes",
        placeholder: "Search service types…",
      },
    },
  ],
};

const initialData = { orgUnitId: "", serviceTypeId: "" };

export function CreateServiceDialog({
  trigger,
  onCreated,
}: CreateServiceDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState(initialData);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [contentData, setContentData] = useState<Record<string, unknown>>({});
  const [resetKey, setResetKey] = useState(0);

  const createMutation = useCreateService();

  const typeId = formData.serviceTypeId;

  const { data: typeDetail, isLoading: isLoadingType } = useQuery({
    ...serviceTypeQueryOptions(typeId),
    enabled: !!typeId,
  });

  const publishedTranslation = useMemo(() => {
    if (!typeDetail?.publishedVersion?.translations) return null;
    return (
      typeDetail.publishedVersion.translations.find((t) => t.locale === "en") ??
      typeDetail.publishedVersion.translations[0] ??
      null
    );
  }, [typeDetail]);

  const contentSchema = publishedTranslation?.schema as JsonSchema | undefined;
  const contentUiSchema = publishedTranslation?.uiSchema as
    | UISchemaElement
    | undefined;

  const contentDataWithDefaults = useMemo(() => {
    if (!contentSchema || Object.keys(contentData).length > 0)
      return contentData;
    return applySchemaDefaults(
      contentSchema as Record<string, unknown>,
      contentData,
    );
  }, [contentSchema, contentData]);

  const hasPublishedVersion = !!typeDetail?.publishedVersion;
  const hasContentSchema =
    contentSchema && Object.keys(contentSchema).length > 0;

  const config = useMemo(
    () => ({
      asyncSelectLoaders: {
        orgUnits: { loadOptions: loadOrgUnits, resolveValue: resolveOrgUnit },
        serviceTypes: {
          loadOptions: loadServiceTypes,
          resolveValue: resolveServiceType,
        },
        categories: {
          loadOptions: loadCategories,
          resolveValue: resolveCategory,
        },
      },
    }),
    [],
  );

  const reset = () => {
    setFormData(initialData);
    setName("");
    setDescription("");
    setContentData({});
    setResetKey((k) => k + 1);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) reset();
  };

  const handleSelectorChange = (data: typeof initialData) => {
    if (data.serviceTypeId !== formData.serviceTypeId) {
      setContentData({});
    }
    setFormData(data);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.orgUnitId || !formData.serviceTypeId || !name.trim()) return;

    createMutation.mutate(
      {
        serviceTypeId: formData.serviceTypeId,
        orgUnitId: formData.orgUnitId,
        name: name.trim(),
        description: description.trim() || undefined,
        content:
          Object.keys(contentDataWithDefaults).length > 0
            ? contentDataWithDefaults
            : undefined,
      },
      {
        onSuccess: (result) => {
          toast.success("Service created");
          setOpen(false);
          reset();
          onCreated?.(result);
        },
        onError: (err) => {
          toast.error(`Failed to create: ${err.message}`);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Service</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <JsonForms
            key={resetKey}
            schema={selectorSchema}
            uischema={selectorUiSchema}
            data={formData}
            ajv={repoAjv}
            renderers={repoRenderers}
            cells={repoCells}
            config={config}
            onChange={({ data }) => {
              handleSelectorChange(data);
            }}
          />

          <div className="flex flex-col gap-2">
            <Label htmlFor="svc-name">Name</Label>
            <Input
              id="svc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter service name"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="svc-description">Description</Label>
            <Textarea
              id="svc-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter service description (optional)"
              rows={3}
            />
          </div>

          {typeId && isLoadingType && (
            <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
              Loading type schema…
            </div>
          )}

          {typeId && !isLoadingType && !hasPublishedVersion && (
            <div className="rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
              This service type has no published version. A version and
              translation cannot be auto-created.
            </div>
          )}

          {typeId &&
            !isLoadingType &&
            hasPublishedVersion &&
            hasContentSchema && (
              <div className="border-t pt-4">
                <h3 className="mb-2 text-sm font-medium">
                  Initial Content (English)
                </h3>
                <JsonForms
                  key={`content-${typeId}-${resetKey}`}
                  schema={contentSchema}
                  uischema={contentUiSchema}
                  data={contentDataWithDefaults}
                  ajv={repoAjv}
                  renderers={repoRenderers}
                  cells={repoCells}
                  config={config}
                  onChange={({ data }) => setContentData(data)}
                />
              </div>
            )}

          <Button
            type="submit"
            className="w-full bg-bcgov-blue hover:bg-bcgov-blue/80"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Creating…" : "Create Service"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
