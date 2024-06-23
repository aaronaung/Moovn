import EmptyState from "@/src/components/common/empty-state";
import { Spinner } from "@/src/components/common/loading-spinner";
import { DeleteConfirmationDialog } from "@/src/components/dialogs/delete-confirmation-dialog";
import { SavePostDialog } from "@/src/components/dialogs/save-post-dialog";
import { Button } from "@/src/components/ui/button";
import { toast } from "@/src/components/ui/use-toast";
import { DestinationTypes } from "@/src/consts/destinations";
import { deletePost, getPostsByDestinationId } from "@/src/data/posts";
import { useSupaMutation, useSupaQuery } from "@/src/hooks/use-supabase";
import { Tables } from "@/types/db";
import { useState } from "react";
import InstagramPost from "./instagram-post";
import { Header2 } from "@/src/components/common/header";

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

  const renderPost = (post: Tables<"posts"> & { destination: Tables<"destinations"> | null }) => {
    let postComp = <></>;
    switch (post.destination?.type) {
      case DestinationTypes.INSTAGRAM:
        postComp = (
          <InstagramPost
            key={post.id}
            post={post}
            onEditPost={() => {
              setPostDialogState({
                isOpen: true,
                post,
              });
            }}
            onDeletePost={() => {
              setDeleteConfirmationDialogState({
                isOpen: true,
                post,
              });
            }}
          />
        );
        break;
      default:
        return <></>;
    }

    return postComp;
  };

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
      <div className="mb-3 flex items-end">
        <div className="flex-1">
          <Header2 title="Posts" />
          <p className="text-sm text-muted-foreground">
            A post represents the content that will be published to the destination.
          </p>
        </div>
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
      <div className="flex gap-x-2  overflow-scroll">{posts?.map((post) => renderPost(post))}</div>
    </div>
  );
}
