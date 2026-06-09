package com.testmgmt.dto.response;

import com.testmgmt.enums.ExecResult;
import com.testmgmt.enums.ExecutionEnvironment;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public class ExecutionResponseDTOs {

    @Data @Builder
    public static class StepExecutionResponse {
        private UUID       id;
        private Integer    stepNumber;
        private String     stepAction;
        private String     expectedResult;
        private String     actualResult;
        private ExecResult result;
        private String     notes;
    }

    @Data @Builder
    public static class TestExecutionResponse {
        private UUID                 id;
        private String               testCaseCode;
        private String               testCaseTitle;
        private UUID                 testCaseId;
        private String               projectName;
        private UUID                 projectId;
        private String               moduleName;

        // Who, when, what
        private UUID                 executedById;
        private String               executedByName;
        private String               executedByEmail;
        private Instant              executedAt;

        // Result
        private ExecResult           result;
        private ExecutionEnvironment environment;
        private String               buildVersion;
        private Integer              runNumber;
        private Integer              durationSeconds;
        private String               actualResult;
        private String               notes;
        private String               defectRef;
        private Boolean              isLatest;

        private List<StepExecutionResponse> stepResults;
    }

    @Data @Builder
    public static class ExecutionHistoryResponse {
        private UUID   testCaseId;
        private String testCaseCode;
        private String testCaseTitle;
        private int    totalRuns;
        private int    passed;
        private int    failed;
        private int    blocked;
        private int    defectRaised;
        private List<TestExecutionResponse> executions;
    }

    @Data @Builder
    public static class ExecutionSummaryResponse {
        private UUID   projectId;
        private String projectName;

        // Totals
        private long totalExecutions;
        private long passed;
        private long failed;
        private long blocked;
        private long skipped;
        private long defectRaised;
        private long inProgress;
        private double passRate;
        private double failRate;

        // Tester breakdown
        private List<TesterExecutionStat> testerBreakdown;

        // Module breakdown
        private List<ModuleExecutionStat> moduleBreakdown;

        // Daily trend (last 14 days)
        private List<DailyTrendEntry> dailyTrend;
    }

    @Data @Builder
    public static class TesterExecutionStat {
        private UUID   userId;
        private String testerName;
        private String testerEmail;
        private long   total;
        private long   passed;
        private long   failed;
        private long   blocked;
        private long   defectRaised;
        private double passRate;
        private Instant lastExecutedAt;
    }

    @Data @Builder
    public static class ModuleExecutionStat {
        private String moduleName;
        private long   total;
        private long   passed;
        private long   failed;
        private long   defectRaised;
        private double passRate;
    }

    @Data @Builder
    public static class DailyTrendEntry {
        private String date;
        private long   passed;
        private long   failed;
        private long   blocked;
        private long   defectRaised;
        private long   total;
    }
}
