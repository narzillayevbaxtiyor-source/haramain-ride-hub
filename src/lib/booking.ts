import { supabase } from "@/integrations/supabase/client";

export type PickupCity = "makkah" | "madinah";
export type Airport = "jeddah" | "madinah" | "taif";
export type RideType = "private" | "shared";

export type BookingDraft = {
  city: PickupCity | null;
  pickupLocation: string;
  airport: Airport | null;
  date: string;
  time: string;
  adults: number;
  children: number;
  largeLuggage: number;
  handLuggage: number;
  rideType: RideType | null;
};

export const emptyDraft: BookingDraft = {
  city: null,
  pickupLocation: "",
  airport: null,
  date: "",
  time: "",
  adults: 1,
  children: 0,
  largeLuggage: 1,
  handLuggage: 0,
  rideType: null,
};

export type DriverOffer = {
  id: string;
  driver_id: string;
  pickup_city: PickupCity;
  pickup_location: string | null;
  destination_airport: Airport;
  date: string;
  time: string;
  ride_type: RideType;
  price: number;
  vehicle_type: string;
  vehicle_model: string | null;
  seats: number;
  luggage_capacity: number;
  rating: number | null;
  driver_name: string | null;
  driver_avatar_url: string | null;
};

const minutes = (time: string) => {
  const [h, m] = time.split(":");
  return Number(h) * 60 + Number(m ?? 0);
};

/** Offers within this many minutes of the requested pickup time are considered suitable. */
const TIME_WINDOW = 120;

export async function fetchMatchingOffers(draft: BookingDraft): Promise<DriverOffer[]> {
  if (!draft.city || !draft.airport || !draft.rideType || !draft.date || !draft.time) return [];
  const passengers = draft.adults + draft.children;
  const luggage = draft.largeLuggage + draft.handLuggage;

  const { data, error } = await supabase
    .from("public_driver_offers")
    .select("*")
    .eq("pickup_city", draft.city)
    .eq("destination_airport", draft.airport)
    .eq("ride_type", draft.rideType)
    .eq("date", draft.date)
    .gte("seats", passengers)
    .gte("luggage_capacity", luggage)
    .order("price", { ascending: true });

  if (error) throw error;

  const wanted = minutes(draft.time);
  return ((data ?? []) as unknown as DriverOffer[]).filter(
    (offer) => Math.abs(minutes(offer.time) - wanted) <= TIME_WINDOW,
  );
}

export async function createBooking(draft: BookingDraft, offer: DriverOffer) {
  const { data, error } = await supabase
    .from("bookings")
    .insert({
      driver_id: offer.driver_id,
      offer_id: offer.id,
      pickup_city: draft.city!,
      pickup_location: draft.pickupLocation,
      destination_airport: draft.airport!,
      date: draft.date,
      time: draft.time,
      passengers: draft.adults + draft.children,
      luggage: draft.largeLuggage + draft.handLuggage,
      ride_type: draft.rideType!,
      price: offer.price,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) throw error;
  return data as { id: string };
}
