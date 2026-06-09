package com.testmgmt.dto.response;

import com.testmgmt.enums.*;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public class ResponseDTOs {

    @Data @Builder
    public static class AuthResponse {
        private String token;
        private String tokenType;
        private UserResponse user;
    }

    @Data @Builder
    public static class UserResponse {
        private UUID     id;
        private String   username;
        private String   email;
        private String   fullName;
        private UserRole role;
        private String   team;
        private Boolean  active;
        private Instant  createdAt;
    }

    @Data @Builder
    public static class ProjectResponse {
        private UUID                  id;
        private String                name;
        private String                description;
        private Boolean               active;
        private Instant               createdAt;
        private UserResponse          owner;
        private UUID                  parentProjectId;
        private String                parentProjectName;
        private List<ProjectResponse> subProjects;
    }

    @Data @Builder
    public static class ModuleResponse {
        private UUID   id;
        private String name;
        private UUID   projectId;
        private String projectName;
        private UUID   parentModuleId;
        private String parentModuleName;
    }

    @Data @Builder
    public static class TestStepResponse {
        private UUID    id;
        private Integer stepNumber;
        private String  stepAction;
        private String  expectedResult;
        private String  actualResult;
    }

    @Data @Builder
    public static class TagResponse {
        private UUID   id;
        private String name;
        private UUID   projectId;
    }

    @Data @Builder
    public static class RequirementResponse {
        private UUID            id;
        private String          code;
        private String          title;
        private String          description;
        private RequirementType type;
        private UUID            projectId;
        private String          projectName;
        private Instant         createdAt;
    }

    @Data @Builder
    public static class TestCaseResponse {
        private UUID             id;
        private String           code;
        private String           title;
        private String           description;
        private String           preconditions;
        private Priority         priority;
        private TestStatus       status;
        private Integer          versionNumber;
        private Boolean          isRegression;
        private Boolean          isTemplate;
        private ProjectResponse  project;
        private ModuleResponse   module;
        private UserResponse     createdBy;
        private UserResponse     reviewedBy;
        private UserResponse     assignedTo;
        private List<TestStepResponse>     steps;
        private List<TagResponse>          tags;
        private List<RequirementResponse>  requirements;
        private Instant          createdAt;
        private Instant          updatedAt;
    }

    @Data @Builder
    public static class TestCaseVersionResponse {
        private UUID    id;
        private Integer versionNumber;
        private String  snapshot;
        private String  changeSummary;
        private String  changedByName;
        private Instant createdAt;
    }

    @Data @Builder
    public static class AttachmentResponse {
        private UUID                 id;
        private AttachmentEntityType entityType;
        private UUID                 entityId;
        private String               fileName;
        private String               mimeType;
        private Long                 fileSizeBytes;
        private String               uploadedByName;
        private Instant              createdAt;
        private String               downloadUrl;
    }

    @Data @Builder
    public static class NotificationResponse {
        private UUID             id;
        private NotificationType type;
        private String           title;
        private String           message;
        private String           entityType;
        private UUID             entityId;
        private Boolean          isRead;
        private Instant          createdAt;
    }

    @Data @Builder
    public static class DefectResponse {
        private UUID           id;
        private String         code;
        private String         title;
        private String         description;
        private DefectSeverity severity;
        private DefectPriority priority;
        private DefectStatus   status;
        private String         jiraIssueKey;
        private ProjectResponse project;
        private UserResponse    reportedBy;
        private UserResponse    assignedTo;
        private Instant         createdAt;
    }

    @Data @Builder
    public static class SignOffResponse {
        private UUID         id;
        private UUID         projectId;
        private String       projectName;
        private UserResponse signedOffBy;
        private Integer      passedCaseCount;
        private String       exportedDocPath;
        private Instant      signedOffAt;
        private String       notes;
    }

    @Data @Builder
    public static class ManagerDashboardResponse {
        private UUID   projectId;
        private String projectName;
        // --- totals ---
        private long   totalTestCases;
        // --- workflow states ---
        private long   draft;
        private long   pendingReview;
        private long   pendingSmeReview;
        private long   smeApproved;
        private long   assigned;
        private long   inProgress;
        // --- execution states (QA statuses from Excel) ---
        private long   passed;
        private long   failed;
        private long   defectRaised;
        private long   naCount;          // NA status
        private long   notReleased;      // NOT_RELEASED status
        // --- post-execution ---
        private long   signedOff;
        private long   uatPending;
        private long   uatPassed;
        private long   redevelopment;
        private long   retest;
        // --- defects ---
        private long   totalDefects;
        private long   openDefects;
        // --- rates ---
        private double passRate;
        private double executionRate;
    }

    /** Per-module status breakdown for dashboard */
    @Data @Builder
    public static class ModuleStatusSummary {
        private UUID   moduleId;
        private String moduleName;
        private long   total;
        private long   passed;
        private long   failed;
        private long   inProgress;
        private long   naCount;
        private long   notReleased;
        private long   defectRaised;
        private double passRate;
    }

    @Data @Builder
    public static class ImportErrorItem {
        private int    row;
        private String column;
        private String message;
    }

    @Data @Builder
    public static class ImportResultResponse {
        private UUID             importLogId;
        private int              totalRows;
        private int              successCount;
        private int              errorCount;
        private List<ImportErrorItem> errors;
    }

    @Data @Builder
    public static class ApiResponse<T> {
        private boolean success;
        private String  message;
        private T       data;

        public static <T> ApiResponse<T> success(T data) {
            return ApiResponse.<T>builder().success(true).data(data).build();
        }
        public static <T> ApiResponse<T> success(String message, T data) {
            return ApiResponse.<T>builder().success(true).message(message).data(data).build();
        }
        public static ApiResponse<Void> ok(String message) {
            return ApiResponse.<Void>builder().success(true).message(message).build();
        }
        public static <T> ApiResponse<T> error(String message) {
            return ApiResponse.<T>builder().success(false).message(message).build();
        }
    }

    @Data @Builder
    public static class WorkloadResponse {
        private UUID   userId;
        private String fullName;
        private String team;
        private long   pendingCases;
        private long   inProgressCases;
        private double avgDailyVelocity;
        private String loadStatus;  // NORMAL / HIGH / OVERLOADED
    }

    @Data @Builder
    public static class SearchResultResponse {
        private String type;    // TEST_CASE / DEFECT
        private UUID   id;
        private String code;
        private String title;
        private String status;
        private String projectName;
        private String moduleName;
    }
}
