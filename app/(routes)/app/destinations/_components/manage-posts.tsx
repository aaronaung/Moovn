import EmptyState from "@/src/components/common/empty-state";
import { Spinner } from "@/src/components/common/loading-spinner";
import { DeleteConfirmationDialog } from "@/src/components/dialogs/delete-confirmation-dialog";
import { SavePostDialog } from "@/src/components/dialogs/save-post-dialog";
import { Button } from "@/src/components/ui/button";
import { toast } from "@/src/components/ui/use-toast";
import { deletePost, getPostsByDestinationId } from "@/src/data/posts";
import { useSupaMutation, useSupaQuery } from "@/src/hooks/use-supabase";
import { Tables } from "@/types/db";
import { useState } from "react";

export default function ManagePosts({ destination }: { destination: Tables<"destinations"> }) {
  const [postDialogState, setPostDialogState] = useState<{
    isOpen: boolean;
    post?: Tables<"posts">;
  }>({
    isOpen: false,
  });
  const [deleteConfirmationDialogState, setDeleteConfirmationDialogState] = useState<{
    isOpen: boolean;
    post?: Tables<"posts">;
  }>({
    isOpen: false,
  });

  const { data: posts, isLoading: isLoadingPosts } = useSupaQuery(getPostsByDestinationId, {
    queryKey: ["getPostsByDestinationId", destination.id],
    arg: destination.id,
  });
  const { mutateAsync: _deletePost, isPending: isDeletingPost } = useSupaMutation(deletePost, {
    invalidate: [["getPostsByDestinationId", destination.id]],
    onSuccess: () => {
      toast({
        title: "Post deleted",
        variant: "success",
      });
    },
    onError: (error) => {
      console.error(error);
      toast({
        title: "Failed to delete post",
        variant: "destructive",
        description: "Please try again or contact support.",
      });
    },
  });

  if (isLoadingPosts) {
    return <Spinner />;
  }

  if (!posts || posts.length === 0) {
    return (
      <>
        <SavePostDialog
          destination={destination}
          isOpen={postDialogState.isOpen}
          onClose={() => {
            setPostDialogState({
              isOpen: false,
            });
          }}
        />
        <EmptyState
          className="text-left"
          title={`No post to publish to '${destination.name}'`}
          actionButtonOverride={
            <Button
              onClick={() => {
                setPostDialogState({
                  isOpen: true,
                });
              }}
            >
              Create post
            </Button>
          }
        />
      </>
    );
  }

  return (
    <div>
      <SavePostDialog
        destination={destination}
        isOpen={postDialogState.isOpen}
        initFormValues={postDialogState.post as any}
        onClose={() => {
          setPostDialogState({
            isOpen: false,
          });
        }}
      />
      <DeleteConfirmationDialog
        isOpen={deleteConfirmationDialogState.isOpen}
        label={"You'll no longer be able to publish this post. Are you sure?"}
        isDeleting={isDeletingPost}
        onClose={() => {
          setDeleteConfirmationDialogState({
            isOpen: false,
          });
        }}
        onDelete={async () => {
          if (deleteConfirmationDialogState.post) {
            await _deletePost(deleteConfirmationDialogState.post.id);
          }
          setDeleteConfirmationDialogState({
            isOpen: false,
          });
        }}
      />
      {(posts || [])?.map((post) => <div key={post.id}>{post.caption}</div>)}
      <Button
        onClick={() => {
          setPostDialogState({
            isOpen: true,
          });
        }}
      >
        Create post
      </Button>
    </div>
  );
}
