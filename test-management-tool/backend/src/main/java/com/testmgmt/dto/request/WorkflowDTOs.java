package com.testmgmt.dto.request;

import com.testmgmt.enums.ExecResult;
import com.testmgmt.enums.Priority;
import com.testmgmt.enums.RequirementType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public class WorkflowDTOs {

    @Data public static class ForwardToSMERequest { private String note; }

    @Data public static class SMEReviewRequest {
        /** "APPROVE" to approve, anything else = review/comment only */
        private String action;
        private String title; private String description;
        private String preconditions; private Priority priority; private String reviewNote;
    }

    @Data public static class BulkApproveRequest {
        @NotNull private List<UUID> testCaseIds; private String comment;
    }

    @Data public static class RequestChangesRequest {
        @NotBlank private String comment;
    }

    @Data public static class AssignCasesRequest {
        @NotNull private List<UUID> testCaseIds;
        @NotNull private UUID assignedToUserId;
        private LocalDate dueDate;
    }

    @Data public static class AssignByModuleRequest {
        @NotBlank private String moduleName;
        @NotNull  private UUID assignedToUserId;
        private UUID projectId;
        private LocalDate dueDate;
    }

    @Data public static class ReassignRequest {
        @NotNull  private UUID newAssigneeId;
        @NotBlank private String reason;
        private LocalDate dueDate;
    }

    @Data public static class ExecuteTestRunRequest {
        @NotNull private ExecResult result;
        private String actualResult; private String defectTitle; private String defectDescription;
    }

    @Data public static class SignOffRequest { private String notes; }

    @Data public static class CreateTestCaseRequest {
        @NotBlank private String title;
        private String description; private String preconditions;
        @NotNull private UUID projectId; private UUID moduleId;
        @NotNull private Priority priority;
        private List<StepRequest> steps;
    }

    @Data public static class StepRequest {
        @Min(1) private Integer stepNumber;
        @NotBlank private String stepAction;
        @NotBlank private String expectedResult;
    }

    @Data public static class CreateProjectRequest {
        @NotBlank private String name;
        private String description;
        /** Set to make this a sub-project under the given parent */
        private java.util.UUID parentProjectId;
    }

    @Data public static class CreateDefectRequest {
        @NotBlank private String title; private String description;
        @NotNull  private UUID projectId; private UUID testCaseId;
        @NotNull  private com.testmgmt.enums.DefectSeverity severity;
        @NotNull  private com.testmgmt.enums.DefectPriority priority;
        private UUID assignedToId;
    }

    @Data public static class CreateTagRequest {
        @NotBlank private String name;
        @NotNull  private UUID projectId;
    }

    @Data public static class CreateRequirementRequest {
        @NotBlank private String title;
        private String description;
        @NotNull  private UUID projectId;
        private RequirementType type;
    }

    @Data public static class UATRequest { private String notes; }

    @Data public static class RedevelopmentRequest {
        @NotBlank private String reason;
    }

    @Data public static class CloneTestCaseRequest {
        @NotNull private UUID targetProjectId;
        private UUID targetModuleId;
    }
}
