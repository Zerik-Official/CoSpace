"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { PlusIcon } from "lucide-animated";
import { useTranslations } from "next-intl";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { CheckboxField, NumberField, SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { apiRequest } from "@/lib/api/client";
import { isApiErrorEnvelope } from "@/lib/api/envelope";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import { AMENITY_KEYS, type AmenityKey } from "@/lib/domain/amenities";
import { SpaceType } from "@/lib/domain/enums";
import {
  SPACE_IMAGE_ACCEPT,
  SPACE_IMAGE_MAX_BYTES,
  SPACE_IMAGE_MIME_TYPES,
  type UploadedSpaceImage,
} from "@/lib/domain/space-images";
import type { SpaceDetail } from "@/lib/domain/types";

/** Props accepted by the space form. */
export interface SpaceFormProps {
  spaceToEdit: SpaceDetail | null;
  onSaved: (space: SpaceDetail) => void;
  onCancelEdit: () => void;
}

/** Editable values of the form. */
interface SpaceFormValues {
  code: string;
  name: string;
  description: string;
  type: SpaceType;
  capacity: string;
  pricePerHour: string;
  imageUrl: string;
  amenities: AmenityKey[];
}

const EMPTY_VALUES: SpaceFormValues = {
  code: "",
  name: "",
  description: "",
  type: SpaceType.DESK,
  capacity: "1",
  pricePerHour: "25000",
  imageUrl: "/spaces/desk-a.svg",
  amenities: ["wifi"],
};

/**
 * Builds the editable values for the space received from the parent.
 *
 * @param spaceToEdit - Space being edited, or null to create a new one.
 * @returns The initial form values.
 */
function valuesFromSpace(spaceToEdit: SpaceDetail | null): SpaceFormValues {
  if (!spaceToEdit) {
    return {
      ...EMPTY_VALUES,
      amenities: [...EMPTY_VALUES.amenities],
    };
  }

  return {
    code: spaceToEdit.code,
    name: spaceToEdit.name,
    description: spaceToEdit.description,
    type: spaceToEdit.type,
    capacity: String(spaceToEdit.capacity),
    pricePerHour: String(spaceToEdit.pricePerHour),
    imageUrl: spaceToEdit.imageUrl,
    amenities: spaceToEdit.amenities.filter((amenity): amenity is AmenityKey =>
      (AMENITY_KEYS as readonly string[]).includes(amenity),
    ),
  };
}

const IMAGE_OPTIONS = [
  "/spaces/desk-a.svg",
  "/spaces/desk-b.svg",
  "/spaces/desk-c.svg",
  "/spaces/meeting-a.svg",
  "/spaces/meeting-b.svg",
  "/spaces/cabin-a.svg",
  "/spaces/cabin-b.svg",
];

/**
 * Renders the space form used to create a space or to edit an existing one.
 *
 * @param props - Space being edited, save and cancel callbacks.
 * @returns The rendered form.
 */
export function SpaceForm({ spaceToEdit, onSaved, onCancelEdit }: SpaceFormProps): ReactNode {
  const t = useTranslations("Admin");
  const tAmenities = useTranslations("Amenities");
  const tTypes = useTranslations("SpaceTypes");
  const resolveApiError = useApiErrorMessage();

  const [values, setValues] = useState<SpaceFormValues>(() => valuesFromSpace(spaceToEdit));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setImageError(null);

    if (
      file.type &&
      !(SPACE_IMAGE_MIME_TYPES as readonly string[]).includes(file.type.toLowerCase())
    ) {
      setImageError(t("imageInvalidType"));
      return;
    }

    if (file.size > SPACE_IMAGE_MAX_BYTES) {
      setImageError(t("imageTooLarge", { maxMb: Math.round(SPACE_IMAGE_MAX_BYTES / (1024 * 1024)) }));
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleRemoveFile = (): void => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(null);
    setPreviewUrl(null);
    setImageError(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const toggleAmenity = (amenity: AmenityKey): void => {
    setValues((current) => ({
      ...current,
      amenities: current.amenities.includes(amenity)
        ? current.amenities.filter((entry) => entry !== amenity)
        : [...current.amenities, amenity],
    }));
  };

  const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setImageError(null);

    let uploadedImageId: string | null = null;
    let imageUrl = values.imageUrl;

    if (selectedFile) {
      const uploadBody = new FormData();
      uploadBody.append("image", selectedFile);

      const uploadEnvelope = await apiRequest<{ image: UploadedSpaceImage }>(
        "/api/admin/spaces/images",
        { method: "POST", body: uploadBody },
      );

      if (isApiErrorEnvelope(uploadEnvelope)) {
        setIsSubmitting(false);
        setErrorMessage(resolveApiError(uploadEnvelope));
        return;
      }

      uploadedImageId = uploadEnvelope.data.image.id;
      imageUrl = uploadEnvelope.data.image.url;
    }

    const body = {
      code: values.code.trim().toUpperCase(),
      name: values.name.trim(),
      description: values.description.trim(),
      type: values.type,
      capacity: Number(values.capacity),
      pricePerHour: Number(values.pricePerHour),
      imageUrl,
      amenities: values.amenities,
    };

    const envelope = spaceToEdit
      ? await apiRequest<{ space: SpaceDetail }>(`/api/admin/spaces/${spaceToEdit.id}`, {
          method: "PATCH",
          body,
        })
      : await apiRequest<{ space: SpaceDetail }>("/api/admin/spaces", { method: "POST", body });

    setIsSubmitting(false);

    if (isApiErrorEnvelope(envelope)) {
      if (uploadedImageId) {
        await apiRequest(`/api/admin/spaces/images/${uploadedImageId}`, { method: "DELETE" });
      }

      setErrorMessage(resolveApiError(envelope));
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(null);
    setPreviewUrl(null);
    setImageError(null);
    onSaved(envelope.data.space);

    if (!spaceToEdit) {
      setValues(valuesFromSpace(null));
    }
  };

  const originalUploadedImage =
    spaceToEdit && !IMAGE_OPTIONS.includes(spaceToEdit.imageUrl) ? spaceToEdit.imageUrl : null;
  const imageChoices = Array.from(
    new Set([
      ...(IMAGE_OPTIONS.includes(values.imageUrl) ? [] : [values.imageUrl]),
      ...(originalUploadedImage ? [originalUploadedImage] : []),
      ...IMAGE_OPTIONS,
    ]),
  );

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-5"
    >
      <h2 className="flex items-center gap-2.5 font-display text-[1.15rem] text-ink">
        {spaceToEdit ? null : <PlusIcon size={18} className="text-pine" animateOnHover />}
        {spaceToEdit ? t("formEditTitle", { code: spaceToEdit.code }) : t("formCreateTitle")}
      </h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          name="code"
          label={t("codeLabel")}
          hint={t("codeHint")}
          required
          value={values.code}
          onChange={(event) => setValues((current) => ({ ...current, code: event.target.value }))}
        />
        <TextField
          name="name"
          label={t("nameLabel")}
          required
          value={values.name}
          onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
        />
      </div>

      <TextAreaField
        name="description"
        label={t("descriptionLabel")}
        required
        value={values.description}
        onChange={(event) =>
          setValues((current) => ({ ...current, description: event.target.value }))
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <SelectField
          name="type"
          label={t("typeLabel")}
          value={values.type}
          onChange={(event) =>
            setValues((current) => ({ ...current, type: event.target.value as SpaceType }))
          }
          options={Object.values(SpaceType).map((type) => ({
            value: type,
            label: tTypes(type),
          }))}
        />
        <NumberField
          name="capacity"
          label={t("capacityLabel")}
          min={1}
          max={100}
          required
          value={values.capacity}
          onChange={(event) =>
            setValues((current) => ({ ...current, capacity: event.target.value }))
          }
        />
        <NumberField
          name="pricePerHour"
          label={t("priceLabel")}
          min={1}
          step={1000}
          required
          value={values.pricePerHour}
          onChange={(event) =>
            setValues((current) => ({ ...current, pricePerHour: event.target.value }))
          }
        />
      </div>

      <fieldset className="flex flex-col gap-2.5">
        <legend className="mb-1 text-[0.8rem] font-medium text-ink-soft">
          {t("imageLabel")}
        </legend>

        <div className="relative aspect-[16/9] overflow-hidden rounded-[var(--radius-card)] border border-line bg-paper">
          <Image
            src={previewUrl ?? values.imageUrl}
            alt={t("imagePreviewAlt")}
            fill
            unoptimized
            sizes="(min-width: 640px) 24rem, 100vw"
            className="object-cover"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label
            htmlFor="space-image-upload"
            className="inline-flex h-9 cursor-pointer items-center justify-center rounded-[var(--radius-card)] border border-line bg-surface px-3.5 text-[0.85rem] font-medium text-ink transition-colors hover:border-line-strong hover:bg-paper"
          >
            {selectedFile ? t("imageReplace") : t("imageUpload")}
          </label>
          <input
            ref={fileInputRef}
            id="space-image-upload"
            type="file"
            accept={SPACE_IMAGE_ACCEPT}
            className="sr-only"
            disabled={isSubmitting}
            onChange={handleFileChange}
          />
          {selectedFile ? (
            <Button
              variant="quiet"
              size="sm"
              disabled={isSubmitting}
              onClick={handleRemoveFile}
            >
              {t("imageRemove")}
            </Button>
          ) : null}
        </div>

        <p className="text-[0.8rem] text-ink-soft">
          {selectedFile
            ? t("imageSelectedHint", { name: selectedFile.name })
            : t("imageUploadHint", { maxMb: Math.round(SPACE_IMAGE_MAX_BYTES / (1024 * 1024)) })}
        </p>

        {!selectedFile ? (
          <SelectField
            name="imageUrl"
            label={t("imagePresetLabel")}
            hint={t("imageHint")}
            value={values.imageUrl}
            onChange={(event) =>
              setValues((current) => ({ ...current, imageUrl: event.target.value }))
            }
            options={imageChoices.map((image) => ({
              value: image,
              label:
                image === values.imageUrl && !IMAGE_OPTIONS.includes(image)
                  ? t("imageCurrent")
                  : image === originalUploadedImage
                    ? t("imageOriginal")
                    : image,
            }))}
          />
        ) : null}

        {imageError ? <Alert tone="error">{imageError}</Alert> : null}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-[0.8rem] font-medium text-ink-soft">
          {t("amenitiesLabel")}
        </legend>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {AMENITY_KEYS.map((amenity) => (
            <CheckboxField
              key={amenity}
              name={`amenity-${amenity}`}
              label={tAmenities(amenity)}
              checked={values.amenities.includes(amenity)}
              onChange={() => toggleAmenity(amenity)}
            />
          ))}
        </div>
      </fieldset>

      {errorMessage ? <Alert tone="error">{errorMessage}</Alert> : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {spaceToEdit ? t("updateSubmit") : t("createSubmit")}
        </Button>
        {spaceToEdit ? (
          <Button variant="quiet" onClick={onCancelEdit}>
            {t("cancelEdit")}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
