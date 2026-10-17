import { describe, expect, it } from "vitest";
import {
  addCommentSchema,
  addRelationshipSchema,
  bugSeverityEnum,
  createIssueSchema,
  createLabelSchema,
  issuePriorityEnum,
  issueStatusEnum,
  issueTypeEnum,
  updateIssueSchema,
  updateIssueStatusSchema,
} from "@/lib/validations/issue";

describe("issue validation schemas", () => {
  it("accepts every supported issue type, priority, status, and severity", () => {
    for (const type of issueTypeEnum.options) {
      expect(createIssueSchema.safeParse({ title: "Valid issue", type }).success)
        .toBe(true);
    }
    for (const priority of issuePriorityEnum.options) {
      expect(
        createIssueSchema.safeParse({ title: "Valid issue", priority }).success,
      ).toBe(true);
    }
    for (const status of issueStatusEnum.options) {
      expect(
        updateIssueStatusSchema.safeParse({ status }).success,
      ).toBe(true);
    }
    for (const severity of bugSeverityEnum.options) {
      expect(
        createIssueSchema.safeParse({ title: "Valid issue", severity }).success,
      ).toBe(true);
    }
  });

  it("applies create defaults and trims a valid title", () => {
    const parsed = createIssueSchema.safeParse({ title: "  Fix crash  " });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.title).toBe("Fix crash");
      expect(parsed.data.type).toBe("TASK");
      expect(parsed.data.priority).toBe("MEDIUM");
      expect(parsed.data.status).toBe("TODO");
    }
  });

  it.each(["", "x", " ".repeat(2)])(
    "rejects a title shorter than two non-whitespace characters: %j",
    (title) => {
      expect(createIssueSchema.safeParse({ title }).success).toBe(false);
    },
  );

  it("accepts issue title and description at their maximum lengths", () => {
    expect(
      createIssueSchema.safeParse({
        title: "T".repeat(255),
        description: "D".repeat(30000),
      }).success,
    ).toBe(true);
  });

  it("rejects issue title and description over their maximum lengths", () => {
    expect(
      createIssueSchema.safeParse({ title: "T".repeat(256) }).success,
    ).toBe(false);
    expect(
      createIssueSchema.safeParse({
        title: "Valid issue",
        description: "D".repeat(30001),
      }).success,
    ).toBe(false);
  });

  it("validates numeric issue fields at their boundaries", () => {
    expect(
      createIssueSchema.safeParse({
        title: "Valid issue",
        storyPoints: 0,
        estimate: 1000,
      }).success,
    ).toBe(true);
    expect(
      createIssueSchema.safeParse({
        title: "Valid issue",
        storyPoints: 100,
        estimate: 0,
      }).success,
    ).toBe(true);
    for (const payload of [
      { storyPoints: -1 },
      { storyPoints: 101 },
      { estimate: -1 },
      { estimate: 1001 },
    ]) {
      expect(
        createIssueSchema.safeParse({ title: "Valid issue", ...payload })
          .success,
      ).toBe(false);
    }
  });

  it("accepts nullable references and date values on issue creation", () => {
    expect(
      createIssueSchema.safeParse({
        title: "Valid issue",
        assigneeId: null,
        parentIssueId: null,
        milestoneId: null,
        sprintId: null,
        epicId: null,
        storyPoints: null,
        startDate: new Date("2026-01-01T00:00:00.000Z"),
        targetDate: "2026-01-02T00:00:00.000Z",
        dueDate: null,
      }).success,
    ).toBe(true);
  });

  it("rejects malformed dates and invalid optional field lengths", () => {
    expect(
      createIssueSchema.safeParse({
        title: "Valid issue",
        dueDate: "not-a-date",
      }).success,
    ).toBe(false);
    expect(
      createIssueSchema.safeParse({
        title: "Valid issue",
        environment: "E".repeat(101),
      }).success,
    ).toBe(false);
    expect(
      createIssueSchema.safeParse({
        title: "Valid issue",
        appVersion: "V".repeat(51),
      }).success,
    ).toBe(false);
  });

  it("enforces every specialized bug text field limit on create and update", () => {
    const limits = [
      ["environment", 100],
      ["module", 100],
      ["reproducibility", 100],
      ["operatingSystem", 100],
      ["browser", 100],
      ["device", 100],
      ["appVersion", 50],
      ["stepsToReproduce", 10000],
      ["expectedResult", 5000],
      ["actualResult", 5000],
      ["logs", 20000],
      ["stackTrace", 20000],
      ["component", 100],
    ] as const;

    for (const [field, maxLength] of limits) {
      const validValue = "x".repeat(maxLength);
      const invalidValue = "x".repeat(maxLength + 1);

      expect(
        createIssueSchema.safeParse({
          title: "Valid issue",
          [field]: validValue,
        }).success,
      ).toBe(true);
      expect(
        updateIssueSchema.safeParse({ [field]: validValue }).success,
      ).toBe(true);
      expect(
        createIssueSchema.safeParse({
          title: "Valid issue",
          [field]: invalidValue,
        }).success,
      ).toBe(false);
      expect(updateIssueSchema.safeParse({ [field]: invalidValue }).success)
        .toBe(false);
    }
  });

  it("allows partial updates and clearing nullable fields", () => {
    expect(updateIssueSchema.safeParse({}).success).toBe(true);
    expect(
      updateIssueSchema.safeParse({
        assigneeId: null,
        sprintId: null,
        epicId: null,
        severity: null,
        storyPoints: null,
        estimate: null,
        timeSpent: null,
      }).success,
    ).toBe(true);
    expect(updateIssueSchema.safeParse({ title: "   " }).success).toBe(false);
  });

  it("enforces update-specific numeric boundaries", () => {
    expect(
      updateIssueSchema.safeParse({ estimate: 1000, timeSpent: 10000 })
        .success,
    ).toBe(true);
    expect(updateIssueSchema.safeParse({ estimate: 1001 }).success).toBe(false);
    expect(updateIssueSchema.safeParse({ timeSpent: -1 }).success).toBe(false);
    expect(
      updateIssueSchema.safeParse({ storyPoints: 100.1 }).success,
    ).toBe(false);
  });

  it("trims valid comments and rejects empty or oversized comments", () => {
    const parsed = addCommentSchema.safeParse({ content: "  Fixed it  " });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.content).toBe("Fixed it");

    expect(addCommentSchema.safeParse({ content: "   " }).success).toBe(false);
    expect(
      addCommentSchema.safeParse({ content: "C".repeat(10001) }).success,
    ).toBe(false);
    expect(
      addCommentSchema.safeParse({ content: "C".repeat(10000) }).success,
    ).toBe(true);
  });

  it("requires a target issue and a supported relationship type", () => {
    expect(
      addRelationshipSchema.safeParse({
        targetIssueId: "issue-2",
        type: "BLOCKS",
      }).success,
    ).toBe(true);
    expect(
      addRelationshipSchema.safeParse({
        targetIssueId: "",
        type: "BLOCKS",
      }).success,
    ).toBe(false);
    expect(
      addRelationshipSchema.safeParse({
        targetIssueId: "issue-2",
        type: "INVALID",
      }).success,
    ).toBe(false);
  });

  it("trims label names, defaults colors, and validates hex color format", () => {
    const parsed = createLabelSchema.safeParse({ name: "  frontend  " });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.name).toBe("frontend");
      expect(parsed.data.color).toBe("#3b82f6");
    }

    for (const color of ["#fff", "#1234567", "red", "#12xz56"]) {
      expect(createLabelSchema.safeParse({ name: "bug", color }).success)
        .toBe(false);
    }
    expect(
      createLabelSchema.safeParse({ name: "bug", color: "#A1b2C3" }).success,
    ).toBe(true);
  });

  it("enforces label name and description boundaries", () => {
    expect(
      createLabelSchema.safeParse({
        name: "N".repeat(50),
        description: "D".repeat(200),
      }).success,
    ).toBe(true);
    expect(createLabelSchema.safeParse({ name: "N".repeat(51) }).success)
      .toBe(false);
    expect(createLabelSchema.safeParse({ name: "   " }).success).toBe(false);
    expect(
      createLabelSchema.safeParse({
        name: "bug",
        description: "D".repeat(201),
      }).success,
    ).toBe(false);
  });
});
