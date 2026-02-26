import { describe, it, expect } from "vitest";
import {
  LoginBody,
  SignupBody,
  HireBody,
  CreateDelegatedTaskBody,
  UpdateDelegatedTaskStatusBody,
  UpsertAutomationConfigBody,
  SetModelRouteBody,
  CloudConnectorBody,
  CompanySoulBody,
  SettingsBody,
  EnqueueRunnerJobBody,
  InboxActionBody,
  SubmissionReviewBody,
  RunDelegatedTaskBody,
  ApproveExecuteBody,
  RunnerJobActionBody,
} from "@/lib/schemas";

describe("LoginBody", () => {
  it("accepts valid input", () => {
    const result = LoginBody.safeParse({ email: "a@b.com", password: "x" });
    expect(result.success).toBe(true);
  });
  it("rejects missing email", () => {
    expect(LoginBody.safeParse({ password: "x" }).success).toBe(false);
  });
  it("rejects invalid email", () => {
    expect(LoginBody.safeParse({ email: "notanemail", password: "x" }).success).toBe(false);
  });
});

describe("SignupBody", () => {
  it("accepts valid input", () => {
    expect(SignupBody.safeParse({ email: "a@b.com", password: "12345678" }).success).toBe(true);
  });
  it("rejects short password", () => {
    expect(SignupBody.safeParse({ email: "a@b.com", password: "short" }).success).toBe(false);
  });
});

describe("HireBody", () => {
  it("accepts valid input", () => {
    const result = HireBody.safeParse({ agentKind: "ASSISTANT" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.schedule).toBe("MONTHLY");
      expect(result.data.mode).toBe("HIRE");
    }
  });
  it("rejects invalid agentKind", () => {
    expect(HireBody.safeParse({ agentKind: "UNKNOWN" }).success).toBe(false);
  });
});

describe("CreateDelegatedTaskBody", () => {
  it("accepts valid input", () => {
    const result = CreateDelegatedTaskBody.safeParse({
      toAgentTarget: "ASSISTANT",
      title: "Test task",
      instructions: "Do something",
    });
    expect(result.success).toBe(true);
  });
  it("rejects empty title", () => {
    expect(
      CreateDelegatedTaskBody.safeParse({
        toAgentTarget: "ASSISTANT",
        title: "",
        instructions: "Do something",
      }).success,
    ).toBe(false);
  });
  it("rejects invalid agent target", () => {
    expect(
      CreateDelegatedTaskBody.safeParse({
        toAgentTarget: "UNKNOWN",
        title: "Test",
        instructions: "Do something",
      }).success,
    ).toBe(false);
  });
});

describe("UpdateDelegatedTaskStatusBody", () => {
  it("accepts valid status", () => {
    expect(UpdateDelegatedTaskStatusBody.safeParse({ id: "abc", status: "DONE" }).success).toBe(true);
  });
  it("rejects invalid status", () => {
    expect(UpdateDelegatedTaskStatusBody.safeParse({ id: "abc", status: "INVALID" }).success).toBe(false);
  });
});

describe("UpsertAutomationConfigBody", () => {
  it("accepts minimal input", () => {
    expect(UpsertAutomationConfigBody.safeParse({ agentTarget: "CHIEF_ADVISOR" }).success).toBe(true);
  });
  it("accepts full input", () => {
    const result = UpsertAutomationConfigBody.safeParse({
      agentTarget: "ASSISTANT",
      triggerMode: "HYBRID",
      wakeOnDelegation: true,
      scheduleEnabled: true,
      dailyTimes: ["09:00", "14:00"],
      maxLoopIterations: 5,
    });
    expect(result.success).toBe(true);
  });
});

describe("SetModelRouteBody", () => {
  it("accepts valid input", () => {
    expect(SetModelRouteBody.safeParse({ target: "ADVISOR" }).success).toBe(true);
  });
  it("rejects invalid target", () => {
    expect(SetModelRouteBody.safeParse({ target: "UNKNOWN" }).success).toBe(false);
  });
});

describe("CloudConnectorBody", () => {
  it("accepts empty object", () => {
    expect(CloudConnectorBody.safeParse({}).success).toBe(true);
  });
  it("accepts valid provider", () => {
    expect(CloudConnectorBody.safeParse({ provider: "OPENAI", mode: "BYOK" }).success).toBe(true);
  });
});

describe("CompanySoulBody", () => {
  it("accepts partial input", () => {
    expect(CompanySoulBody.safeParse({ companyName: "Test Corp" }).success).toBe(true);
  });
});

describe("SettingsBody", () => {
  it("accepts valid autonomy", () => {
    expect(SettingsBody.safeParse({ defaultAutonomy: "APPROVAL" }).success).toBe(true);
  });
  it("passes through extra fields", () => {
    const result = SettingsBody.safeParse({ customField: "value" });
    expect(result.success).toBe(true);
  });
});

describe("EnqueueRunnerJobBody", () => {
  it("accepts defaults", () => {
    const result = EnqueueRunnerJobBody.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("Runner job");
      expect(result.data.jobType).toBe("generic");
    }
  });
});

describe("RunnerJobActionBody", () => {
  it("accepts approve action", () => {
    expect(RunnerJobActionBody.safeParse({ id: "job-1", action: "approve" }).success).toBe(true);
  });
  it("rejects invalid action", () => {
    expect(RunnerJobActionBody.safeParse({ id: "job-1", action: "delete" }).success).toBe(false);
  });
});

describe("InboxActionBody", () => {
  it("accepts valid action", () => {
    expect(InboxActionBody.safeParse({ action: "approve" }).success).toBe(true);
  });
  it("rejects invalid action", () => {
    expect(InboxActionBody.safeParse({ action: "delete" }).success).toBe(false);
  });
});

describe("SubmissionReviewBody", () => {
  it("accepts valid review", () => {
    const result = SubmissionReviewBody.safeParse({ status: "ACCEPTED", rating: 4 });
    expect(result.success).toBe(true);
  });
  it("rejects invalid status", () => {
    expect(SubmissionReviewBody.safeParse({ status: "INVALID" }).success).toBe(false);
  });
});

describe("RunDelegatedTaskBody", () => {
  it("accepts optional fields", () => {
    expect(RunDelegatedTaskBody.safeParse({}).success).toBe(true);
  });
  it("accepts taskId", () => {
    expect(RunDelegatedTaskBody.safeParse({ taskId: "task-1" }).success).toBe(true);
  });
});

describe("ApproveExecuteBody", () => {
  it("requires taskId", () => {
    expect(ApproveExecuteBody.safeParse({}).success).toBe(false);
    expect(ApproveExecuteBody.safeParse({ taskId: "task-1" }).success).toBe(true);
  });
});
