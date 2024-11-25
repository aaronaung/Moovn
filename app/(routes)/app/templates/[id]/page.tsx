import { redirect } from "next/navigation";
import { TemplateDetails } from "./_components/template-details";
import { supaServerComponentClient } from "@/src/data/clients/server";
import { getTemplateById } from "@/src/data/templates";
import Link from "next/link";
import { Button } from "@/src/components/ui/button";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { Header2 } from "@/src/components/common/header";
import { InstagramIcon } from "@/src/components/ui/icons/instagram";
import { getAuthUser } from "@/src/data/users";

export default async function TemplatePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = await supaServerComponentClient();
  const template = await getTemplateById(params.id, {
    client: supabase,
  });
  const user = await getAuthUser({
    client: supabase,
  });

  if (!user) {
    redirect("/sign-in");
  }
  if (!template) {
    // For any other error, redirect to the templates page
    redirect("/app/templates");
  }

  return (
    <div>
      <div className="my-2 flex items-center gap-2">
        <Link href="/app/templates" passHref>
          <Button variant="ghost" className="">
            <ArrowLeftIcon className="h-4 w-4" />
          </Button>
        </Link>
        <div className="mr-1 flex items-center gap-1 rounded-lg bg-secondary p-2">
          <InstagramIcon className="h-5 w-5 fill-purple-600 text-secondary-foreground" />
          <p className="text-xs font-medium text-pink-600">{template.content_type.split(" ")[1]}</p>
        </div>
        <Header2 title={template.name} />
        <p className="text-sm text-muted-foreground">
          (Schedule type: <b>{template.source_data_view}</b>)
        </p>
      </div>
      <div className="flex  gap-1"></div>
      <TemplateDetails user={user} template={template} />
    </div>
  );
}
