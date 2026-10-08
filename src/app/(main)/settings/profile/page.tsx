import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ThemePreference } from "@/components/theme-preference";

export default async function ProfileSettingsPage() {
  const session = await auth();
  const user = session?.user?.email
    ? await prisma.user.findUnique({
        where: { email: session.user.email },
        include: { memberships: { include: { organization: true } } },
      })
    : null;

  if (!user) {
    return (
      <div className="text-xs text-muted-foreground">
        Please sign in to view profile.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-bold text-foreground">User Profile</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manage your personal identity information and account details.
        </p>
      </div>

      <div className="flex items-center gap-4 p-4 bg-muted/40 rounded-xl border border-border">
        <Avatar className="h-16 w-16 border-2 border-primary/20">
          <AvatarImage src={user.avatar || ""} />
          <AvatarFallback className="font-bold text-lg">
            {user.name?.slice(0, 2).toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-foreground">{user.name}</h3>
            <Badge
              variant="outline"
              className="text-[10px] uppercase font-mono"
            >
              {user.status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{user.email}</p>
          <p className="text-[11px] text-muted-foreground font-medium">
            Job Title: {user.jobTitle || "Software Engineer"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Full Name</Label>
          <Input
            defaultValue={user.name || ""}
            readOnly
            className="bg-muted/50"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Work Email</Label>
          <Input defaultValue={user.email} readOnly className="bg-muted/50" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Job Title</Label>
          <Input
            defaultValue={user.jobTitle || ""}
            readOnly
            className="bg-muted/50"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Account Created</Label>
          <Input
            defaultValue={new Date(user.createdAt).toLocaleDateString()}
            readOnly
            className="bg-muted/50"
            suppressHydrationWarning
          />
        </div>
      </div>

      <div className="pt-2 border-t border-border/50">
        <ThemePreference />
      </div>

      <div className="pt-2 border-t border-border/50">
        <h4 className="text-xs font-bold text-foreground mb-2">
          Active Memberships
        </h4>
        <div className="space-y-2">
          {user.memberships.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border text-xs"
            >
              <div>
                <span className="font-semibold text-foreground">
                  {m.organization.name}
                </span>
                <span className="text-muted-foreground text-[11px] ml-2 font-mono">
                  ({m.organization.slug})
                </span>
              </div>
              <Badge variant="secondary" className="text-[10px] font-semibold">
                {m.role}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
