"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CalendarDaysIcon, CircleCheckIcon, HourglassIcon } from "lucide-animated";
import { LuArrowRight } from "react-icons/lu";
import { useLocale, useTranslations } from "next-intl";

import { usePathname, useRouter } from "@/i18n/navigation";
import { ActionLink } from "@/components/ui/ActionLink";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/Field";
import { buildHourBlocks, hourBlockClasses } from "@/components/ui/hour-blocks";
import { useSession } from "@/components/session/SessionProvider";
import { apiRequest } from "@/lib/api/client";
import { isApiErrorEnvelope } from "@/lib/api/envelope";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import type { AvailabilityInterval, ReservationDetail, SpaceAvailability, SpaceDetail } from "@/lib/domain/types";
import { BOOKABLE_START_HOURS, RESERVATION_RULES } from "@/lib/domain/rules";
import { cn } from "@/lib/utils/cn";
import {
  formatClockHour,
  formatCurrency,
  formatHours,
  formatVenueDate,
  formatVenueTime,
  venueClock,
} from "@/lib/utils/format";

/** Props accepted by the booking panel. */
export interface BookingPanelProps {
  space: SpaceDetail;
  venueDate: string;
  busyIntervals: AvailabilityInterval[];
  venueDays: string[];
}

/** Result of the last successful booking, shown instead of the form. */
interface BookedSummary {
  date: string;
  range: string;
}

/**
 * Renders the booking form of a space. The client only picks a window and shows
 * an estimate; the authoritative price and every rule are enforced by the server
 * when the reservation is created.
 *
 * @param props - Space, selected venue day and its occupancy.
 * @returns The rendered booking panel.
 */
export function BookingPanel({
  space,
  venueDate,
  busyIntervals,
  venueDays,
}: BookingPanelProps): ReactNode {
  const t = useTranslations("Booking");
  const tCommon = useTranslations("Common");
  const locale = useLocale();
  const resolveApiError = useApiErrorMessage();
  const router = useRouter();
  const pathname = usePathname();
  const { user, isResolving } = useSession();

  const [availability, setAvailability] = useState<AvailabilityInterval[]>(busyIntervals);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [startHour, setStartHour] = useState<number>(BOOKABLE_START_HOURS[0]);
  const [hours, setHours] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [booked, setBooked] = useState<BookedSummary | null>(null);

  const clock = useMemo(() => venueClock(), []);

  useEffect(() => {
    let isCurrent = true;

    void apiRequest<SpaceAvailability>(`/api/spaces/${space.id}/availability?date=${venueDate}`).then(
      (envelope) => {
        if (!isCurrent) {
          return;
        }

        setAvailability(isApiErrorEnvelope(envelope) ? [] : envelope.data.busyIntervals);
        setIsLoadingAvailability(false);
      },
    );

    return () => {
      isCurrent = false;
    };
  }, [space.id, venueDate]);

  const busyHours = useMemo(() => {
    const blocks = buildHourBlocks(venueDate, availability, clock);

    return new Set(blocks.filter((block) => block.state === "busy").map((block) => block.hour));
  }, [availability, clock, venueDate]);

  const availableStartHours = useMemo(
    () =>
      BOOKABLE_START_HOURS.filter((hour) => {
        if (busyHours.has(hour)) {
          return false;
        }

        const latestEnd = Math.min(hour + RESERVATION_RULES.maxHours, RESERVATION_RULES.closingHour);
        for (let candidate = hour; candidate < latestEnd; candidate += 1) {
          if (busyHours.has(candidate)) {
            return false;
          }
        }

        return true;
      }),
    [busyHours],
  );

  const effectiveStartHour = availableStartHours.includes(startHour)
    ? startHour
    : availableStartHours[0] ?? BOOKABLE_START_HOURS[0];

  const availableDurations = useMemo(() => {
    const maximum = Math.min(
      RESERVATION_RULES.maxHours,
      RESERVATION_RULES.closingHour - effectiveStartHour,
    );
    const durations: number[] = [];

    for (let candidate = RESERVATION_RULES.minHours; candidate <= maximum; candidate += 1) {
      const fits = Array.from({ length: candidate }, (_value, index) => effectiveStartHour + index).every(
        (hour) => !busyHours.has(hour),
      );

      if (fits) {
        durations.push(candidate);
      }
    }

    return durations;
  }, [busyHours, effectiveStartHour]);

  const effectiveHours = availableDurations.includes(hours)
    ? hours
    : availableDurations[0] ?? RESERVATION_RULES.minHours;

  const startAt = clock.fromDayKeyAndHour(venueDate, effectiveStartHour);
  const endAt = clock.fromDayKeyAndHour(venueDate, effectiveStartHour + effectiveHours);
  const selectedHours = new Set(
    Array.from({ length: effectiveHours }, (_value, index) => effectiveStartHour + index),
  );
  const blocks = buildHourBlocks(venueDate, availability, clock);

  const handleSubmit = async (): Promise<void> => {
    setIsSubmitting(true);
    setErrorMessage(null);

    const envelope = await apiRequest<{ reservation: ReservationDetail }>("/api/reservations", {
      method: "POST",
      headers: { "idempotency-key": crypto.randomUUID() },
      body: {
        spaceId: space.id,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
      },
    });

    setIsSubmitting(false);

    if (isApiErrorEnvelope(envelope)) {
      setErrorMessage(resolveApiError(envelope));
      return;
    }

    setBooked({
      date: formatVenueDate(envelope.data.reservation.startAt, locale),
      range: `${formatVenueTime(envelope.data.reservation.startAt, locale)} - ${formatVenueTime(envelope.data.reservation.endAt, locale)}`,
    });
    setAvailability([
      ...availability,
      { startAt: startAt.toISOString(), endAt: endAt.toISOString() },
    ]);
  };

  if (booked) {
    return (
      <div className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-pine bg-pine-soft p-5">
        <span className="flex items-center gap-2.5 text-pine">
          <CircleCheckIcon size={22} animateOnHover />
          <span className="font-display text-[1.15rem] font-semibold">{t("successTitle")}</span>
        </span>
        <p className="text-[0.9rem] text-ink">
          {t("successBody", { space: space.name, date: booked.date, range: booked.range })}
        </p>
        <ActionLink href="/dashboard" size="sm" variant="secondary" className="self-start">
          {t("goToDashboard")}
        </ActionLink>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 rounded-[var(--radius-card)] border border-line bg-surface p-5">
      <div className="flex items-center gap-2.5">
        <CalendarDaysIcon size={20} className="text-pine" animateOnHover />
        <h2 className="font-display text-[1.2rem] text-ink">{t("title")}</h2>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex gap-[3px]" aria-hidden>
          {blocks.map((block, index) => (
            <span
              key={block.hour}
              className={cn(
                "hour-block h-5 flex-1 rounded-[2px] border",
                hourBlockClasses(selectedHours.has(block.hour) ? "selected" : block.state),
              )}
              style={{ animationDelay: `${index * 26}ms` }}
            />
          ))}
        </div>
        <div className="flex justify-between text-[0.7rem] tabular-nums text-ink-soft">
          <span>07:00</span>
          <span>21:00</span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          name="booking-day"
          label={t("dateLabel")}
          value={venueDate}
          onChange={(event) => {
            setIsLoadingAvailability(true);
            setAvailability([]);
            router.replace(`${pathname}?date=${event.target.value}`);
          }}
          options={venueDays.map((day) => ({
            value: day,
            label: formatVenueDate(`${day}T12:00:00.000Z`, locale),
          }))}
        />
        <SelectField
          name="booking-start-hour"
          label={t("startHourLabel")}
          value={String(effectiveStartHour)}
          onChange={(event) => setStartHour(Number(event.target.value))}
          options={availableStartHours.map((hour) => ({
            value: String(hour),
            label: formatClockHour(hour),
          }))}
        />
      </div>

      <SelectField
        name="booking-hours"
        label={t("hoursLabel")}
        value={String(effectiveHours)}
        onChange={(event) => setHours(Number(event.target.value))}
        options={availableDurations.map((duration) => ({
          value: String(duration),
          label: t("hoursOption", { count: duration }),
        }))}
      />

      <div className="flex items-center justify-between gap-4 border-t border-line pt-4">
        <span className="flex items-center gap-2 text-[0.82rem] text-ink-soft">
          <HourglassIcon size={16} animateOnHover />
          {t("totalLabel")}
        </span>
        <span className="flex items-baseline gap-2">
          <span className="font-display text-[1.5rem] font-semibold tabular-nums text-ink">
            {formatCurrency(space.pricePerHour * effectiveHours, locale)}
          </span>
          <span className="text-[0.78rem] text-ink-soft">
            {formatHours(effectiveHours, locale)} x {formatCurrency(space.pricePerHour, locale)}
          </span>
        </span>
      </div>

      {errorMessage ? <Alert tone="error">{errorMessage}</Alert> : null}

      {availableStartHours.length === 0 ? <Alert tone="info">{t("closedDay")}</Alert> : null}

      <ul className="flex flex-col gap-1.5 text-[0.8rem] text-ink-soft">
        <li className="flex items-center gap-2">
          <Badge tone="pine">
            <LuArrowRight className="size-3" aria-hidden />
            {t("rulesTitle")}
          </Badge>
        </li>
        <li>{t("ruleHours")}</li>
        <li>{t("ruleOpening")}</li>
        <li>{t("ruleAdvance")}</li>
        <li>{t("ruleQuota")}</li>
      </ul>

      {isLoadingAvailability ? <p className="text-[0.78rem] text-ink-soft">{tCommon("loading")}</p> : null}

      {isResolving ? null : user ? (
        <Button
          onClick={() => void handleSubmit()}
          disabled={isSubmitting || availableStartHours.length === 0}
        >
          {isSubmitting ? t("submitting") : t("submit")}
        </Button>
      ) : (
        <ActionLink href="/login" className="w-full">
          {t("loginToBook")}
        </ActionLink>
      )}
    </div>
  );
}
