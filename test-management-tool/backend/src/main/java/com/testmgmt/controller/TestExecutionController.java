package com.testmgmt.controller;

import com.testmgmt.dto.request.ExecutionDTOs.SubmitExecutionRequest;
import com.testmgmt.dto.request.ExecutionDTOs.UpdateExecutionRequest;
import com.testmgmt.dto.response.ExecutionResponseDTOs.*;
import com.testmgmt.dto.response.ResponseDTOs.ApiResponse;
import com.testmgmt.enums.ExecResult;
import com.testmgmt.service.TestExecutionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/executions")
@RequiredArgsConstructor
@Tag(name = "Test Executions",
     description = "Record and track test case execution results — who tested what, pass/fail, step-by-step")
public class TestExecutionController {

    private final TestExecutionService executionService;

    // ── Submit a new execution ────────────────────────────────────────────────

    @PostMapping
    @PreAuthorize("hasAnyRole('TESTER', 'MANAGER', 'ADMIN', 'SME')")
    @Operation(
        summary = "Submit test execution result",
        description = "Records who executed a test case, the overall result (PASSED/FAILED/BLOCKED/" +
                      "DEFECT_RAISED/SKIPPED), optional step-level results, actual result notes, " +
                      "defect reference, and build version. Automatically updates the test case status."
    )
    public ResponseEntity<ApiResponse<TestExecutionResponse>> submit(
            @Valid @RequestBody SubmitExecutionRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED).body(
                ApiResponse.success("Execution recorded",
                        executionService.submit(request, userDetails.getUsername())));
    }

    // ── Update existing execution ─────────────────────────────────────────────

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('TESTER', 'MANAGER', 'ADMIN', 'SME')")
    @Operation(summary = "Update an existing execution record (result, notes, step results)")
    public ResponseEntity<ApiResponse<TestExecutionResponse>> update(
            @PathVariable UUID id,
            @RequestBody UpdateExecutionRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                executionService.update(id, request, userDetails.getUsername())));
    }

    // ── Get single execution ──────────────────────────────────────────────────

    @GetMapping("/{id}")
    @Operation(summary = "Get a single execution record with step-level results")
    public ResponseEntity<ApiResponse<TestExecutionResponse>> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(executionService.getById(id)));
    }

    // ── Get full history for a test case ─────────────────────────────────────

    @GetMapping("/testcase/{testCaseId}/history")
    @Operation(
        summary = "Full execution history for a test case",
        description = "Returns all runs (re-runs, regression, etc.) for a test case, " +
                      "sorted newest-first. Includes pass/fail counts across all runs."
    )
    public ResponseEntity<ApiResponse<ExecutionHistoryResponse>> getHistory(
            @PathVariable UUID testCaseId) {
        return ResponseEntity.ok(ApiResponse.success(
                executionService.getHistoryForTestCase(testCaseId)));
    }

    // ── Paginated list with filters ───────────────────────────────────────────

    @GetMapping
    @Operation(
        summary = "List executions with filters",
        description = "Filter by project, tester (userId), or result. " +
                      "Supports pagination. Use for execution log / audit views."
    )
    public ResponseEntity<ApiResponse<Page<TestExecutionResponse>>> list(
            @RequestParam(required = false) UUID projectId,
            @RequestParam(required = false) UUID userId,
            @RequestParam(required = false) ExecResult result,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "25") int size) {
        return ResponseEntity.ok(ApiResponse.success(
                executionService.listExecutions(projectId, userId, result,
                        PageRequest.of(page, size, Sort.by("executedAt").descending()))));
    }

    // ── Project execution summary ─────────────────────────────────────────────

    @GetMapping("/summary")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN', 'SME', 'TESTER')")
    @Operation(
        summary = "Project execution summary dashboard",
        description = "Aggregated stats: overall pass/fail rates, tester-by-tester breakdown, " +
                      "module breakdown, and 14-day daily trend."
    )
    public ResponseEntity<ApiResponse<ExecutionSummaryResponse>> getSummary(
            @RequestParam UUID projectId) {
        return ResponseEntity.ok(ApiResponse.success(
                executionService.getSummary(projectId)));
    }

    // ── Delete execution ──────────────────────────────────────────────────────

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('TESTER', 'MANAGER', 'ADMIN')")
    @Operation(summary = "Delete an execution record (own records, or any for MANAGER/ADMIN)")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails userDetails) {
        executionService.delete(id, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.ok("Execution deleted"));
    }
}
