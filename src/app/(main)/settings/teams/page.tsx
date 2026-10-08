import { auth } from "@/auth";
import { getTenantContext } from "@/lib/tenant";
import { teamService } from "@/services/team.service";
import { organizationService } from "@/services/organization.service";
import { TeamsClientView } from "./teams-client-view";

export default async function TeamsSettingsPage() {
  const session = await auth();
  const tenant = await getTenantContext();

  if (!session?.user?.id && !session?.user?.email) {
    return (
      <div className="text-xs text-muted-foreground">
        Please sign in to view teams.
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

  const teams = await teamService.getOrganizationTeams(
    tenant.organizationId,
    tenant.userId,
  );
  const { members } = await organizationService.getOrganizationMembers(
    tenant.organizationId,
    tenant.userId,
  );

  return (
    <TeamsClientView
      organizationId={tenant.organizationId}
      currentUserRole={tenant.role}
      initialTeams={teams}
      orgMembers={members}
    />
  );
}
