import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MapPin, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddressData {
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

interface AddressAutocompleteProps {
  value: AddressData;
  onChange: (data: AddressData) => void;
  className?: string;
}

export const AddressAutocomplete = ({ value, onChange, className }: AddressAutocompleteProps) => {
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupSuccess, setLookupSuccess] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  
  // Use refs to avoid dependency issues in useEffect
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  const lastLookedUpZip = useRef<string>("");
  
  // Keep refs updated
  useEffect(() => {
    onChangeRef.current = onChange;
    valueRef.current = value;
  }, [onChange, value]);

  // Trigger lookup when ZIP code changes
  useEffect(() => {
    const zip = value?.zipCode || "";
    
    // Skip if not a valid 5-digit ZIP or already looked up this ZIP
    if (zip.length !== 5 || !/^\d{5}$/.test(zip) || lastLookedUpZip.current === zip) {
      if (zip.length < 5) {
        setLookupError(null);
        setLookupSuccess(false);
      }
      return;
    }

    const timeoutId = setTimeout(async () => {
      setLookingUp(true);
      setLookupError(null);
      setLookupSuccess(false);
      lastLookedUpZip.current = zip;

      try {
        // Use Zippopotam.us API (free, no key required)
        const response = await fetch(`https://api.zippopotam.us/us/${zip}`);
        
        if (!response.ok) {
          throw new Error("Invalid ZIP code");
        }

        const data = await response.json();
        
        if (data.places && data.places.length > 0) {
          const place = data.places[0];
          
          onChangeRef.current({
            ...valueRef.current,
            city: place["place name"],
            state: place["state abbreviation"],
          });
          
          setLookupSuccess(true);
          setTimeout(() => setLookupSuccess(false), 2000);
        }
      } catch (error) {
        console.error("ZIP lookup error:", error);
        setLookupError("Could not find city for this ZIP code");
      } finally {
        setLookingUp(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [value.zipCode]);

  const handleAddressChange = (field: keyof AddressData, fieldValue: string) => {
    // Reset lastLookedUpZip when ZIP changes so we can look it up again
    if (field === "zipCode") {
      lastLookedUpZip.current = "";
    }
    onChange({ ...value, [field]: fieldValue });
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Street Address */}
      <div className="md:col-span-2">
        <Label htmlFor="address">Street Address *</Label>
        <div className="relative mt-2">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="address"
            value={value.address}
            onChange={(e) => handleAddressChange("address", e.target.value)}
            placeholder="123 Main Street, Apt 4B"
            className="pl-10"
          />
        </div>
      </div>

      {/* ZIP Code, City, State row */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="zipCode">ZIP Code *</Label>
          <div className="relative mt-2">
            <Input
              id="zipCode"
              value={value.zipCode}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 5);
                handleAddressChange("zipCode", val);
              }}
              placeholder="12345"
              maxLength={5}
              className={cn(
                lookupSuccess && "border-green-500 focus-visible:ring-green-500"
              )}
            />
            {lookingUp && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
            {lookupSuccess && !lookingUp && (
              <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
            )}
          </div>
          {lookupError && (
            <p className="text-xs text-destructive mt-1">{lookupError}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            City auto-fills from ZIP
          </p>
        </div>

        <div>
          <Label htmlFor="city">City *</Label>
          <Input
            id="city"
            value={value.city}
            onChange={(e) => handleAddressChange("city", e.target.value)}
            placeholder="City name"
            className="mt-2"
          />
        </div>

        <div>
          <Label htmlFor="state">State *</Label>
          <Input
            id="state"
            value={value.state}
            onChange={(e) => handleAddressChange("state", e.target.value.toUpperCase().slice(0, 2))}
            placeholder="NY"
            maxLength={2}
            className="mt-2"
          />
        </div>
      </div>
    </div>
  );
};
