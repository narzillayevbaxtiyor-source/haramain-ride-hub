import type { RideType, VehicleClass } from "@/lib/booking";
import { useBookingText } from "@/lib/i18n-booking";

export type OfferSort = "cheapest" | "rating";

type Props = {
  sort: OfferSort;
  onSortChange: (sort: OfferSort) => void;
  ride: RideType | "all";
  onRideChange: (ride: RideType | "all") => void;
  vehicle: string;
  onVehicleChange: (vehicle: string) => void;
  vehicleTypes: string[];
  vehicleClass: VehicleClass | "all";
  onVehicleClassChange: (value: VehicleClass | "all") => void;
};

const selectClass =
  "min-h-12 w-full rounded-md border border-input bg-background px-3 text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function OfferFilters({ sort, onSortChange, ride, onRideChange, vehicle, onVehicleChange, vehicleTypes, vehicleClass, onVehicleClassChange }: Props) {
  const b = useBookingText();
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <label className="block">
        <span className="mb-1.5 block text-xs font-bold uppercase text-muted-foreground">{b.sortBy}</span>
        <select value={sort} onChange={(event) => onSortChange(event.target.value as OfferSort)} className={selectClass}>
          <option value="cheapest">{b.sortCheapest}</option>
          <option value="rating">{b.sortRating}</option>
        </select>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-bold uppercase text-muted-foreground">{b.filterRide}</span>
        <select value={ride} onChange={(event) => onRideChange(event.target.value as RideType | "all")} className={selectClass}>
          <option value="all">{b.filterAll}</option>
          <option value="private">{b.privateRide}</option>
          <option value="shared">{b.sharedRide}</option>
        </select>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-bold uppercase text-muted-foreground">{b.filterVehicle}</span>
        <select value={vehicle} onChange={(event) => onVehicleChange(event.target.value)} className={selectClass}>
          <option value="all">{b.filterAll}</option>
          {vehicleTypes.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-bold uppercase text-muted-foreground">{b.filterClass}</span>
        <select value={vehicleClass} onChange={(event) => onVehicleClassChange(event.target.value as VehicleClass | "all")} className={selectClass}>
          <option value="all">{b.filterAll}</option>
          <option value="economy">{b.classEconomy}</option>
          <option value="standard">{b.classStandard}</option>
          <option value="comfort">{b.classComfort}</option>
        </select>
      </label>
    </div>
  );
}
