import { auth } from "@/auth";
import { getTenantContext } from "@/lib/tenant";
import { organizationService } from "@/services/organization.service";
import { MembersClientView } from "./members-client-view";

export default async function MembersSettingsPage() {
  const session = await auth();
  const tenant = await getTenantContext();

  if (!session?.user?.id && !session?.user?.email) {
    return (
      <div className="text-xs text-muted-foreground">
        Please sign in to manage members.
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="text-xs text-muted-foreground">
        No active organization selected.
      </div>
    );
  }

  const { members, pendingInvitations } =
    await organizationService.getOrganizationMembers(
      tenant.organizationId,
      tenant.userId,
    );

  return (
    <MembersClientView
      organizationId={tenant.organizationId}
      currentUserRole={tenant.role}
      initialMembers={members}
      initialInvitations={pendingInvitations}
    />
  );
}
