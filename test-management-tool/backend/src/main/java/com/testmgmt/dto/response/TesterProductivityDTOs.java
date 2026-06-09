package com.testmgmt.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.UUID;

public class TesterProductivityDTOs {

    @Data @Builder
    public static class TesterProductivityResponse {
        private UUID   userId;
        private String fullName;
        private String username;
        private String email;
        private String team;

        // Overall counts
        private long totalAssigned;
        private long totalExecuted;
        private long passed;
        private long failed;
        private long defectRaised;
        private long inProgress;
        private long pending;
        private long underReview;

        // Rates
        private double passRate;
        private double executionRate;
        private double defectRate;

        // Per-module breakdown
        private List<ModuleProductivity> moduleBreakdown;

        // Per-project breakdown
        private List<ProjectProductivity> projectBreakdown;

        // NEW — day-by-day execution history
        private List<DailyProductivityEntry> dailyHistory;
    }

    @Data @Builder
    public static class ModuleProductivity {
        private String moduleName;
        private long   assigned;
        private long   passed;
        private long   failed;
        private long   defectRaised;
        private double passRate;
    }

    @Data @Builder
    public static class ProjectProductivity {
        private UUID   projectId;
        private String projectName;
        private long   assigned;
        private long   passed;
        private long   failed;
        private double passRate;
    }

    /**
     * NEW — one entry per calendar day for a tester.
     * Counts executions (not test case statuses) so managers can see
     * exactly how many cases a tester executed each day.
     */
    @Data @Builder
    public static class DailyProductivityEntry {
        private String date;          // "yyyy-MM-dd"
        private long   total;
        private long   passed;
        private long   failed;
        private long   blocked;
        private long   defectRaised;
        private double passRate;
    }

    @Data @Builder
    public static class TeamProductivitySummaryResponse {
        private long totalTesters;
        private long totalAssigned;
        private long totalPassed;
        private long totalFailed;
        private long totalDefects;
        private double overallPassRate;
        private List<TesterProductivityResponse> testers;
    }

    /**
     * NEW — daily snapshot across the whole team for a given date.
     * Each entry is one tester's numbers for that day,
     * plus their outstanding defect references from test executions.
     */
    @Data @Builder
    public static class DailyTeamTrackingResponse {
        private String date;
        private long   teamTotal;
        private long   teamPassed;
        private long   teamFailed;
        private long   teamDefects;
        private List<TesterDailyRecord> testerRecords;
    }

    @Data @Builder
    public static class TesterDailyRecord {
        private UUID   userId;
        private String fullName;
        private String username;
        private String email;
        private String team;
        private long   total;
        private long   passed;
        private long   failed;
        private long   blocked;
        private long   defectRaised;
        private double passRate;
        /** Defect IDs (defectRef) from executions with result=DEFECT_RAISED on this day */
        private List<String> defectIds;
    }
}
