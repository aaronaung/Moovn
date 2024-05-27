import {
  Controller,
  ControllerRenderProps,
  FieldValues,
} from "react-hook-form";
import ReactGoogleAutocomplete from "react-google-autocomplete";
import InputDecorator from "./decorator";
import { ControlledRhfInputProps } from ".";
import { cn } from "@/src/utils";

type LocationData = {
  zip: string;
  state: string;
  city: string;
  address: string;
};

type InputAddressProps = ControlledRhfInputProps & {
  onPlaceSelected?: (data: LocationData) => void;
};

export default function InputAddress(props: InputAddressProps) {
  const input = ({
    field,
  }: {
    field: ControllerRenderProps<FieldValues, string>;
  }) => (
    <InputDecorator {...props}>
      <ReactGoogleAutocomplete
        onPlaceSelected={(place: any) => {
          const extracted = extractLocationData(place.address_components);
          field.onChange(extracted.address);
          props?.onPlaceSelected?.(extracted);
        }}
        options={{
          types: ["address"],
        }}
        inputAutocompleteValue={field.value}
        apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAP_API_KEY}
        disabled={props.disabled}
        name={props.rhfKey}
        id={props.rhfKey}
        className={cn(
          "text-md file:text-md mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 ring-offset-background file:border-0 file:bg-transparent file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          props.className,
        )}
      />
    </InputDecorator>
  );

  return (
    <Controller
      name={props.rhfKey || ""}
      control={props.control}
      rules={props.disableValidation ? { validate: () => true } : undefined}
      render={({ field }) => input({ field })}
    />
  );
}

function getAddressItem(
  addressComponents: any,
  type: string,
  field = "short_name",
) {
  for (const addressItem of addressComponents) {
    for (const typeItem of addressItem.types) {
      if (typeItem === type) {
        return addressItem[field];
      }
    }
  }

  return "";
}

const extractLocationData = (addressComponents: any): LocationData => {
  let zip = "";
  let state = "";
  let city = "";
  let address = "";
  if (addressComponents) {
    zip = getAddressItem(addressComponents, "postal_code", "short_name");
    state = getAddressItem(
      addressComponents,
      "administrative_area_level_1",
      "short_name",
    );
    city = getAddressItem(addressComponents, "locality", "long_name");
    const street = getAddressItem(
      addressComponents,
      "street_number",
      "long_name",
    );
    const route = getAddressItem(addressComponents, "route", "long_name");
    address = `${street} ${route}`;
  }
  return { zip, state, city, address };
};
