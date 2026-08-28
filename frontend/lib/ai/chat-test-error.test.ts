import { describe, expect, it } from "vitest";
import {
  chatTriggerFromRequestBody,
  developmentSabotageForRequest,
  isChatTestErrorAllowed,
  parseChatTestError,
} from "@/lib/ai/chat-test-error";

describe("parseChatTestError", () => {
  it("accepts known sabotage kinds in non-production", () => {
    expect(isChatTestErrorAllowed()).toBe(true);
    expect(parseChatTestError("midstream")).toBe("midstream");
    expect(parseChatTestError("429")).toBe("429");
    expect(parseChatTestError("500")).toBe("api");
    expect(parseChatTestError("network")).toBe("network");
    expect(parseChatTestError("tool")).toBe("tool");
    expect(parseChatTestError("empty")).toBe("empty");
  });

  it("ignores unknown values", () => {
    expect(parseChatTestError("explode")).toBeNull();
    expect(parseChatTestError("")).toBeNull();
    expect(parseChatTestError(null)).toBeNull();
  });
});

describe("developmentSabotageForRequest", () => {
  it("sabotages the first submit so the failure can be demonstrated", () => {
    expect(developmentSabotageForRequest("midstream", "submit-message")).toBe("midstream");
    expect(developmentSabotageForRequest("midstream", undefined)).toBe("midstream");
    expect(developmentSabotageForRequest("429", "submit-message")).toBe("429");
  });

  it("does not sabotage regenerate so Retry can succeed while ?testError= stays in the URL", () => {
    expect(developmentSabotageForRequest("midstream", "regenerate-message")).toBeNull();
    expect(developmentSabotageForRequest("api", "regenerate-message")).toBeNull();
    expect(developmentSabotageForRequest("network", "regenerate-message")).toBeNull();
    expect(developmentSabotageForRequest("tool", "regenerate-message")).toBeNull();
  });

  it("reads the AI SDK trigger from the request body", () => {
    expect(chatTriggerFromRequestBody(JSON.stringify({ trigger: "regenerate-message" }))).toBe(
      "regenerate-message",
    );
    expect(chatTriggerFromRequestBody(JSON.stringify({ trigger: "submit-message" }))).toBe("submit-message");
    expect(chatTriggerFromRequestBody("{")).toBeUndefined();
  });
});
