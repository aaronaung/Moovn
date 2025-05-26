"use client";

import { useState } from "react";
import { Header2 } from "@/src/components/common/header";
import { Spinner } from "@/src/components/common/loading-spinner";
import EmptyState from "@/src/components/common/empty-state";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/src/components/ui/avatar";
import { Badge } from "@/src/components/ui/badge";
import { toast } from "@/src/components/ui/use-toast";
import { useSupaQuery, useSupaMutation } from "@/src/hooks/use-supabase";
import {
  getInstructorStudioLinks,
  updateStudioInstructorLinkStatus,
} from "@/src/data/studio-instructor-links";
import { Tables } from "@/types/db";
import { userDisplayName } from "@/src/libs/user";
import { CheckCircleIcon, ClockIcon, XCircleIcon } from "@heroicons/react/24/outline";
import { AccessControl } from "@/src/components/auth/access-control";

export default function MyStudiosPage() {
  return (
    <AccessControl allowedUserTypes={["instructor"]}>
      <MyStudiosPageContent />
    </AccessControl>
  );
}

function MyStudiosPageContent() {
  const [processingLinkId, setProcessingLinkId] = useState<string | null>(null);

  const { data: links, isLoading } = useSupaQuery(getInstructorStudioLinks, {
    queryKey: ["getInstructorStudioLinks"],
  });

  const { mutateAsync: updateLinkStatus } = useSupaMutation(updateStudioInstructorLinkStatus, {
    invalidate: [["getInstructorStudioLinks"]],
  });

  const handleLinkAction = async (linkId: string, action: "accept" | "deny") => {
    setProcessingLinkId(linkId);

    try {
      await updateLinkStatus({ linkId, status: action === "accept" ? "accepted" : "denied" });

      toast({
        title: action === "accept" ? "Invitation accepted" : "Invitation declined",
        description: `You have ${
          action === "accept" ? "accepted" : "declined"
        } the studio invitation.`,
        variant: "success",
      });
    } catch (error) {
      console.error("Error updating link status:", error);
      toast({
        title: "Failed to update invitation",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setProcessingLinkId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="border-amber-600 text-amber-600">
            <ClockIcon className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        );
      case "accepted":
        return (
          <Badge variant="outline" className="border-green-600 text-green-600">
            <CheckCircleIcon className="mr-1 h-3 w-3" />
            Linked
          </Badge>
        );
      case "denied":
        return (
          <Badge variant="outline" className="border-red-600 text-red-600">
            <XCircleIcon className="mr-1 h-3 w-3" />
            Declined
          </Badge>
        );
      default:
        return null;
    }
  };

  const getStudioInitials = (studio: Tables<"users">) => {
    if (studio?.first_name && studio?.last_name) {
      return `${studio.first_name[0]}${studio.last_name[0]}`.toUpperCase();
    }
    if (studio?.email) {
      return studio.email[0].toUpperCase();
    }
    return "S";
  };

  if (isLoading) {
    return <Spinner className="mt-8" />;
  }

  if (!links || links.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <div className="mb-6">
          <Header2 title="My Studios" />
          <p className="text-sm text-muted-foreground">
            View and manage your studio connections and invitations.
          </p>
        </div>
        <EmptyState description="No studio invitations found. Studios will send you invitations to link your instructor account." />
      </div>
    );
  }

  const pendingLinks = links.filter((link) => link.status === "pending");
  const acceptedLinks = links.filter((link) => link.status === "accepted");
  const deniedLinks = links.filter((link) => link.status === "denied");

  return (
    <div className="flex h-full flex-col">
      <div className="mb-6">
        <Header2 title="My Studios" />
        <p className="text-sm text-muted-foreground">
          View and manage your studio connections and invitations.
        </p>
      </div>

      <div className="space-y-6">
        {/* Pending Invitations */}
        {pendingLinks.length > 0 && (
          <div>
            <h3 className="mb-3 text-lg font-semibold">
              Pending Invitations ({pendingLinks.length})
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pendingLinks.map((link) => (
                <Card key={link.id} className="border-amber-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={link.studio?.avatar_url || undefined} />
                        <AvatarFallback>{getStudioInitials(link.studio!)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <CardTitle className="text-base">{userDisplayName(link.studio!)}</CardTitle>
                        <p className="text-sm text-muted-foreground">{link.source?.name}</p>
                      </div>
                      {getStatusBadge(link.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleLinkAction(link.id, "accept")}
                        disabled={processingLinkId === link.id}
                        className="flex-1"
                      >
                        {processingLinkId === link.id ? "Processing..." : "Accept"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleLinkAction(link.id, "deny")}
                        disabled={processingLinkId === link.id}
                        className="flex-1"
                      >
                        Decline
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Linked Studios */}
        {acceptedLinks.length > 0 && (
          <div>
            <h3 className="mb-3 text-lg font-semibold">Linked Studios ({acceptedLinks.length})</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {acceptedLinks.map((link) => (
                <Card key={link.id} className="border-green-200">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={link.studio?.avatar_url || undefined} />
                        <AvatarFallback>{getStudioInitials(link.studio!)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <CardTitle className="text-base">{userDisplayName(link.studio!)}</CardTitle>
                        <p className="text-sm text-muted-foreground">{link.source?.name}</p>
                      </div>
                      {getStatusBadge(link.status)}
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Declined Invitations */}
        {deniedLinks.length > 0 && (
          <div>
            <h3 className="mb-3 text-lg font-semibold">
              Declined Invitations ({deniedLinks.length})
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {deniedLinks.map((link) => (
                <Card key={link.id} className="border-red-200">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={link.studio?.avatar_url || undefined} />
                        <AvatarFallback>{getStudioInitials(link.studio!)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <CardTitle className="text-base">{userDisplayName(link.studio!)}</CardTitle>
                        <p className="text-sm text-muted-foreground">{link.source?.name}</p>
                      </div>
                      {getStatusBadge(link.status)}
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
