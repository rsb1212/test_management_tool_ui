package com.testmgmt.dto.request;

import com.testmgmt.enums.ExecResult;
import com.testmgmt.enums.ExecutionEnvironment;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;
import java.util.UUID;

public class ExecutionDTOs {

    /** Submit or update a test case execution */
    @Data
    public static class SubmitExecutionRequest {
        @NotNull
        private UUID testCaseId;

        @NotNull
        private ExecResult result;

        private ExecutionEnvironment environment = ExecutionEnvironment.SIT;
        private String  buildVersion;
        private String  actualResult;
        private String  notes;
        private String  defectRef;
        private Integer durationSeconds;

        /** Optional per-step results */
        private List<StepResultRequest> stepResults;
    }

    /** Per-step result inside an execution submit */
    @Data
    public static class StepResultRequest {
        @NotNull
        private UUID       stepId;
        private Integer    stepNumber;
        @NotNull
        private ExecResult result;
        private String     actualResult;
        private String     notes;
    }

    /** Update an existing execution record */
    @Data
    public static class UpdateExecutionRequest {
        private ExecResult result;
        private String     actualResult;
        private String     notes;
        private String     defectRef;
        private Integer    durationSeconds;
        private List<StepResultRequest> stepResults;
    }
}
