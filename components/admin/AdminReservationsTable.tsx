"use client";

import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { AdminReservationDetail } from "@/lib/domain/types";
import { spaceTypeIcon, SPACE_TYPE_MESSAGE_KEYS } from "@/components/spaces/SpaceTypeMeta";
import { formatCurrency, formatVenueDate, formatVenueRange } from "@/lib/utils/format";

/** Props accepted by the reservations table. */
export interface AdminReservationsTableProps {
  reservations: AdminReservationDetail[];
  cancellingId: string | null;
  onCancel: (reservationId: string) => void;
}

/**
 * Renders the confirmed reservations that are still ahead, so an administrator
 * can cancel any of them on behalf of its owner.
 *
 * @param props - Reservations, the identifier being cancelled and the handler.
 * @returns The rendered table.
 */
export function AdminReservationsTable({
  reservations,
  cancellingId,
  onCancel,
}: AdminReservationsTableProps): ReactNode {
  const t = useTranslations("Admin");
  const tTypes = useTranslations("SpaceTypes");
  const tStatus = useTranslations("ReservationStatus");
  const locale = useLocale();

  if (reservations.length === 0) {
    return (
      <p className="rounded-[var(--radius-card)] border border-dashed border-line-strong bg-surface p-6 text-[0.88rem] text-ink-soft">
        {t("reservationsEmpty")}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[var(--radius-card)] border border-line bg-surface">
      <table className="w-full min-w-[46rem] border-collapse text-left text-[0.85rem]">
        <thead>
          <tr className="border-b border-line text-[0.78rem] font-medium text-ink-soft">
            <th scope="col" className="px-4 py-3">
              {t("columnSpace")}
            </th>
            <th scope="col" className="px-4 py-3">
              {t("columnUser")}
            </th>
            <th scope="col" className="px-4 py-3">
              {t("columnWhen")}
            </th>
            <th scope="col" className="px-4 py-3">
              {t("columnStatus")}
            </th>
            <th scope="col" className="px-4 py-3">
              {t("columnActions")}
            </th>
          </tr>
        </thead>
        <tbody>
          {reservations.map((reservation) => (
            <tr key={reservation.id} className="border-b border-line/70 last:border-0">
              <td className="px-4 py-3">
                <span className="flex items-center gap-2">
                  <span className="font-semibold tabular-nums text-pine">
                    {reservation.spaceCode}
                  </span>
                  <Badge tone="neutral">
                    {spaceTypeIcon(reservation.spaceType, "size-3.5")}
                    {tTypes(SPACE_TYPE_MESSAGE_KEYS[reservation.spaceType])}
                  </Badge>
                  <span className="text-ink">{reservation.spaceName}</span>
                </span>
              </td>
              <td className="px-4 py-3 text-ink-soft">
                <span className="block text-ink">{reservation.userFullName}</span>
                {reservation.userEmail}
              </td>
              <td className="px-4 py-3 text-ink-soft">
                <span className="block text-ink">
                  {formatVenueDate(reservation.startAt, locale)}
                </span>
                {formatVenueRange(reservation.startAt, reservation.endAt, locale)}
                {" · "}
                <span className="tabular-nums">
                  {formatCurrency(reservation.totalPrice, locale)}
                </span>
              </td>
              <td className="px-4 py-3">
                <Badge tone="pine">{tStatus(reservation.status)}</Badge>
              </td>
              <td className="px-4 py-3">
                <Button
                  variant="danger"
                  size="sm"
                  disabled={cancellingId === reservation.id}
                  onClick={() => onCancel(reservation.id)}
                >
                  {t("cancelReservation")}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
