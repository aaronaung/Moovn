"use client";

import { useState, useEffect } from "react";
import ContentSchedulingForm from "./content-scheduling-form";
import { Tables } from "@/types/db";

interface ContentSchedulingFormWrapperProps {
  connectedDestinations: Tables<"destinations">[];
  availableSources: Tables<"sources">[];
  availableTemplates: Tables<"templates">[];
}

export default function ContentSchedulingFormWrapper({
  connectedDestinations,
  availableSources,
  availableTemplates,
}: ContentSchedulingFormWrapperProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null; // or a loading spinner
  }

  return (
    <ContentSchedulingForm
      availableDestinations={connectedDestinations}
      availableSources={availableSources}
      availableTemplates={availableTemplates}
    />
  );
}
