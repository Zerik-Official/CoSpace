"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { LuArmchair, LuCalendarClock, LuClock, LuTriangleAlert } from "react-icons/lu";
import { useLocale, useTranslations } from "next-intl";

import { ActionLink } from "@/components/ui/ActionLink";
import { Alert } from "@/components/ui/Alert";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LocalTimeBadge } from "@/components/common/LocalTimeBadge";
import { apiRequest } from "@/lib/api/client";
import { isApiErrorEnvelope } from "@/lib/api/envelope";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import { ReservationStatus } from "@/lib/domain/enums";
import type { ReservationDetail } from "@/lib/domain/types";
import { formatCurrency, formatHours, formatVenueDate, formatVenueRange } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

type DashboardTab = "upcoming" | "past" | "all";

const TAB_MESSAGE_KEYS: Record<DashboardTab, string> = {
  upcoming: "tabUpcoming",
  past: "tabPast",
  all: "tabAll",
};

const STATUS_TONES: Record<ReservationStatus, BadgeTone> = {
  [ReservationStatus.CONFIRMED]: "pine",
  [ReservationStatus.CANCELLED]: "neutral",
};

/**
 * Renders the reservations of the authenticated user. The data is fetched in the
 * browser, which is what makes this view a client rendered page, and the cancel
 * action goes through the API so every rule is checked on the server.
 *
 * @returns The rendered dashboard panel.
 */
export function DashboardPanel(): ReactNode {
  const t = useTranslations("Dashboard");
  const tCommon = useTranslations("Common");
  const tStatus = useTranslations("ReservationStatus");
  const locale = useLocale();
  const resolveApiError = useApiErrorMessage();

  const [reservations, setReservations] = useState<ReservationDetail[]>([]);
  const [activeTab, setActiveTab] = useState<DashboardTab>("upcoming");
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState(0);
  const [pendingCancelId, setPendingCancelId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;

    void apiRequest<{ reservations: ReservationDetail[] }>("/api/reservations?scope=all").then(
      (envelope) => {
        if (!isCurrent) {
          return;
        }

        if (isApiErrorEnvelope(envelope)) {
          setErrorMessage(resolveApiError(envelope));
        } else {
          setReservations(envelope.data.reservations);
          setErrorMessage(null);
        }

        setNow(Date.now());
        setIsLoading(false);
      },
    );

    return () => {
      isCurrent = false;
    };
  }, [resolveApiError]);

  const handleCancel = async (reservationId: string): Promise<void> => {
    setCancellingId(reservationId);

    const envelope = await apiRequest<{ reservation: ReservationDetail }>(
      `/api/reservations/${reservationId}`,
      { method: "DELETE" },
    );

    setCancellingId(null);
    setPendingCancelId(null);

    if (isApiErrorEnvelope(envelope)) {
      setErrorMessage(resolveApiError(envelope));
      return;
    }

    setReservations((current) =>
      current.map((reservation) =>
        reservation.id === envelope.data.reservation.id ? envelope.data.reservation : reservation,
      ),
    );
    setErrorMessage(null);
  };

  const visible = useMemo(() => {
    if (activeTab === "upcoming") {
      return reservations.filter((reservation) => Date.parse(reservation.startAt) >= now);
    }

    if (activeTab === "past") {
      return reservations.filter((reservation) => Date.parse(reservation.startAt) < now);
    }

    return reservations;
  }, [activeTab, now, reservations]);

  const upcoming = reservations.filter(
    (reservation) =>
      reservation.status === ReservationStatus.CONFIRMED &&
      Date.parse(reservation.startAt) >= now,
  );
  const bookedHours = upcoming.reduce((total, reservation) => total + reservation.hours, 0);
  const nextReservation = upcoming[0];

  if (isLoading) {
    return <p className="text-[0.9rem] text-ink-soft">{tCommon("loading")}</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <dl className="grid gap-px overflow-hidden rounded-[var(--radius-card)] border border-line bg-line sm:grid-cols-3">
        <div className="flex flex-col gap-1 bg-surface p-4">
          <dt className="text-[0.78rem] font-medium text-ink-soft">{t("summaryUpcoming")}</dt>
          <dd className="font-display text-[1.7rem] font-semibold tabular-nums text-ink">
            {upcoming.length}
          </dd>
        </div>
        <div className="flex flex-col gap-1 bg-surface p-4">
          <dt className="text-[0.78rem] font-medium text-ink-soft">{t("summaryHours")}</dt>
          <dd className="font-display text-[1.7rem] font-semibold tabular-nums text-ink">
            {bookedHours}
          </dd>
        </div>
        <div className="flex flex-col gap-1 bg-surface p-4">
          <dt className="text-[0.78rem] font-medium text-ink-soft">{t("summaryNext")}</dt>
          <dd className="text-[0.9rem] text-ink">
            {nextReservation
              ? `${formatVenueDate(nextReservation.startAt, locale)} ${formatVenueRange(nextReservation.startAt, nextReservation.endAt, locale)}`
              : t("summaryNoNext")}
          </dd>
          <LocalTimeBadge />
        </div>
      </dl>

      {errorMessage ? <Alert tone="error">{errorMessage}</Alert> : null}

      <div className="flex gap-1 border-b border-line" role="tablist">
        {(Object.keys(TAB_MESSAGE_KEYS) as DashboardTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "-mb-px border-b-2 px-3.5 py-2.5 text-[0.88rem] font-medium",
              activeTab === tab
                ? "border-pine text-pine"
                : "border-transparent text-ink-soft hover:text-ink",
            )}
          >
            {t(TAB_MESSAGE_KEYS[tab])}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-start gap-4 rounded-[var(--radius-card)] border border-dashed border-line-strong bg-surface p-8">
          <LuArmchair className="size-6 text-pine" aria-hidden />
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-[1.15rem] text-ink">{t("emptyTitle")}</h2>
            <p className="max-w-[38ch] text-[0.9rem] text-ink-soft">{t("emptyBody")}</p>
          </div>
          <ActionLink href="/spaces" variant="secondary" size="sm">
            {t("exploreCatalog")}
          </ActionLink>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((reservation) => (
            <li
              key={reservation.id}
              className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[0.8rem] font-semibold tabular-nums text-pine">
                    {reservation.spaceCode}
                  </span>
                  <Badge tone={STATUS_TONES[reservation.status]}>
                    {tStatus(reservation.status)}
                  </Badge>
                  <span className="text-[0.78rem] text-ink-soft">
                    {t("statusLabel")}: {formatHours(reservation.hours, locale)}
                  </span>
                </div>
                <p className="font-display text-[1.15rem] text-ink">{reservation.spaceName}</p>
                <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.85rem] text-ink-soft">
                  <span className="flex items-center gap-1.5">
                    <LuCalendarClock className="size-4 text-pine" aria-hidden />
                    {formatVenueDate(reservation.startAt, locale)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <LuClock className="size-4 text-pine" aria-hidden />
                    {formatVenueRange(reservation.startAt, reservation.endAt, locale)}
                  </span>
                  <span className="tabular-nums">
                    {formatCurrency(reservation.totalPrice, locale)}
                  </span>
                </p>
              </div>

              {reservation.status === ReservationStatus.CONFIRMED ? (
                <div className="flex flex-col items-start gap-2 sm:items-end">
                  {reservation.canCancel ? (
                    pendingCancelId === reservation.id ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="max-w-[34ch] text-[0.8rem] text-ink-soft">
                          {t("cancelConfirm")}
                        </span>
                        <Button
                          variant="danger"
                          size="sm"
                          disabled={cancellingId === reservation.id}
                          onClick={() => void handleCancel(reservation.id)}
                        >
                          {cancellingId === reservation.id ? t("cancelling") : t("cancelAction")}
                        </Button>
                        <Button
                          variant="quiet"
                          size="sm"
                          onClick={() => setPendingCancelId(null)}
                        >
                          {t("cancelKeep")}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setPendingCancelId(reservation.id)}
                      >
                        {t("cancelAction")}
                      </Button>
                    )
                  ) : (
                    <span className="flex max-w-[30ch] items-start gap-1.5 text-[0.78rem] text-ochre">
                      <LuTriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                      {t("cancelTooLate")}
                    </span>
                  )}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
