import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding Enterprise Multi-Tenant SaaS database...")

  const defaultPassword = await bcrypt.hash("password123", 10)

  // Clean existing data
  await prisma.invoice.deleteMany()
  await prisma.paymentMethod.deleteMany()
  await prisma.subscription.deleteMany()
  await prisma.billingAccount.deleteMany()
  await prisma.comment.deleteMany()
  await prisma.issue.deleteMany()
  await prisma.milestone.deleteMany()
  await prisma.projectMember.deleteMany()
  await prisma.project.deleteMany()
  await prisma.teamMember.deleteMany()
  await prisma.team.deleteMany()
  await prisma.invitation.deleteMany()
  await prisma.membership.deleteMany()
  await prisma.organization.deleteMany()
  await prisma.account.deleteMany()
  await prisma.passwordResetToken.deleteMany()
  await prisma.session.deleteMany()
  await prisma.user.deleteMany()

  // 1. Create Core Users
  const rahul = await prisma.user.create({
    data: {
      name: "Rahul Garg",
      email: "rahul@bugtracker.io",
      password: defaultPassword,
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      jobTitle: "Lead Architect & Engineer",
    },
  })

  const sarah = await prisma.user.create({
    data: {
      name: "Sarah Chen",
      email: "sarah.chen@bugtracker.io",
      password: defaultPassword,
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
      jobTitle: "QA Lead",
    },
  })

  const alex = await prisma.user.create({
    data: {
      name: "Alex Rivera",
      email: "alex.r@bugtracker.io",
      password: defaultPassword,
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
      jobTitle: "Senior Frontend Engineer",
    },
  })

  const elena = await prisma.user.create({
    data: {
      name: "Elena Rostova",
      email: "elena.r@bugtracker.io",
      password: defaultPassword,
      avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
      jobTitle: "DevOps & Security",
    },
  })

  // 2. Create Multi-Tenant Organizations
  const cloudOrg = await prisma.organization.create({
    data: {
      name: "CloudDesk Global",
      slug: "clouddesk",
      plan: "ENTERPRISE",
    },
  })

  const finOrg = await prisma.organization.create({
    data: {
      name: "FinPay Technologies",
      slug: "finpay",
      plan: "PRO",
    },
  })

  // 3. Organization Memberships (RBAC)
  await prisma.membership.createMany({
    data: [
      { organizationId: cloudOrg.id, userId: rahul.id, role: "OWNER" },
      { organizationId: cloudOrg.id, userId: sarah.id, role: "ADMIN" },
      { organizationId: cloudOrg.id, userId: alex.id, role: "MEMBER" },
      { organizationId: cloudOrg.id, userId: elena.id, role: "MEMBER" },
      // Rahul is also a member in FinPay for cross-tenant testing
      { organizationId: finOrg.id, userId: rahul.id, role: "MEMBER" },
      { organizationId: finOrg.id, userId: alex.id, role: "OWNER" },
    ],
  })

  // 4. Create Functional Teams
  const platformTeam = await prisma.team.create({
    data: {
      organizationId: cloudOrg.id,
      name: "Core Platform Squad",
      description: "Distributed systems, API gateways, and core database infrastructure.",
    },
  })

  const qaTeam = await prisma.team.create({
    data: {
      organizationId: cloudOrg.id,
      name: "Quality Assurance",
      description: "Automated regression, performance stress testing, and release certification.",
    },
  })

  await prisma.teamMember.createMany({
    data: [
      { teamId: platformTeam.id, userId: rahul.id, role: "LEAD" },
      { teamId: platformTeam.id, userId: elena.id, role: "MEMBER" },
      { teamId: qaTeam.id, userId: sarah.id, role: "LEAD" },
      { teamId: qaTeam.id, userId: alex.id, role: "MEMBER" },
    ],
  })

  // 5. Create Projects
  const cloudProject = await prisma.project.create({
    data: {
      organizationId: cloudOrg.id,
      name: "CloudDesk Core Platform",
      key: "CLOUD",
      description: "High-throughput cloud management dashboard, multi-tenant API gateway, and billing service.",
      category: "Cloud Infrastructure",
      status: "ACTIVE",
    },
  })

  const finProject = await prisma.project.create({
    data: {
      organizationId: finOrg.id,
      name: "FinPay Mobile & Gateway",
      key: "FIN",
      description: "Payment checkout gateway, cross-border remittance engine, and mobile wallet apps.",
      category: "Fintech & Payments",
      status: "ACTIVE",
    },
  })

  // Project Members
  await prisma.projectMember.createMany({
    data: [
      { projectId: cloudProject.id, userId: rahul.id, role: "MANAGER" },
      { projectId: cloudProject.id, userId: sarah.id, role: "CONTRIBUTOR" },
      { projectId: cloudProject.id, userId: alex.id, role: "CONTRIBUTOR" },
      { projectId: cloudProject.id, userId: elena.id, role: "CONTRIBUTOR" },
      { projectId: finProject.id, userId: alex.id, role: "MANAGER" },
      { projectId: finProject.id, userId: rahul.id, role: "CONTRIBUTOR" },
    ],
  })

  // 6. Create Milestones
  const m1 = await prisma.milestone.create({
    data: {
      name: "v2.4 Q3 Enterprise Release",
      description: "Enterprise SSO, RBAC policies, and real-time streaming notifications.",
      status: "OPEN",
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      projectId: cloudProject.id,
    },
  })

  const m2 = await prisma.milestone.create({
    data: {
      name: "Sprint 14: Payment Gateway Hardening",
      description: "Zero-loss webhook idempotency and 3DS2 checkout authentication upgrade.",
      status: "OPEN",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      projectId: finProject.id,
    },
  })

  // 7. Create Rich Defects / Issues for CloudDesk
  const issue1 = await prisma.issue.create({
    data: {
      organizationId: cloudOrg.id,
      key: "CLOUD-101",
      title: "WebSocket session memory leak under high-concurrency re-connections",
      description: "When more than 1,500 clients experience sudden network reconnection drops, the Node.js server memory usage spikes by 800MB and does not garbage-collect unclosed listener handles.",
      type: "BUG",
      status: "IN_PROGRESS",
      priority: "URGENT",
      severity: "CRITICAL",
      module: "API Gateway",
      reproducibility: "Always",
      environment: "Production (Kubernetes us-east-1)",
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      projectId: cloudProject.id,
      milestoneId: m1.id,
      assigneeId: rahul.id,
      reporterId: sarah.id,
    },
  })

  const issue2 = await prisma.issue.create({
    data: {
      organizationId: cloudOrg.id,
      key: "CLOUD-102",
      title: "OAuth 2.0 PKCE token refresh race condition on Safari iOS",
      description: "Safari iOS 17 aggressive cookie partitioning triggers duplicate token rotation requests, revoking the user's valid session and kicking them to login.",
      type: "BUG",
      status: "OPEN",
      priority: "HIGH",
      severity: "MAJOR",
      module: "Authentication",
      reproducibility: "Sometimes",
      environment: "Staging (iOS 17 Safari)",
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      projectId: cloudProject.id,
      milestoneId: m1.id,
      assigneeId: alex.id,
      reporterId: sarah.id,
    },
  })

  const issue3 = await prisma.issue.create({
    data: {
      organizationId: cloudOrg.id,
      key: "CLOUD-103",
      title: "Implement Zoho BugTracker webhook connector for auto-sync",
      description: "Add bidirectional webhook handler to push issue updates and sync status transitions with external Zoho and Jira workspaces.",
      type: "FEATURE",
      status: "IN_REVIEW",
      priority: "HIGH",
      severity: "MODERATE",
      module: "Integrations",
      reproducibility: "Always",
      environment: "Development",
      dueDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
      projectId: cloudProject.id,
      milestoneId: m1.id,
      assigneeId: rahul.id,
      reporterId: alex.id,
    },
  })

  const issue4 = await prisma.issue.create({
    data: {
      organizationId: cloudOrg.id,
      key: "CLOUD-104",
      title: "Database connection pool exhaustion during daily backup cron",
      description: "Prisma connection pool max connections limit (10) reached when DB snapshot is taken alongside heavy report export jobs.",
      type: "BUG",
      status: "RESOLVED",
      priority: "URGENT",
      severity: "CRITICAL",
      module: "Database & Cache",
      reproducibility: "Always",
      environment: "Production",
      dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      projectId: cloudProject.id,
      assigneeId: elena.id,
      reporterId: rahul.id,
    },
  })

  const issue5 = await prisma.issue.create({
    data: {
      organizationId: cloudOrg.id,
      key: "CLOUD-105",
      title: "Optimize Kanban board drag response latency on low-end displays",
      description: "Refactor card re-ordering state updates to use optimistic UI updates with zero-layout-shift micro-animations.",
      type: "IMPROVEMENT",
      status: "CLOSED",
      priority: "LOW",
      severity: "MINOR",
      module: "UI/UX",
      reproducibility: "Always",
      environment: "All Browsers",
      projectId: cloudProject.id,
      assigneeId: alex.id,
      reporterId: alex.id,
    },
  })

  // 8. Create Issues for FinPay (Org: finOrg)
  const fin1 = await prisma.issue.create({
    data: {
      organizationId: finOrg.id,
      key: "FIN-201",
      title: "Stripe idempotency key collision on rapid double-tap checkout",
      description: "Double clicking the Pay Now button fires two simultaneous charge requests with the identical client payload before disable state binds.",
      type: "BUG",
      status: "OPEN",
      priority: "URGENT",
      severity: "CRITICAL",
      module: "Payment Engine",
      reproducibility: "Always",
      environment: "Production (Stripe v3 API)",
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      projectId: finProject.id,
      milestoneId: m2.id,
      assigneeId: rahul.id,
      reporterId: sarah.id,
    },
  })

  const fin2 = await prisma.issue.create({
    data: {
      organizationId: finOrg.id,
      key: "FIN-202",
      title: "Currency conversion rounding discrepancy on multi-currency payouts",
      description: "Floating point math on EUR to JPY conversions introduces a 1-yen disparity when aggregate sum is calculated.",
      type: "BUG",
      status: "IN_PROGRESS",
      priority: "HIGH",
      severity: "MAJOR",
      module: "Ledger",
      reproducibility: "Sometimes",
      environment: "Staging",
      dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      projectId: finProject.id,
      milestoneId: m2.id,
      assigneeId: alex.id,
      reporterId: sarah.id,
    },
  })

  // 9. Comments
  await prisma.comment.createMany({
    data: [
      {
        content: "Reproduced on Node.js v20.12. Discovered that the EventEmitter in the WebSocket connection pool wasn't removing listeners on TCP FIN packets. Working on a patch now.",
        issueId: issue1.id,
        authorId: rahul.id,
      },
      {
        content: "Thanks Rahul! Let me know when the staging build is ready so QA can run the 5,000 virtual connection soak test.",
        issueId: issue1.id,
        authorId: sarah.id,
      },
      {
        content: "Added connection pool sizing metrics to Grafana dashboard. Verified 0 drops after raising pool capacity and optimizing transaction lifetimes.",
        issueId: issue4.id,
        authorId: elena.id,
      },
    ],
  })

  const now = new Date()
  const periodEnd = new Date(now)
  periodEnd.setMonth(periodEnd.getMonth() + 1)

  const cloudBilling = await prisma.billingAccount.create({
    data: {
      organizationId: cloudOrg.id,
      billingEmail: "ap@clouddesk.example",
      companyName: "CloudDesk Global, Inc.",
      taxId: "94-1234567",
      taxIdType: "EIN",
      addressLine1: "88 Market Street",
      city: "San Francisco",
      region: "CA",
      postalCode: "94105",
      country: "US",
      currency: "USD",
      collectionMethod: "SEND_INVOICE",
      poNumber: "PO-CD-8841",
      netTermsDays: 30,
    },
  })

  await prisma.subscription.create({
    data: {
      organizationId: cloudOrg.id,
      billingAccountId: cloudBilling.id,
      planKey: "ENTERPRISE",
      status: "ACTIVE",
      billingInterval: "YEARLY",
      seatQuantity: 50,
      currentPeriodStart: now,
      currentPeriodEnd: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()),
    },
  })

  const visa = await prisma.paymentMethod.create({
    data: {
      organizationId: cloudOrg.id,
      billingAccountId: cloudBilling.id,
      type: "CARD",
      brand: "visa",
      last4: "4242",
      expMonth: 12,
      expYear: 2028,
      holderName: "CloudDesk Treasury",
      fingerprint: "seed-clouddesk-visa-4242",
      billingCountry: "US",
      isDefault: false,
      status: "ACTIVE",
    },
  })

  await prisma.paymentMethod.create({
    data: {
      organizationId: cloudOrg.id,
      billingAccountId: cloudBilling.id,
      type: "ACH",
      brand: "bank",
      last4: "9910",
      holderName: "CloudDesk Global, Inc.",
      bankName: "JPMorgan Chase",
      fingerprint: "seed-clouddesk-ach-9910",
      billingCountry: "US",
      isDefault: false,
      status: "ACTIVE",
    },
  })

  await prisma.paymentMethod.create({
    data: {
      organizationId: cloudOrg.id,
      billingAccountId: cloudBilling.id,
      type: "INVOICE",
      brand: "invoice",
      last4: "8841",
      holderName: "Accounts Payable",
      fingerprint: "seed-clouddesk-po-8841",
      billingCountry: "US",
      isDefault: true,
      status: "ACTIVE",
    },
  })

  await prisma.invoice.create({
    data: {
      organizationId: cloudOrg.id,
      billingAccountId: cloudBilling.id,
      paymentMethodId: visa.id,
      number: "INV-CLOUD-2026-0001",
      status: "PAID",
      currency: "USD",
      subtotalCents: 79000,
      taxCents: 0,
      totalCents: 79000,
      amountPaidCents: 79000,
      periodStart: now,
      periodEnd: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()),
      dueDate: now,
      paidAt: now,
      lineItemsJson: JSON.stringify([
        { description: "Enterprise plan (yearly)", quantity: 1, unitAmountCents: 79000 },
      ]),
      memo: "Annual MSA · PO-CD-8841",
    },
  })

  await prisma.invoice.create({
    data: {
      organizationId: cloudOrg.id,
      billingAccountId: cloudBilling.id,
      number: "INV-CLOUD-2026-0002",
      status: "OPEN",
      currency: "USD",
      subtotalCents: 15000,
      taxCents: 0,
      totalCents: 15000,
      amountPaidCents: 0,
      periodStart: now,
      periodEnd: periodEnd,
      dueDate: periodEnd,
      lineItemsJson: JSON.stringify([
        { description: "Additional seats (10)", quantity: 10, unitAmountCents: 1500 },
      ]),
      memo: "Net 30 · PO-CD-8841",
    },
  })

  const finBilling = await prisma.billingAccount.create({
    data: {
      organizationId: finOrg.id,
      billingEmail: "finance@finpay.example",
      companyName: "FinPay Technologies Ltd.",
      taxId: "GB123456789",
      taxIdType: "VAT",
      country: "GB",
      currency: "USD",
      collectionMethod: "CHARGE_AUTOMATICALLY",
    },
  })

  await prisma.subscription.create({
    data: {
      organizationId: finOrg.id,
      billingAccountId: finBilling.id,
      planKey: "TEAM",
      status: "ACTIVE",
      billingInterval: "MONTHLY",
      seatQuantity: 10,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    },
  })

  await prisma.paymentMethod.create({
    data: {
      organizationId: finOrg.id,
      billingAccountId: finBilling.id,
      type: "CARD",
      brand: "mastercard",
      last4: "4444",
      expMonth: 9,
      expYear: 2027,
      holderName: "Alex Rivera",
      fingerprint: "seed-finpay-mc-4444",
      billingCountry: "GB",
      isDefault: true,
      status: "ACTIVE",
    },
  })

  console.log("Multi-Tenant database successfully initialized with organizations, memberships, teams, projects, issues, and billing!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
