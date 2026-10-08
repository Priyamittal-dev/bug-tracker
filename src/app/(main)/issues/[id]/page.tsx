import { getIssueById } from "@/app/actions/issues";
import { getUsers } from "@/app/actions/users";
import { getTenantContext } from "@/lib/tenant";
import { IssueDetailView } from "@/components/issues/issue-detail-view";
import { notFound } from "next/navigation";

export default async function IssueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [issue, users, tenant] = await Promise.all([
    getIssueById(id),
    getUsers(),
    getTenantContext(),
  ]);

  if (!issue || !tenant) {
    notFound();
  }

  return (
    <IssueDetailView
      issue={issue}
      users={users.map((u) => ({
        id: u.id,
        name: u.name || "Unknown",
        avatar: u.avatar || null,
        role: u.role,
      }))}
      currentUserId={tenant.userId}
      currentUserRole={tenant.role}
    />
  );
}
