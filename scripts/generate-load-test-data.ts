import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Helper for deterministic random choices
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const FIRST_NAMES = [
  "Rahul", "Sarah", "Alex", "Elena", "Marcus", "Priya", "David", "Amina", "Chen", "Yuki",
  "Lucas", "Sophia", "Liam", "Olivia", "Noah", "Emma", "Ethan", "Ava", "Mason", "Isabella",
  "Devon", "Chloe", "Arjun", "Zara", "Vikram", "Mei", "Carlos", "Fatima", "Dmitri", "Astrid",
  "Kavita", "Siddharth", "Nia", "Ravi", "Ananya", "Mateo", "Freja", "Kenji", "Tara", "Gabriel",
  "Leila", "Soren", "Deepa", "Hugo", "Sunita", "Tariq", "Hanna", "Rajesh", "Camila", "Kiran"
];

const LAST_NAMES = [
  "Garg", "Chen", "Rivera", "Rostova", "Vance", "Mittal", "Kowalski", "Diallo", "Wei", "Tanaka",
  "Moreau", "Lindqvist", "Patel", "Sharma", "Nakamura", "Dubois", "Alves", "O'Connor", "Novak", "Santos",
  "Kapoor", "Mendoza", "Johansson", "Bauer", "Popov", "Rossi", "Hassan", "Kim", "Zhang", "Natarajan"
];

const JOB_TITLES = [
  "Lead Architect & Engineer", "Principal Systems Engineer", "Senior Backend Engineer",
  "Senior Frontend Engineer", "Staff Infrastructure Engineer", "QA Automation Lead",
  "Security & Compliance Specialist", "DevOps & SRE Engineer", "Product Manager",
  "Engineering Manager", "Database Reliability Engineer", "Fullstack Developer"
];

const AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80"
];

const ORG_SPECS = [
  { name: "CloudDesk Global", slug: "clouddesk", plan: "ENTERPRISE" },
  { name: "FinPay Technologies", slug: "finpay", plan: "PRO" },
  { name: "CyberGuard Security Platform", slug: "cyberguard", plan: "ENTERPRISE" },
  { name: "OmniFlow E-Commerce Suite", slug: "omniflow", plan: "BUSINESS" },
  { name: "DataMesh Analytics Engine", slug: "datamesh", plan: "ENTERPRISE" },
  { name: "Nexus AI Infrastructure", slug: "nexus-ai", plan: "ENTERPRISE" },
  { name: "HyperScale Storage Gateway", slug: "hyperscale", plan: "PRO" },
  { name: "PulseHealth Telemedicine API", slug: "pulsehealth", plan: "BUSINESS" },
  { name: "VectorSearch Core Engine", slug: "vectorsearch", plan: "ENTERPRISE" },
  { name: "QuantumEdge CDN Network", slug: "quantumedge", plan: "ENTERPRISE" },
];

const PROJECT_SPECS = [
  // CloudDesk
  { orgSlug: "clouddesk", key: "CLOUD", name: "CloudDesk Core Platform", cat: "Cloud Infrastructure" },
  { orgSlug: "clouddesk", key: "GATEWAY", name: "Edge API Gateway & Routing", cat: "Networking" },
  { orgSlug: "clouddesk", key: "K8S", name: "Kubernetes Cluster Controller", cat: "DevOps" },
  // FinPay
  { orgSlug: "finpay", key: "FIN", name: "FinPay Core Payment Ledger", cat: "Fintech & Payments" },
  { orgSlug: "finpay", key: "CHECKOUT", name: "Hosted Checkout & 3DS2 Flow", cat: "Payments" },
  { orgSlug: "finpay", key: "WALLET", name: "Consumer Mobile Wallet", cat: "Mobile" },
  // CyberGuard
  { orgSlug: "cyberguard", key: "SEC", name: "Threat Detection Engine", cat: "Cybersecurity" },
  { orgSlug: "cyberguard", key: "SIEM", name: "Enterprise SIEM Pipeline", cat: "Security Analytics" },
  // OmniFlow
  { orgSlug: "omniflow", key: "OMNI", name: "OmniFlow Headless Storefront", cat: "E-Commerce" },
  { orgSlug: "omniflow", key: "CART", name: "Real-time Inventory & Cart", cat: "Microservices" },
  // DataMesh
  { orgSlug: "datamesh", key: "DATA", name: "Real-time OLAP Engine", cat: "Big Data" },
  { orgSlug: "datamesh", key: "ETL", name: "Kafka Streaming Ingestion", cat: "Data Pipelines" },
  // Nexus AI
  { orgSlug: "nexus-ai", key: "AI", name: "LLM Inference Serving Cluster", cat: "Artificial Intelligence" },
  { orgSlug: "nexus-ai", key: "AGENT", name: "Autonomous Agent Orchestrator", cat: "AI Automation" },
  // HyperScale
  { orgSlug: "hyperscale", key: "STORE", name: "S3-Compatible Object Store", cat: "Distributed Storage" },
  { orgSlug: "hyperscale", key: "BLOB", name: "Erasure Coding & Replication", cat: "Storage Systems" },
  // PulseHealth
  { orgSlug: "pulsehealth", key: "MED", name: "HIPAA Compliant Telehealth API", cat: "Healthcare" },
  { orgSlug: "pulsehealth", key: "EHR", name: "Electronic Health Records Sync", cat: "Integration" },
  // VectorSearch
  { orgSlug: "vectorsearch", key: "VEC", name: "HNSW Vector Indexing Core", cat: "Search Systems" },
  { orgSlug: "vectorsearch", key: "EMBED", name: "Embedding Pipeline & Quantization", cat: "Information Retrieval" },
  // QuantumEdge
  { orgSlug: "quantumedge", key: "EDGE", name: "Anycast Edge Caching Network", cat: "CDN & Edge Computing" },
  { orgSlug: "quantumedge", key: "DNS", name: "Ultra-low Latency Authoritative DNS", cat: "Infrastructure" },
];

const ISSUE_COMPONENTS = [
  "API Gateway", "Auth Service", "Billing Engine", "Webhook Dispatcher", "Database Pool",
  "Redis Cluster", "WebSocket Server", "Search Indexer", "Blob Uploader", "Payment Processor",
  "Rate Limiter", "Kafka Producer", "Session Manager", "Worker Queue", "GraphQL Resolver"
];

const ENVIRONMENTS = [
  "Production (Kubernetes us-east-1)",
  "Production (Multi-Region EU/US)",
  "Staging (Staging-02 Cluster)",
  "Canary (us-west-2 Pods)",
  "Development (Local Docker)",
  "Pre-Release Certification"
];

const ISSUE_TEMPLATES = [
  {
    title: "WebSocket connection pool starvation under high concurrent reconnects",
    desc: "When >2,500 clients reconnect following a network blip, the connection pool exhausts all handles and rejects valid handshakes with 503 Service Unavailable.",
    steps: "1. Spawn 3,000 WebSocket clients in k6.\n2. Simulate abrupt network drop.\n3. Observe TCP TIME_WAIT socket backlog.",
    expected: "Connections gracefully queued and admitted with exponential backoff.",
    actual: "Fatal socket pool exhaustion, CPU usage spikes to 100%.",
    type: "BUG",
    severity: "CRITICAL",
    priority: "URGENT",
  },
  {
    title: "Stripe checkout webhook idempotency key race condition in multi-pod setup",
    desc: "Simultaneous duplicate webhook delivery from Stripe results in double crediting when two workers process identical event IDs concurrently.",
    steps: "1. Fire identical charge.succeeded webhook simultaneously from two curl instances.\n2. Verify ledger balances.",
    expected: "Distributed Redis lock prevents secondary transaction insertion.",
    actual: "Both workers pass unique constraint and create duplicate ledger entries.",
    type: "BUG",
    severity: "CRITICAL",
    priority: "HIGH",
  },
  {
    title: "Implement distributed rate limiting via Redis token bucket sliding window",
    desc: "Replace in-memory rate limiting with distributed cluster-aware Redis sliding window algorithm to safeguard enterprise API routes from DDoS bursts.",
    steps: "1. Configure RateLimiter middleware with 500 req/min.\n2. Benchmark using Vegeta at 1,000 req/s across 4 instances.",
    expected: "Uniform 429 Too Many Requests response with Retry-After headers.",
    actual: "Feature needed.",
    type: "FEATURE",
    severity: "MAJOR",
    priority: "HIGH",
  },
  {
    title: "PostgreSQL query execution plan degradation on large full-text defect search",
    desc: "Searches containing stop-words fall back to sequential table scan when query string exceeds 64 characters, causing 4.8s p99 latency.",
    steps: "1. Navigate to Global Issues search.\n2. Enter complex query: 'memory leak under socket exhaustion'.\n3. Check EXPLAIN ANALYZE.",
    expected: "GIN trigram index scan completes in < 45ms.",
    actual: "Sequential scan consumes 100% of single worker core.",
    type: "BUG",
    severity: "MAJOR",
    priority: "MEDIUM",
  },
  {
    title: "Add export to SARIF & OpenAPI 3.1 schema for defect vulnerability scans",
    desc: "Enable security researchers and automated scanners to import defect reports into GitHub Security and Snyk via standardized SARIF v2.1.0 format.",
    steps: "1. Open Project Settings.\n2. Click 'Export Vulnerabilities as SARIF'.",
    expected: "Valid JSON conforms to OASIS SARIF JSON schema.",
    actual: "Feature pending implementation.",
    type: "IMPROVEMENT",
    severity: "MINOR",
    priority: "MEDIUM",
  },
  {
    title: "JWT token verification fails on clock drift exceeding 250ms across zones",
    desc: "Auth.js session verification rejects tokens issued by European auth servers when US edge gateways have slight NTP drift.",
    steps: "1. Login via EU node.\n2. Route API call through US edge gateway with +300ms simulated clock drift.",
    expected: "Leeway leeway tolerance of 15 seconds applied to JWT verification.",
    actual: "TokenExpiredError: jwt expired at timestamp.",
    type: "BUG",
    severity: "CRITICAL",
    priority: "URGENT",
  },
  {
    title: "Memory leak in Server-Sent Events (SSE) notification streaming loop",
    desc: "Active client disconnections do not trigger cleanup of event emitter listeners, accumulating 12MB of leaked heap memory per hour.",
    steps: "1. Open 50 browser tabs.\n2. Rapidly close all tabs.\n3. Take Node.js V8 heap snapshot.",
    expected: "All listener references garbage collected immediately.",
    actual: "Heap retains uncollected StreamListener objects.",
    type: "BUG",
    severity: "MAJOR",
    priority: "HIGH",
  },
  {
    title: "Migrate database connection pooling to PgBouncer with transaction-level mode",
    desc: "Improve peak query throughput and reduce connection overhead by switching from session pooling to transaction pooling.",
    steps: "1. Deploy PgBouncer sidecar.\n2. Configure max_client_conn=5000 and default_pool_size=50.",
    expected: "Zero connection exhaustion errors under 10k concurrent simulated users.",
    actual: "Architecture optimization task.",
    type: "TASK",
    severity: "MINOR",
    priority: "MEDIUM",
  },
  {
    title: "Cross-tenant data isolation regression in custom field query filter",
    desc: "A custom field with identical fieldKey across two organizations returns values belonging to the sibling tenant when querying without orgId qualification.",
    steps: "1. Create custom field 'customer_tier' in Org A.\n2. Create same field in Org B.\n3. Execute query on Org A with raw filter.",
    expected: "Zero cross-tenant leakage; strict orgId tenant barrier enforced.",
    actual: "Sibling organization values briefly visible.",
    type: "BUG",
    severity: "BLOCKER",
    priority: "URGENT",
  },
  {
    title: "Support ACH Direct Debit & SEPA instant payments in checkout flow",
    desc: "Add bank account tokenization and micro-deposit verification for high-volume enterprise invoicing.",
    steps: "1. Select Bank Account in Payment Methods.\n2. Enter Routing Number and Account Number.\n3. Submit tokenization.",
    expected: "ACH token created with pending mandate verification status.",
    actual: "Only credit card tokenization currently enabled.",
    type: "FEATURE",
    severity: "MAJOR",
    priority: "HIGH",
  },
  {
    title: "Next.js 16 Server Component hydration mismatch on user localized timestamp",
    desc: "Server rendered Date format using UTC produces hydration mismatch warning when client hydrates with local timezone (IST/EST).",
    steps: "1. Render Issue Detail View on cold cache.\n2. Check browser console logs for hydration warnings.",
    expected: "Use suppressHydrationWarning or standard ISO formatted date wrappers.",
    actual: "Hydration failed because initial UI does not match what was rendered on the server.",
    type: "BUG",
    severity: "MINOR",
    priority: "LOW",
  },
  {
    title: "Optimize Kanban drag-and-drop state updates with optimistic UI updates",
    desc: "Moving an issue from TODO to IN_PROGRESS waits for server round-trip before updating column UI, feeling sluggish on high-latency networks.",
    steps: "1. Drag issue across columns with 300ms simulated network throttling.\n2. Observe card behavior.",
    expected: "Card snaps instantly to target column, rolls back only on server error.",
    actual: "Card flickers back to original position until server responds.",
    type: "IMPROVEMENT",
    severity: "MINOR",
    priority: "MEDIUM",
  }
];

const COMMENT_SNIPPETS = [
  "Verified in staging cluster `stg-us-east-1`. Repro rate is approximately 85% with concurrent load.",
  "Root cause identified: unhandled Promise rejection in `pool.acquire()` timeout handler. Opening fix PR now.",
  "Patch deployed to canary environment. Observing error metrics in Grafana dashboard.",
  "Added regression test covering the edge condition with 5,000 simulated client connections.",
  "Code review approved. Ready for QA sign-off in the next sprint deployment.",
  "Stack trace indicates the memory retention occurs in the event emitter listener array at line 142.",
  "Confirmed fix resolved the issue without impacting baseline p99 latency.",
  "Security team reviewed the mitigation: verified zero residual privilege escalation vectors.",
  "Load testing with k6 at 2,000 req/s confirmed no dropped transactions.",
  "Updated documentation and OpenAPI schema definition to reflect the updated validation parameters."
];

export async function generateLoadTestData() {
  const startTime = Date.now();
  console.log("==========================================================");
  console.log("⚡ STARTING HIGH-VOLUME DUMMY DATA GENERATION FOR LOAD TESTING");
  console.log("==========================================================");

  const defaultPassword = await bcrypt.hash("password123", 10);

  // 1. Ensure / Create 50 Core Users
  console.log("Creating/verifying 50 engineering users...");
  const users: Array<any> = [];

  // Always guarantee rahul@bugtracker.io as primary admin
  const rahul = await prisma.user.upsert({
    where: { email: "rahul@bugtracker.io" },
    update: {
      name: "Rahul Garg",
      password: defaultPassword,
      status: "ACTIVE",
      jobTitle: "Lead Architect & Chief Engineer",
      avatar: AVATARS[0],
    },
    create: {
      name: "Rahul Garg",
      email: "rahul@bugtracker.io",
      password: defaultPassword,
      status: "ACTIVE",
      jobTitle: "Lead Architect & Chief Engineer",
      avatar: AVATARS[0],
    },
  });
  users.push(rahul);

  // Generate 49 additional realistic team members
  for (let i = 1; i < 50; i++) {
    const fn = FIRST_NAMES[i % FIRST_NAMES.length];
    const ln = LAST_NAMES[(i * 3) % LAST_NAMES.length];
    const email = `${fn.toLowerCase()}.${ln.toLowerCase()}${i > 25 ? i : ""}@bugtracker.io`;
    const name = `${fn} ${ln}`;
    const avatar = AVATARS[i % AVATARS.length];
    const jobTitle = JOB_TITLES[i % JOB_TITLES.length];

    const u = await prisma.user.upsert({
      where: { email },
      update: { name, password: defaultPassword, status: "ACTIVE", jobTitle, avatar },
      create: { name, email, password: defaultPassword, status: "ACTIVE", jobTitle, avatar },
    });
    users.push(u);
  }
  console.log(`✓ 50 Users prepared (All have password: "password123")`);

  // 2. Create 10 Enterprise Organizations
  console.log("Creating 10 enterprise organizations & billing accounts...");
  const orgs: Record<string, any> = {};

  for (const spec of ORG_SPECS) {
    const org = await prisma.organization.upsert({
      where: { slug: spec.slug },
      update: { name: spec.name, plan: spec.plan },
      create: { name: spec.name, slug: spec.slug, plan: spec.plan },
    });
    orgs[spec.slug] = org;

    // Membership: Rahul is OWNER of CloudDesk and ADMIN/MEMBER in all others
    await prisma.membership.upsert({
      where: {
        organizationId_userId: {
          organizationId: org.id,
          userId: rahul.id,
        },
      },
      update: { role: spec.slug === "clouddesk" ? "OWNER" : "ADMIN" },
      create: {
        organizationId: org.id,
        userId: rahul.id,
        role: spec.slug === "clouddesk" ? "OWNER" : "ADMIN",
      },
    });

    // Add 10-15 random users to this org
    for (let uIdx = 1; uIdx <= 15; uIdx++) {
      const u = users[uIdx % users.length];
      await prisma.membership.upsert({
        where: {
          organizationId_userId: {
            organizationId: org.id,
            userId: u.id,
          },
        },
        update: { role: uIdx % 3 === 0 ? "ADMIN" : "MEMBER" },
        create: {
          organizationId: org.id,
          userId: u.id,
          role: uIdx % 3 === 0 ? "ADMIN" : "MEMBER",
        },
      });
    }

    // Billing Account & Subscription
    let billingAccount = await prisma.billingAccount.findUnique({
      where: { organizationId: org.id },
    });
    if (!billingAccount) {
      billingAccount = await prisma.billingAccount.create({
        data: {
          organizationId: org.id,
          billingEmail: `billing@${spec.slug}.io`,
          companyName: spec.name,
          currency: "USD",
          collectionMethod: "CHARGE_AUTOMATICALLY",
          taxId: `US-EIN-${randInt(10, 99)}-${randInt(1000000, 9999999)}`,
          taxIdType: "EIN",
          addressLine1: `${randInt(100, 999)} Tech Boulevard, Suite ${randInt(100, 900)}`,
          city: "San Francisco",
          region: "CA",
          postalCode: "94105",
          country: "US",
        },
      });
    }

    // Subscription
    const existingSub = await prisma.subscription.findUnique({
      where: { organizationId: org.id },
    });
    if (!existingSub) {
      await prisma.subscription.create({
        data: {
          organizationId: org.id,
          billingAccountId: billingAccount.id,
          planKey: spec.plan === "PRO" ? "BUSINESS" : spec.plan,
          status: "ACTIVE",
          billingInterval: "MONTHLY",
          seatQuantity: 25,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    }

    // Payment Methods
    const existingPms = await prisma.paymentMethod.findMany({
      where: { organizationId: org.id },
    });
    let defaultPmId: string | undefined = existingPms[0]?.id;
    if (existingPms.length === 0) {
      const pm1 = await prisma.paymentMethod.create({
        data: {
          organizationId: org.id,
          billingAccountId: billingAccount.id,
          type: "CARD",
          brand: "visa",
          last4: "4242",
          expMonth: 12,
          expYear: 2028,
          holderName: `${spec.name} Treasury`,
          fingerprint: `fp_visa_${org.id.slice(-6)}`,
          billingCountry: "US",
          isDefault: true,
          status: "ACTIVE",
        },
      });
      const pm2 = await prisma.paymentMethod.create({
        data: {
          organizationId: org.id,
          billingAccountId: billingAccount.id,
          type: "ACH",
          bankName: "Silicon Valley Bank",
          last4: "9876",
          holderName: `${spec.name} Corporate Checking`,
          fingerprint: `fp_ach_${org.id.slice(-6)}`,
          billingCountry: "US",
          isDefault: false,
          status: "ACTIVE",
        },
      });
      defaultPmId = pm1.id;
    }

    // Invoices & Payment Transactions for Billing Load Testing
    const invoiceCount = await prisma.invoice.count({ where: { organizationId: org.id } });
    if (invoiceCount < 10) {
      for (let invIdx = 1; invIdx <= 12; invIdx++) {
        const monthOffset = invIdx;
        const periodStart = new Date(Date.now() - monthOffset * 30 * 24 * 60 * 60 * 1000);
        const periodEnd = new Date(periodStart.getTime() + 30 * 24 * 60 * 60 * 1000);
        const subtotal = [2900, 7900, 19900, 49900, 120000][invIdx % 5];
        const tax = Math.round(subtotal * 0.0825);
        const total = subtotal + tax;
        const isPaid = invIdx > 1;

        const inv = await prisma.invoice.create({
          data: {
            organizationId: org.id,
            billingAccountId: billingAccount.id,
            paymentMethodId: defaultPmId,
            number: `INV-${spec.slug.slice(0, 6).toUpperCase()}-2026-${String(invIdx).padStart(4, "0")}`,
            status: isPaid ? "PAID" : "OPEN",
            currency: "USD",
            subtotalCents: subtotal,
            taxCents: tax,
            totalCents: total,
            amountPaidCents: isPaid ? total : 0,
            periodStart,
            periodEnd,
            dueDate: new Date(periodEnd.getTime() + 7 * 24 * 60 * 60 * 1000),
            paidAt: isPaid ? new Date(periodEnd.getTime() + 1 * 24 * 60 * 60 * 1000) : null,
            lineItemsJson: JSON.stringify([
              { description: `${spec.name} Enterprise Subscription (25 Seats)`, quantity: 1, unitAmountCents: subtotal },
              { description: "API Priority Burst Quota", quantity: 1, unitAmountCents: 0 }
            ]),
            memo: "Standard automated monthly billing cycle",
          },
        });

        // Associated Payment Transaction
        await prisma.paymentTransaction.create({
          data: {
            organizationId: org.id,
            billingAccountId: billingAccount.id,
            invoiceId: inv.id,
            paymentMethodId: defaultPmId,
            amountCents: total,
            currency: "USD",
            status: isPaid ? "SUCCEEDED" : "PENDING",
            type: "CHARGE",
            gateway: "STRIPE_SANDBOX",
            gatewayTransactionId: `ch_test_${org.id.slice(-4)}_${invIdx}_${Date.now().toString(36)}`,
            gatewayResponseCode: isPaid ? "APPROVED_00" : "PROCESSING",
          },
        });
      }
    }
  }
  console.log(`✓ 10 Organizations, Subscriptions, and Invoices seeded`);

  // 3. Create 22 Projects
  console.log("Creating 22 enterprise projects and sprints...");
  const projects: Record<string, any> = {};
  const sprints: Record<string, string[]> = {};
  const milestones: Record<string, string[]> = {};

  for (const ps of PROJECT_SPECS) {
    const org = orgs[ps.orgSlug];
    if (!org) continue;

    let project = await prisma.project.findFirst({
      where: { organizationId: org.id, key: ps.key },
    });
    if (!project) {
      project = await prisma.project.create({
        data: {
          organizationId: org.id,
          name: ps.name,
          key: ps.key,
          description: `Production repository for ${ps.name}. High-throughput architecture and defect tracking.`,
          category: ps.cat,
          status: "ACTIVE",
          ownerId: rahul.id,
          createdById: rahul.id,
        },
      });
    } else {
      project = await prisma.project.update({
        where: { id: project.id },
        data: { name: ps.name, category: ps.cat },
      });
    }
    projects[ps.key] = project;

    // Add Project Members
    await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: project.id, userId: rahul.id } },
      update: { role: "MANAGER" },
      create: { projectId: project.id, userId: rahul.id, role: "MANAGER" },
    });

    for (let uI = 1; uI <= 6; uI++) {
      const u = users[uI % users.length];
      await prisma.projectMember.upsert({
        where: { projectId_userId: { projectId: project.id, userId: u.id } },
        update: { role: "CONTRIBUTOR" },
        create: { projectId: project.id, userId: u.id, role: "CONTRIBUTOR" },
      });
    }

    // Sprints
    sprints[ps.key] = [];
    for (let sI = 1; sI <= 3; sI++) {
      const sprintName = `Sprint ${sI + 10} - Release Cycle`;
      let sp = await prisma.sprint.findFirst({
        where: { projectId: project.id, name: sprintName },
      });
      if (!sp) {
        sp = await prisma.sprint.create({
          data: {
            organizationId: org.id,
            projectId: project.id,
            name: sprintName,
            goal: `Zero-defect target for ${ps.name} core features and stress testing`,
            status: sI === 1 ? "ACTIVE" : sI === 2 ? "PLANNING" : "COMPLETED",
            startDate: new Date(Date.now() - (sI === 3 ? 20 : 0) * 24 * 60 * 60 * 1000),
            endDate: new Date(Date.now() + (sI === 1 ? 14 : sI === 2 ? 28 : -6) * 24 * 60 * 60 * 1000),
            totalPoints: 42,
            completedPoints: sI === 3 ? 42 : sI === 1 ? 28 : 0,
          },
        });
      }
      sprints[ps.key].push(sp.id);
    }

    // Milestones
    milestones[ps.key] = [];
    const mName = `v2.4 Q4 Enterprise Release`;
    let ms = await prisma.milestone.findFirst({
      where: { projectId: project.id, name: mName },
    });
    if (!ms) {
      ms = await prisma.milestone.create({
        data: {
          name: mName,
          description: `Enterprise GA certification, RBAC audit, and latency SLA verification`,
          status: "OPEN",
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          projectId: project.id,
        },
      });
    }
    milestones[ps.key].push(ms.id);
  }
  console.log(`✓ 22 Projects, Sprints, and Milestones configured`);

  // 4. Generate 2,000+ Rich Issues / Defects
  console.log("Generating 2,000+ realistic defects and issues in fast chunks...");

  const existingIssueCount = await prisma.issue.count();
  console.log(`Current existing issues in database: ${existingIssueCount}`);

  const TARGET_ISSUES = 2000;
  const issuesToCreate: any[] = [];
  const projectKeys = Object.keys(projects);

  const STATUSES = ["TODO", "IN_PROGRESS", "CODE_REVIEW", "QA", "DONE", "CLOSED", "BACKLOG", "REOPENED"];
  const PRIORITIES = ["LOWEST", "LOW", "MEDIUM", "HIGH", "CRITICAL", "URGENT"];
  const SEVERITIES = ["TRIVIAL", "MINOR", "MAJOR", "CRITICAL", "BLOCKER"];
  const TYPES = ["BUG", "BUG", "BUG", "FEATURE", "TASK", "IMPROVEMENT", "STORY"];

  let issueNumberCounter = existingIssueCount + 100;

  for (let i = 0; i < TARGET_ISSUES; i++) {
    const pKey = projectKeys[i % projectKeys.length];
    const project = projects[pKey];
    const org = orgs[PROJECT_SPECS.find(p => p.key === pKey)?.orgSlug || "clouddesk"];
    const tmpl = ISSUE_TEMPLATES[i % ISSUE_TEMPLATES.length];

    const issueNum = ++issueNumberCounter;
    const issueKey = `${pKey}-${issueNum}`;
    const assignee = users[randInt(0, users.length - 1)];
    const reporter = users[randInt(0, users.length - 1)];
    const moduleName = ISSUE_COMPONENTS[i % ISSUE_COMPONENTS.length];
    const env = ENVIRONMENTS[i % ENVIRONMENTS.length];
    const status = pick(STATUSES);
    const priority = pick(PRIORITIES);
    const severity = pick(SEVERITIES);
    const type = pick(TYPES);

    const sprintList = sprints[pKey] || [];
    const msList = milestones[pKey] || [];
    const sprintId = sprintList.length > 0 ? pick(sprintList) : null;
    const milestoneId = msList.length > 0 ? pick(msList) : null;

    const createdAt = new Date(Date.now() - randInt(1, 90) * 24 * 60 * 60 * 1000 + randInt(0, 86400000));
    const dueDate = new Date(Date.now() + randInt(1, 45) * 24 * 60 * 60 * 1000);

    issuesToCreate.push({
      id: `iss_${issueKey.toLowerCase()}_${Date.now().toString(36)}_${i}`,
      organizationId: org.id,
      projectId: project.id,
      key: issueKey,
      number: issueNum,
      title: `${tmpl.title} [Part ${Math.floor(i / ISSUE_TEMPLATES.length) + 1}]`,
      description: `### Summary\n${tmpl.desc}\n\n### Environment Details\n- **Host Cluster:** ${env}\n- **Subsystem:** ${moduleName}\n- **Kernel / Node Version:** v22.14.0 LTS\n\n### Reproduction Steps\n${tmpl.steps}\n\n### Expected vs Actual\n**Expected:** ${tmpl.expected}\n\n**Actual:** ${tmpl.actual}`,
      type,
      status,
      priority,
      severity: type === "BUG" ? severity : null,
      environment: env,
      module: moduleName,
      reproducibility: pick(["Always", "Sometimes", "Rarely"]),
      stepsToReproduce: tmpl.steps,
      expectedResult: tmpl.expected,
      actualResult: tmpl.actual,
      estimate: pick([2, 4, 8, 16, 24, 40]),
      timeSpent: status === "DONE" || status === "CLOSED" ? pick([4, 8, 16, 32]) : pick([0, 1.5, 3]),
      storyPoints: pick([1, 2, 3, 5, 8, 13]),
      dueDate,
      assigneeId: assignee.id,
      reporterId: reporter.id,
      sprintId,
      milestoneId,
      createdAt,
      updatedAt: new Date(createdAt.getTime() + randInt(3600000, 86400000)),
    });
  }

  // Insert issues in high-speed batches of 400
  const CHUNK_SIZE = 400;
  console.log(`Inserting ${issuesToCreate.length} issues in batches of ${CHUNK_SIZE}...`);
  for (let c = 0; c < issuesToCreate.length; c += CHUNK_SIZE) {
    const chunk = issuesToCreate.slice(c, c + CHUNK_SIZE);
    await prisma.issue.createMany({
      data: chunk,
    });
    process.stdout.write(`  Inserted ${Math.min(c + CHUNK_SIZE, issuesToCreate.length)} / ${issuesToCreate.length} issues\r`);
  }
  console.log(`\n✓ Inserted ${issuesToCreate.length} issues successfully!`);

  // 5. Generate Comments, TimeLogs, and Audit Activities
  console.log("Generating 2,500+ comments and 1,000+ time logs for load testing...");
  const sampleIssues = issuesToCreate.slice(0, 1200);

  const commentsToCreate: any[] = [];
  const timeLogsToCreate: any[] = [];

  for (let i = 0; i < sampleIssues.length; i++) {
    const iss = sampleIssues[i];
    const author = users[randInt(0, users.length - 1)];

    // 1-2 comments per issue
    commentsToCreate.push({
      id: `comm_${iss.key.toLowerCase()}_${i}_1`,
      issueId: iss.id,
      authorId: author.id,
      content: pick(COMMENT_SNIPPETS),
      createdAt: new Date(iss.createdAt.getTime() + randInt(1800000, 7200000)),
      updatedAt: new Date(iss.createdAt.getTime() + randInt(1800000, 7200000)),
    });

    if (i % 2 === 0) {
      const author2 = users[(randInt(0, users.length - 1) + 1) % users.length];
      commentsToCreate.push({
        id: `comm_${iss.key.toLowerCase()}_${i}_2`,
        issueId: iss.id,
        authorId: author2.id,
        content: `Following up on ${iss.key}: automated CI build passed on latest commit hash. Verified fix in integration suite.`,
        createdAt: new Date(iss.createdAt.getTime() + randInt(7200000, 14400000)),
        updatedAt: new Date(iss.createdAt.getTime() + randInt(7200000, 14400000)),
      });
    }

    // TimeLog
    if (iss.timeSpent > 0) {
      timeLogsToCreate.push({
        id: `time_${iss.key.toLowerCase()}_${i}`,
        organizationId: iss.organizationId,
        issueId: iss.id,
        userId: iss.assigneeId,
        timeSpent: iss.timeSpent,
        description: `Investigated root cause, wrote test reproduction, and patched defect in ${iss.module}.`,
        billable: true,
        loggedAt: iss.createdAt,
      });
    }
  }

  // Batch insert comments
  console.log(`Inserting ${commentsToCreate.length} engineering comments...`);
  for (let c = 0; c < commentsToCreate.length; c += CHUNK_SIZE) {
    const chunk = commentsToCreate.slice(c, c + CHUNK_SIZE);
    await prisma.comment.createMany({ data: chunk });
  }

  // Batch insert time logs
  console.log(`Inserting ${timeLogsToCreate.length} time log records...`);
  for (let c = 0; c < timeLogsToCreate.length; c += CHUNK_SIZE) {
    const chunk = timeLogsToCreate.slice(c, c + CHUNK_SIZE);
    await prisma.timeLog.createMany({ data: chunk });
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log("==========================================================");
  console.log(`🎉 LOAD TESTING DATA GENERATION COMPLETE in ${durationSec}s!`);
  console.log(`📊 Total Users:         ${await prisma.user.count()}`);
  console.log(`🏢 Total Organizations: ${await prisma.organization.count()}`);
  console.log(`📁 Total Projects:      ${await prisma.project.count()}`);
  console.log(`⚡ Total Issues:        ${await prisma.issue.count()}`);
  console.log(`💬 Total Comments:      ${await prisma.comment.count()}`);
  console.log(`⏱️ Total Time Logs:     ${await prisma.timeLog.count()}`);
  console.log(`💳 Total Transactions:  ${await prisma.paymentTransaction.count()}`);
  console.log(`🧾 Total Invoices:      ${await prisma.invoice.count()}`);
  console.log("==========================================================");
}

// Run immediately if executed via CLI
if (require.main === module || process.argv[1]?.includes("generate-load-test-data")) {
  generateLoadTestData()
    .then(async () => {
      await prisma.$disconnect();
      process.exit(0);
    })
    .catch(async (e) => {
      console.error("Error generating load test data:", e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
