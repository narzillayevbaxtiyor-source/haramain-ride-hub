import { useLanguage } from "@/lib/i18n";
import { useBookingText } from "@/lib/i18n-booking";
import type { Airport, PickupCity, RideType } from "@/lib/booking";

export function useBookingLabels() {
  const { t, language } = useLanguage();
  const b = useBookingText();
  return {
    city: (city: PickupCity) => (city === "makkah" ? t.makkah : t.madinah),
    airport: (airport: Airport) =>
      airport === "jeddah" ? t.jeddahAirport : airport === "madinah" ? t.madinahAirport : t.taifAirport,
    ride: (ride: RideType) => (ride === "private" ? b.privateRide : b.sharedRide),
    price: (value: number) => `${Number(value).toLocaleString(language === "ar" ? "ar" : "en")} ${b.currency}`,
  };
}
