"use client";

import EmptyState from "@/src/components/common/empty-state";
import { Header2 } from "@/src/components/common/header";
import { Spinner } from "@/src/components/common/loading-spinner";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { toast } from "@/src/components/ui/use-toast";
import { getScheduleSources, getStaffBySourceId, StaffMember } from "@/src/data/sources";
import {
  createStudioInstructorLink,
  getStudioInstructorLinks,
} from "@/src/data/studio-instructor-links";
import { useSupaQuery, useSupaMutation } from "@/src/hooks/use-supabase";
import { Tables } from "@/types/db";
import { useEffect, useState, useMemo } from "react";
import {
  PaperAirplaneIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ClockIcon,
  PencilIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { useDebounce } from "usehooks-ts";
import { z as zod } from "zod";
import { AccessControl } from "@/src/components/auth/access-control";

// Email validation schema
const emailSchema = zod.string().email("Please enter a valid email address");

interface InviteDialogState {
  isOpen: boolean;
  instructor?: StaffMember;
}

interface InstructorWithStatus extends StaffMember {
  invitationStatus?: "none" | "pending" | "accepted" | "denied";
  invitationEmail?: string;
}

type StatusFilter = "all" | "none" | "pending" | "accepted" | "denied";

export default function InstructorsPage() {
  return (
    <AccessControl allowedUserTypes={["studio"]}>
      <InstructorsPageContent />
    </AccessControl>
  );
}

function InstructorsPageContent() {
  const [selectedSource, setSelectedSource] = useState<Tables<"sources">>();
  const [inviteDialogState, setInviteDialogState] = useState<InviteDialogState>({
    isOpen: false,
  });
  const [inviteEmail, setInviteEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Debounce search query to avoid excessive filtering
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const { data: sources, isLoading: isLoadingSources } = useSupaQuery(getScheduleSources, {
    queryKey: ["getScheduleSources"],
  });

  const {
    data: staff,
    isLoading: isLoadingStaff,
    isError: staffError,
  } = useSupaQuery(() => getStaffBySourceId(selectedSource!.id), {
    queryKey: ["getStaffBySourceId", selectedSource?.id],
    enabled: !!selectedSource,
  });

  const { data: existingLinks, isLoading: isLoadingLinks } = useSupaQuery(
    getStudioInstructorLinks,
    {
      queryKey: ["getStudioInstructorLinks"],
    },
  );

  const { mutateAsync: createInvitation, isPending: isSendingInvite } = useSupaMutation(
    createStudioInstructorLink,
    {
      invalidate: [["getStudioInstructorLinks"]],
    },
  );

  // Combine staff with invitation status
  const staffWithStatus = useMemo((): InstructorWithStatus[] => {
    if (!staff || !selectedSource) return [];

    return staff.map((instructor) => {
      // Find existing link for this instructor and source
      const existingLink = existingLinks?.find(
        (link) =>
          link.source_id === selectedSource.id && link.id_in_source === instructor.id.toString(),
      );

      return {
        ...instructor,
        invitationStatus: existingLink ? existingLink.status : "none",
        invitationEmail: existingLink?.instructor_email || undefined,
      };
    });
  }, [staff, existingLinks, selectedSource]);

  // Filter staff based on search query and status
  const filteredStaff = useMemo(() => {
    let filtered = staffWithStatus || [];

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((instructor) => instructor.invitationStatus === statusFilter);
    }

    // Apply search filter
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (instructor) =>
          instructor.name.toLowerCase().includes(query) || instructor.id.toString().includes(query),
      );
    }

    // Sort by status priority: pending -> denied -> accepted -> none (uninvited)
    const statusPriority = {
      pending: 1,
      denied: 2,
      accepted: 3,
      none: 4,
    };

    filtered.sort((a, b) => {
      const aPriority = statusPriority[a.invitationStatus || "none"];
      const bPriority = statusPriority[b.invitationStatus || "none"];

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      // If same status, sort alphabetically by name
      return a.name.localeCompare(b.name);
    });

    return filtered;
  }, [staffWithStatus, statusFilter, debouncedSearchQuery]);

  const hasSources = sources && sources.length > 0;

  useEffect(() => {
    if (hasSources && !selectedSource) {
      setSelectedSource(sources[0]);
    }
  }, [hasSources, selectedSource, sources]);

  const validateEmail = (email: string) => {
    if (!email.trim()) {
      setEmailError(null);
      return false;
    }

    const validation = emailSchema.safeParse(email);
    if (!validation.success) {
      setEmailError(validation.error.errors[0]?.message || "Invalid email format");
      return false;
    }

    setEmailError(null);
    return true;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    setInviteEmail(email);
    validateEmail(email);
  };

  const handleSendInvite = async () => {
    if (!inviteEmail || !inviteDialogState.instructor || !selectedSource) return;

    // Validate email before sending
    if (!validateEmail(inviteEmail)) {
      return;
    }

    try {
      const currentStatus = getCurrentInstructorStatus();

      await createInvitation({
        instructor_email: inviteEmail,
        source_id: selectedSource.id,
        id_in_source: inviteDialogState.instructor.id.toString(),
      });

      // Determine the appropriate success message
      let title = "Invitation sent";
      let description = `Invitation sent to ${inviteEmail} for ${inviteDialogState.instructor.name}`;

      if (currentStatus?.invitationStatus === "denied") {
        title = "Invitation resent";
        description = `Invitation resent to ${inviteEmail} for ${inviteDialogState.instructor.name}`;
      } else if (currentStatus?.invitationStatus === "pending") {
        title = "Invitation updated";
        description = `Invitation updated for ${inviteDialogState.instructor.name} - now sent to ${inviteEmail}`;
      }

      toast({
        title,
        description,
        variant: "success",
      });

      setInviteDialogState({ isOpen: false });
      setInviteEmail("");
      setEmailError(null);
    } catch (error) {
      console.error("Error sending invitation:", error);
      toast({
        title: "Failed to send invitation",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const openInviteDialog = (instructor: StaffMember) => {
    const instructorWithStatus = staffWithStatus.find((s) => s.id === instructor.id);

    setInviteDialogState({
      isOpen: true,
      instructor,
    });

    // Pre-fill email if there's an existing invitation
    if (instructorWithStatus?.invitationEmail) {
      setInviteEmail(instructorWithStatus.invitationEmail);
    } else {
      setInviteEmail("");
    }
    setEmailError(null);
  };

  const getCurrentInstructorStatus = () => {
    if (!inviteDialogState.instructor) return null;
    return staffWithStatus.find((s) => s.id === inviteDialogState.instructor!.id);
  };

  const getDialogDescription = () => {
    const currentStatus = getCurrentInstructorStatus();
    const instructorName = inviteDialogState.instructor?.name;

    if (currentStatus?.invitationStatus === "denied") {
      return `Resend invitation to ${instructorName} to link their account.`;
    } else if (currentStatus?.invitationStatus === "pending") {
      return `Update the invitation for ${instructorName}. The current invitation was sent to ${currentStatus.invitationEmail}.`;
    }
    return `Send an invitation to ${instructorName} to link their account.`;
  };

  const getDialogTitle = () => {
    const currentStatus = getCurrentInstructorStatus();

    if (currentStatus?.invitationStatus === "denied") {
      return "Resend Invitation";
    } else if (currentStatus?.invitationStatus === "pending") {
      return "Update Invitation";
    }
    return "Send Invitation";
  };

  const getButtonText = () => {
    const currentStatus = getCurrentInstructorStatus();

    if (isSendingInvite) {
      return "Sending...";
    }

    if (currentStatus?.invitationStatus === "denied") {
      return "Resend Invitation";
    } else if (currentStatus?.invitationStatus === "pending") {
      return "Update Invitation";
    }
    return "Send Invitation";
  };

  const getInvitationButton = (instructor: InstructorWithStatus) => {
    switch (instructor.invitationStatus) {
      case "pending":
        return (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <ClockIcon className="h-4 w-4" />
              <span>Pending</span>
              {instructor.invitationEmail && (
                <span className="text-xs text-muted-foreground">
                  ({instructor.invitationEmail})
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openInviteDialog(instructor)}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
              title="Update invitation"
            >
              <PencilIcon className="h-3 w-3" />
              <span>Edit</span>
            </Button>
          </div>
        );
      case "accepted":
        return (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircleIcon className="h-4 w-4" />
            <span>Linked</span>
            {instructor.invitationEmail && (
              <span className="text-xs text-muted-foreground">({instructor.invitationEmail})</span>
            )}
          </div>
        );
      case "denied":
        return (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm text-red-600">
              <XCircleIcon className="h-4 w-4" />
              <span>Denied</span>
              {instructor.invitationEmail && (
                <span className="text-xs text-muted-foreground">
                  ({instructor.invitationEmail})
                </span>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openInviteDialog(instructor)}
              className="flex items-center gap-2 transition-all hover:bg-muted"
            >
              <PaperAirplaneIcon className="h-4 w-4" />
              Resend
            </Button>
          </div>
        );
      default:
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => openInviteDialog(instructor)}
            className="flex items-center gap-2 transition-all hover:bg-muted"
          >
            <PaperAirplaneIcon className="h-4 w-4" />
            Invite
          </Button>
        );
    }
  };

  // Helper function to get card border and background styling based on status
  const getCardStyling = (status?: string) => {
    switch (status) {
      case "pending":
        return "border-amber-200 bg-amber-50/30";
      case "accepted":
        return "border-green-200 bg-green-50/30";
      case "denied":
        return "border-red-200 bg-red-50/30";
      default:
        return "border-border bg-card";
    }
  };

  const getStatusDisplayName = (status: StatusFilter) => {
    switch (status) {
      case "all":
        return "All Instructors";
      case "none":
        return "Not Invited";
      case "pending":
        return "Pending";
      case "accepted":
        return "Linked";
      case "denied":
        return "Denied";
      default:
        return "All Instructors";
    }
  };

  const getStatusCounts = () => {
    if (!staffWithStatus) return {};

    return {
      all: staffWithStatus.length,
      none: staffWithStatus.filter((s) => s.invitationStatus === "none").length,
      pending: staffWithStatus.filter((s) => s.invitationStatus === "pending").length,
      accepted: staffWithStatus.filter((s) => s.invitationStatus === "accepted").length,
      denied: staffWithStatus.filter((s) => s.invitationStatus === "denied").length,
    };
  };

  if (isLoadingSources) {
    return <Spinner className="mt-8" />;
  }

  if (!hasSources) {
    return (
      <div className="flex h-full flex-col">
        <div className="mb-6">
          <Header2 title="Instructors" />
          <p className="text-sm text-muted-foreground">
            Manage and invite instructors from your connected studios.
          </p>
        </div>
        <EmptyState
          description="No studios found. Create a studio first to see instructors."
          actionButtonOverride={
            <Button onClick={() => (window.location.href = "/app/sources")}>Go to Studios</Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <Dialog
        open={inviteDialogState.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setInviteDialogState({ isOpen: false });
            setInviteEmail("");
            setEmailError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{getDialogTitle()}</DialogTitle>
            <DialogDescription>{getDialogDescription()}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="instructor-name">Instructor Name</Label>
              <Input
                id="instructor-name"
                value={inviteDialogState.instructor?.name || ""}
                disabled
                className="bg-muted"
              />
            </div>
            <div>
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="Enter email address"
                value={inviteEmail}
                onChange={handleEmailChange}
                className={emailError ? "border-red-500" : ""}
              />
              {emailError && <p className="mt-1 text-xs text-red-500">{emailError}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setInviteDialogState({ isOpen: false });
                setInviteEmail("");
                setEmailError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendInvite}
              disabled={!inviteEmail || !!emailError || isSendingInvite}
            >
              {getButtonText()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fixed Header */}
      <div className="mb-6">
        <Header2 title="Instructors" />
        <p className="text-sm text-muted-foreground">
          Manage and invite instructors from your connected studios.
        </p>
      </div>

      {/* Fixed Controls */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="max-w-xs flex-1">
            <Label htmlFor="studio-select">Select Studio</Label>
            <Select
              value={selectedSource?.id || ""}
              onValueChange={(value) => {
                const source = sources?.find((s) => s.id === value);
                setSelectedSource(source);
                setSearchQuery(""); // Clear search when changing studio
                setStatusFilter("all"); // Reset status filter when changing studio
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a studio" />
              </SelectTrigger>
              <SelectContent>
                {sources?.map((source) => (
                  <SelectItem key={source.id} value={source.id}>
                    {source.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedSource && staff && staff.length > 0 && (
            <>
              <div className="max-w-xs flex-1">
                <Label htmlFor="status-filter">Filter by Status</Label>
                <Select
                  value={statusFilter}
                  onValueChange={(value: StatusFilter) => setStatusFilter(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["all", "none", "pending", "accepted", "denied"] as StatusFilter[]).map(
                      (status) => {
                        const counts = getStatusCounts();
                        const count = counts[status] || 0;
                        return (
                          <SelectItem key={status} value={status}>
                            {getStatusDisplayName(status)} ({count})
                          </SelectItem>
                        );
                      },
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="max-w-md flex-1">
                <Label htmlFor="search-instructors">Search Instructors</Label>
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="search-instructors"
                    type="text"
                    placeholder="Search by name or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Results Summary */}
        {selectedSource && staff && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {debouncedSearchQuery.trim() || statusFilter !== "all" ? (
                <>
                  Showing {filteredStaff.length} of {staff.length} instructors
                  {statusFilter !== "all" && (
                    <span className="ml-1">
                      ({getStatusDisplayName(statusFilter).toLowerCase()})
                    </span>
                  )}
                  {debouncedSearchQuery.trim() && (
                    <span className="ml-1">for "{debouncedSearchQuery.trim()}"</span>
                  )}
                </>
              ) : (
                <>
                  {staff.length} instructor{staff.length === 1 ? "" : "s"} found
                  {existingLinks && selectedSource && (
                    <span className="ml-2 text-xs">
                      <span className="inline-flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                        {
                          existingLinks.filter(
                            (link) =>
                              link.source_id === selectedSource.id && link.status === "pending",
                          ).length
                        }{" "}
                        pending
                      </span>
                      <span className="ml-2 inline-flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-green-500"></span>
                        {
                          existingLinks.filter(
                            (link) =>
                              link.source_id === selectedSource.id && link.status === "accepted",
                          ).length
                        }{" "}
                        linked
                      </span>
                      <span className="ml-2 inline-flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-red-500"></span>
                        {
                          existingLinks.filter(
                            (link) =>
                              link.source_id === selectedSource.id && link.status === "denied",
                          ).length
                        }{" "}
                        denied
                      </span>
                    </span>
                  )}
                </>
              )}
            </span>
            {(debouncedSearchQuery.trim() || statusFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                }}
                className="h-auto p-0 text-xs underline"
              >
                Clear filters
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Scrollable Content Area */}
      {selectedSource && (
        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto">
            {isLoadingStaff || isLoadingLinks ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Spinner className="mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">
                    {isLoadingStaff ? "Loading instructors..." : "Loading invitation status..."}
                  </p>
                </div>
              </div>
            ) : staffError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-red-800">Failed to load instructors</p>
                  <p className="mt-1 text-sm text-red-600">
                    Please try again or contact support if the problem persists.
                  </p>
                </div>
              </div>
            ) : !staff || staff.length === 0 ? (
              <EmptyState description="No instructors found for this studio." />
            ) : filteredStaff.length === 0 ? (
              <div className="py-12 text-center">
                <MagnifyingGlassIcon className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                <h3 className="mb-2 text-lg font-medium text-muted-foreground">No results found</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  No instructors match your search for "{debouncedSearchQuery.trim()}"
                </p>
                <Button variant="outline" size="sm" onClick={() => setSearchQuery("")}>
                  Clear search
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 pb-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredStaff.map((instructor) => (
                  <div
                    key={instructor.id}
                    className={`group flex flex-col rounded-lg border p-4 transition-all hover:shadow-md ${getCardStyling(
                      instructor.invitationStatus,
                    )}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative flex-shrink-0">
                        <img
                          src={instructor.profile_image_url}
                          alt={instructor.name}
                          className="h-12 w-12 rounded-full object-cover"
                          onError={(e) => {
                            // Fallback to initials avatar if image fails to load
                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              instructor.name,
                            )}&background=8B7355&color=fff&size=48`;
                          }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-foreground transition-colors group-hover:text-foreground/90">
                          {instructor.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">ID: {instructor.id}</p>
                      </div>
                    </div>
                    <div className="mt-3">
                      {getInvitationButton(instructor as InstructorWithStatus)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
