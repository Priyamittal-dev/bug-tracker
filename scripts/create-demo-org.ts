import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const email = "admin@bugtracker.io"
  const passwordPlain = "Password123!"
  const hashedPassword = await bcrypt.hash(passwordPlain, 10)

  // 1. Create or update User
  let user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: "Admin User",
        email,
        password: hashedPassword,
        status: "ACTIVE",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        jobTitle: "Lead Architect & Workspace Owner",
      },
    })
    console.log("Created user:", user.email)
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword, status: "ACTIVE" },
    })
    console.log("Updated user password:", user.email)
  }

  // 2. Create or find Organization
  let org = await prisma.organization.findUnique({ where: { slug: "acme-corp" } })
  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: "Acme Corporation",
        slug: "acme-corp",
        status: "ACTIVE",
        plan: "ENTERPRISE",
      },
    })
    console.log("Created organization:", org.name)
  }

  // 3. Organization Membership
  const membership = await prisma.membership.upsert({
    where: {
      organizationId_userId: {
        organizationId: org.id,
        userId: user.id,
      },
    },
    update: {
      role: "ORGANIZATION_OWNER",
      status: "ACTIVE",
    },
    create: {
      organizationId: org.id,
      userId: user.id,
      role: "ORGANIZATION_OWNER",
      status: "ACTIVE",
    },
  })
  console.log("Membership configured:", membership.role)

  // 4. Create default Team Squad
  let team = await prisma.team.findFirst({
    where: { organizationId: org.id, name: "Core Engineering" },
  })
  if (!team) {
    team = await prisma.team.create({
      data: {
        organizationId: org.id,
        name: "Core Engineering",
        description: "Core backend and platform services",
      },
    })
    await prisma.teamMember.create({
      data: {
        teamId: team.id,
        userId: user.id,
        role: "LEAD",
      },
    })
  }

  // 5. Create Project
  let project = await prisma.project.findFirst({
    where: { organizationId: org.id, key: "ACME" },
  })
  if (!project) {
    project = await prisma.project.create({
      data: {
        organizationId: org.id,
        name: "Acme Platform Core",
        key: "ACME",
        description: "Enterprise multi-tenant microservices and developer dashboard",
        category: "Software Development",
        projectType: "SOFTWARE",
        status: "ACTIVE",
        ownerId: user.id,
        createdById: user.id,
        issueCounter: 3,
      },
    })

    // Project Member
    await prisma.projectMember.create({
      data: {
        projectId: project.id,
        userId: user.id,
        role: "PROJECT_ADMIN",
      },
    })

    // 6. Create sample labels
    const securityLabel = await prisma.label.create({
      data: {
        organizationId: org.id,
        projectId: project.id,
        name: "Security",
        color: "#ef4444",
      },
    })

    const frontendLabel = await prisma.label.create({
      data: {
        organizationId: org.id,
        projectId: project.id,
        name: "Frontend",
        color: "#3b82f6",
      },
    })

    // 7. Create sample issues
    const issue1 = await prisma.issue.create({
      data: {
        organizationId: org.id,
        projectId: project.id,
        key: "ACME-1",
        number: 1,
        title: "Integrate OAuth 2.0 and SAML SSO Authentication",
        description: "Provide enterprise single sign-on with Google and Microsoft Azure AD.",
        type: "FEATURE",
        status: "DONE",
        priority: "HIGH",
        severity: "MAJOR",
        assigneeId: user.id,
        reporterId: user.id,
      },
    })

    const issue2 = await prisma.issue.create({
      data: {
        organizationId: org.id,
        projectId: project.id,
        key: "ACME-2",
        number: 2,
        title: "Double charge issue on rapid checkout submission",
        description: "Submitting payment button rapidly causes multiple charge requests without idempotency key.",
        type: "BUG",
        status: "IN_PROGRESS",
        priority: "CRITICAL",
        severity: "BLOCKER",
        environment: "Production",
        operatingSystem: "Windows 11 / macOS Sonoma",
        browser: "Chrome 129",
        stepsToReproduce: "1. Navigate to billing\n2. Rapidly double-click submit\n3. Observe duplicate charge in Stripe webhook",
        expectedResult: "Button disabled on click; single charge created",
        actualResult: "Two charges processed simultaneously",
        logs: "POST /api/v1/charge 200 OK (x2 in 14ms)",
        assigneeId: user.id,
        reporterId: user.id,
      },
    })

    const issue3 = await prisma.issue.create({
      data: {
        organizationId: org.id,
        projectId: project.id,
        key: "ACME-3",
        number: 3,
        title: "Design real-time defect telemetry board",
        description: "WebSocket connection pipeline for instantaneous board movements and live status synchronization.",
        type: "STORY",
        status: "TODO",
        priority: "MEDIUM",
        assigneeId: user.id,
        reporterId: user.id,
      },
    })

    // Attach labels
    await prisma.issueLabel.create({
      data: { issueId: issue2.id, labelId: securityLabel.id },
    })
    await prisma.issueLabel.create({
      data: { issueId: issue3.id, labelId: frontendLabel.id },
    })

    // Sample comments
    await prisma.comment.create({
      data: {
        issueId: issue2.id,
        authorId: user.id,
        content: "Adding Stripe idempotency keys to checkout mutation handlers now.",
      },
    })

    console.log("Created project with 3 sample issues:", project.key)
  }

  console.log("\n==========================================")
  console.log("ORGANIZATION & CREDENTIALS READY:")
  console.log(`URL:          http://localhost:3000/login`)
  console.log(`Email:        ${email}`)
  console.log(`Password:     ${passwordPlain}`)
  console.log(`Organization: ${org.name} (${org.slug})`)
  console.log("==========================================\n")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
