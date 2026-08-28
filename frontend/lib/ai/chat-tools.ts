import type { UIDataTypes, UIMessage } from "ai";
import type { ChatTestErrorKind } from "@/lib/ai/chat-test-error";
import {
  createGetCompetitorsTool,
  GET_COMPETITORS_TOOL_NAME,
  type GetCompetitorsInput,
  type GetCompetitorsOutput,
} from "@/lib/ai/tools/get-competitors";
import {
  createGetDashboardSummaryTool,
  GET_DASHBOARD_SUMMARY_TOOL_NAME,
  type DashboardSummaryOutput,
  type GetDashboardSummaryInput,
} from "@/lib/ai/tools/get-dashboard-summary";
import {
  createQueryCompetitorDataTool,
  QUERY_COMPETITOR_DATA_TOOL_NAME,
  type QueryCompetitorDataInput,
  type QueryCompetitorDataOutput,
} from "@/lib/ai/tools/query-competitor-data";

export type ChatTools = {
  queryCompetitorData: {
    input: QueryCompetitorDataInput;
    output: QueryCompetitorDataOutput;
  };
  getCompetitors: {
    input: GetCompetitorsInput;
    output: GetCompetitorsOutput;
  };
  getDashboardSummary: {
    input: GetDashboardSummaryInput;
    output: DashboardSummaryOutput;
  };
};

export type ChatMessage = UIMessage<never, UIDataTypes, ChatTools>;

export function createChatTools(
  authorization: string,
  options?: { testError?: ChatTestErrorKind | null },
) {
  return {
    [QUERY_COMPETITOR_DATA_TOOL_NAME]: createQueryCompetitorDataTool(authorization, options?.testError),
    [GET_COMPETITORS_TOOL_NAME]: createGetCompetitorsTool(authorization, options?.testError),
    [GET_DASHBOARD_SUMMARY_TOOL_NAME]: createGetDashboardSummaryTool(authorization, options?.testError),
  };
}
