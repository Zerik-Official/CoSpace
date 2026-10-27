"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { LuPencil, LuTriangleAlert } from "react-icons/lu";
import { SettingsIcon } from "lucide-animated";
import { useLocale, useTranslations } from "next-intl";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AdminReservationsTable } from "@/components/admin/AdminReservationsTable";
import { SpaceForm } from "@/components/admin/SpaceForm";
import { spaceTypeIcon, SPACE_TYPE_MESSAGE_KEYS } from "@/components/spaces/SpaceTypeMeta";
import { apiRequest } from "@/lib/api/client";
import { getApiErrorMessage, isApiErrorEnvelope } from "@/lib/api/envelope";
import type { AdminReservationDetail, AdminSpaceEntry, SpaceDetail } from "@/lib/domain/types";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

/**
 * Renders the administrator panel: the catalog with its create, edit and
 * deactivate actions, plus the confirmed reservations that are still ahead.
 *
 * @returns The rendered administration panel.
 */
export function AdminPanel(): ReactNode {
  const t = useTranslations("Admin");
  const tCommon = useTranslations("Common");
  const tTypes = useTranslations("SpaceTypes");
  const locale = useLocale();

  const [spaces, setSpaces] = useState<AdminSpaceEntry[]>([]);
  const [reservations, setReservations] = useState<AdminReservationDetail[]>([]);
  const [spaceToEdit, setSpaceToEdit] = useState<SpaceDetail | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const translate = useCallback(
    (key: string, params?: Record<string, string | number>): string =>
      t(key as never, params as never),
    [t],
  );

  const loadPanel = useCallback(async (): Promise<void> => {
    const [spacesEnvelope, reservationsEnvelope] = await Promise.all([
      apiRequest<{ spaces: AdminSpaceEntry[] }>("/api/admin/spaces"),
      apiRequest<{ reservations: AdminReservationDetail[] }>("/api/admin/reservations"),
    ]);

    if (isApiErrorEnvelope(spacesEnvelope)) {
      setErrorMessage(getApiErrorMessage(spacesEnvelope, translate));
    } else {
      setSpaces(spacesEnvelope.data.spaces);
      setErrorMessage(null);
    }

    if (!isApiErrorEnvelope(reservationsEnvelope)) {
      setReservations(reservationsEnvelope.data.reservations);
    }

    setIsLoading(false);
  }, [translate]);

  useEffect(() => {
    void loadPanel();
  }, [loadPanel]);

  const handleSaved = (space: SpaceDetail): void => {
    setSpaces((current) => {
      const existing = current.find((entry) => entry.id === space.id);
      if (existing) {
        return current.map((entry) =>
          entry.id === space.id ? { ...space, upcomingReservations: entry.upcomingReservations } : entry,
        );
      }

      return [...current, { ...space, upcomingReservations: 0 }];
    });
    setSpaceToEdit(null);
  };

  const handleDeactivate = async (spaceId: string): Promise<void> => {
    setDeactivatingId(spaceId);
    const envelope = await apiRequest<{ space: SpaceDetail }>(`/api/admin/spaces/${spaceId}`, {
      method: "DELETE",
    });
    setDeactivatingId(null);

    if (isApiErrorEnvelope(envelope)) {
      setErrorMessage(getApiErrorMessage(envelope, translate));
      return;
    }

    setSpaces((current) =>
      current.map((entry) =>
        entry.id === spaceId ? { ...entry, isActive: false } : entry,
      ),
    );
    setErrorMessage(null);
  };

  const handleCancelReservation = async (reservationId: string): Promise<void> => {
    setCancellingId(reservationId);
    const envelope = await apiRequest<{ reservation: AdminReservationDetail }>(
      `/api/reservations/${reservationId}`,
      { method: "DELETE" },
    );
    setCancellingId(null);

    if (isApiErrorEnvelope(envelope)) {
      setErrorMessage(getApiErrorMessage(envelope, translate));
      return;
    }

    setReservations((current) =>
      current.filter((reservation) => reservation.id !== reservationId),
    );
    setSpaces((current) =>
      current.map((entry) => ({
        ...entry,
        upcomingReservations: Math.max(
          0,
          entry.upcomingReservations -
            (reservations.find((reservation) => reservation.id === reservationId)?.spaceId ===
            entry.id
              ? 1
              : 0),
        ),
      })),
    );
    setErrorMessage(null);
  };

  if (isLoading) {
    return <p className="text-[0.9rem] text-ink-soft">{tCommon("loading")}</p>;
  }

  return (
    <div className="flex flex-col gap-10">
      {errorMessage ? <Alert tone="error">{errorMessage}</Alert> : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="flex flex-col gap-4">
          <h2 className="flex items-center gap-2.5 font-display text-[1.15rem] text-ink">
            <SettingsIcon size={18} className="text-pine" animateOnHover />
            {t("title")}
          </h2>

          <ul className="flex flex-col gap-2.5">
            {spaces.map((space) => (
              <li
                key={space.id}
                className={cn(
                  "flex flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between",
                  !space.isActive && "opacity-70",
                )}
              >
                <div className="flex min-w-0 flex-col gap-1.5">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-[0.8rem] font-semibold tabular-nums text-pine">
                      {space.code}
                    </span>
                    <Badge tone={space.isActive ? "pine" : "neutral"}>
                      {space.isActive ? t("statusActive") : t("statusInactive")}
                    </Badge>
                    <Badge tone="neutral">
                      {spaceTypeIcon(space.type, "size-3.5")}
                      {tTypes(SPACE_TYPE_MESSAGE_KEYS[space.type])}
                    </Badge>
                  </span>
                  <span className="truncate font-display text-[1.05rem] text-ink">
                    {space.name}
                  </span>
                  <span className="flex flex-wrap items-center gap-x-4 text-[0.8rem] text-ink-soft">
                    <span className="tabular-nums">
                      {formatCurrency(space.pricePerHour, locale)}
                    </span>
                    <span>{t("capacityLabel")}: {space.capacity}</span>
                    <span>{t("upcomingReservations", { count: space.upcomingReservations })}</span>
                  </span>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSpaceToEdit(space)}
                  >
                    <LuPencil className="size-3.5" aria-hidden />
                    {t("editSpace")}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={!space.isActive || deactivatingId === space.id}
                    title={!space.isActive ? t("statusInactive") : t("reactivateHint")}
                    onClick={() => void handleDeactivate(space.id)}
                  >
                    {deactivatingId === space.id ? tCommon("saving") : t("deactivateAction")}
                  </Button>
                  {space.upcomingReservations > 0 ? (
                    <span className="flex max-w-[20ch] items-start gap-1.5 text-[0.72rem] text-ochre">
                      <LuTriangleAlert className="mt-0.5 size-3 shrink-0" aria-hidden />
                      {t("cannotDeactivate")}
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <SpaceForm
          spaceToEdit={spaceToEdit}
          onSaved={handleSaved}
          onCancelEdit={() => setSpaceToEdit(null)}
        />
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-[1.15rem] text-ink">{t("reservationsTitle")}</h2>
        <AdminReservationsTable
          reservations={reservations}
          cancellingId={cancellingId}
          onCancel={(reservationId) => void handleCancelReservation(reservationId)}
        />
      </section>
    </div>
  );
}
