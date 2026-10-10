import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function runTest() {
  console.log("🧪 Initiating Live Module Test on CLOUD-101...");

  // 1. Find the CLOUD-101 issue
  const issue = await prisma.issue.findFirst({
    where: { key: "CLOUD-101" },
    include: { reporter: true, assignee: true, comments: true },
  });

  if (!issue) {
    console.log("❌ Issue CLOUD-101 not found.");
    return;
  }

  console.log(`✅ Found Issue: ${issue.key} - ${issue.title}`);
  console.log(`Current Status: ${issue.status}`);

  // 2. Add a test comment
  const newComment = await prisma.comment.create({
    data: {
      content: "✅ QA Automated Test: Successfully tested commenting and status updates!",
      issueId: issue.id,
      authorId: (issue.assigneeId || issue.reporterId) as string,
    },
  });
  console.log(`✅ Added test comment: "${newComment.content}"`);

  // 3. Update the status
  const updatedIssue = await prisma.issue.update({
    where: { id: issue.id },
    data: {
      status: "RESOLVED",
    },
  });
  console.log(`✅ Changed status from ${issue.status} -> ${updatedIssue.status}`);

  console.log("🎉 Module test completed successfully!");
}

runTest()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

