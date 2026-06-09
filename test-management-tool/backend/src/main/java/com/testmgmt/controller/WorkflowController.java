package com.testmgmt.controller;

import com.testmgmt.dto.request.WorkflowDTOs.*;
import com.testmgmt.dto.response.ResponseDTOs.*;
import com.testmgmt.service.TestCaseImportService;
import com.testmgmt.service.TestCaseService;
import com.testmgmt.service.TestCaseWorkflowService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/testcases")
@RequiredArgsConstructor
@Tag(name = "Workflow", description = "Test case workflow — review, assignment, UAT, clone, sign-off")
public class WorkflowController {

    private final TestCaseWorkflowService workflowService;
    private final TestCaseImportService   importService;
    private final TestCaseService         testCaseService;

    /* ── Import ─────────────────────────────────────── */
    @PostMapping("/import")
    @PreAuthorize("hasAnyRole('TESTER','MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<ImportResultResponse>> importExcel(
            @RequestParam UUID projectId, @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserDetails u) {
        return ResponseEntity.ok(ApiResponse.success(
                importService.importFromExcel(projectId, file, u.getUsername())));
    }

    @GetMapping("/import/template")
    @PreAuthorize("hasAnyRole('TESTER','MANAGER','ADMIN')")
    @Operation(summary = "Download blank GWG-format import template")
    public ResponseEntity<byte[]> downloadTemplate() {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=testcase-import-template.xlsx")
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(importService.generateTemplate());
    }

    @GetMapping("/export")
    @PreAuthorize("hasAnyRole('TESTER','MANAGER','ADMIN','SME')")
    @Operation(summary = "Export ALL test cases for a project as Excel (with status colours)")
    public ResponseEntity<byte[]> exportTestCases(@RequestParam UUID projectId) {
        byte[] bytes = importService.exportTestCases(projectId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=test-cases-" + projectId + ".xlsx")
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(bytes);
    }

    /* ── Edit ────────────────────────────────────────── */
    @PutMapping("/{id}/edit")
    @PreAuthorize("hasAnyRole('TESTER','MANAGER','ADMIN','SME')")
    public ResponseEntity<ApiResponse<TestCaseResponse>> edit(
            @PathVariable UUID id, @Valid @RequestBody CreateTestCaseRequest req,
            @AuthenticationPrincipal UserDetails u) {
        return ResponseEntity.ok(ApiResponse.success(testCaseService.update(id, req, u.getUsername())));
    }

    /* ── Manager → SME ───────────────────────────────── */
    @PatchMapping("/{id}/forward-sme")
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<TestCaseResponse>> forwardToSME(
            @PathVariable UUID id, @AuthenticationPrincipal UserDetails u) {
        return ResponseEntity.ok(ApiResponse.success(workflowService.forwardToSME(id, u.getUsername())));
    }

    /* ── Assign ──────────────────────────────────────── */
    @PostMapping("/assign")
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<List<TestCaseResponse>>> assign(
            @Valid @RequestBody AssignCasesRequest req, @AuthenticationPrincipal UserDetails u) {
        return ResponseEntity.ok(ApiResponse.success(workflowService.assignCases(req, u.getUsername())));
    }

    @PostMapping("/assign-by-module")
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
    @Operation(summary = "Bulk-assign all SME-approved cases in a module to a tester")
    public ResponseEntity<ApiResponse<List<TestCaseResponse>>> assignByModule(
            @Valid @RequestBody AssignByModuleRequest req, @AuthenticationPrincipal UserDetails u) {
        return ResponseEntity.ok(ApiResponse.success(workflowService.assignByModule(req, u.getUsername())));
    }

    @PatchMapping("/{id}/reassign")
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
    @Operation(summary = "Reassign a test case to a different tester with reason")
    public ResponseEntity<ApiResponse<TestCaseResponse>> reassign(
            @PathVariable UUID id, @Valid @RequestBody ReassignRequest req,
            @AuthenticationPrincipal UserDetails u) {
        return ResponseEntity.ok(ApiResponse.success(workflowService.reassign(id, req, u.getUsername())));
    }

    /* ── SME Review Queue ────────────────────────────── */
    @GetMapping("/sme-queue")
    @PreAuthorize("hasAnyRole('SME','MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<List<TestCaseResponse>>> smeQueue(
            @RequestParam(required = false) UUID projectId) {
        return ResponseEntity.ok(ApiResponse.success(workflowService.getSMEQueue(projectId)));
    }

    @PutMapping("/{id}/sme-review")
    @PreAuthorize("hasRole('SME')")
    public ResponseEntity<ApiResponse<TestCaseResponse>> smeReview(
            @PathVariable UUID id, @RequestBody SMEReviewRequest req,
            @AuthenticationPrincipal UserDetails u) {
        return ResponseEntity.ok(ApiResponse.success(workflowService.smeReview(id, req, u.getUsername())));
    }

    @PostMapping("/bulk-approve")
    @PreAuthorize("hasAnyRole('SME','MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<List<TestCaseResponse>>> bulkApprove(
            @Valid @RequestBody BulkApproveRequest req, @AuthenticationPrincipal UserDetails u) {
        return ResponseEntity.ok(ApiResponse.success(workflowService.bulkApprove(req, u.getUsername())));
    }

    @PostMapping("/{id}/request-changes")
    @PreAuthorize("hasRole('SME')")
    public ResponseEntity<ApiResponse<TestCaseResponse>> requestChanges(
            @PathVariable UUID id, @Valid @RequestBody RequestChangesRequest req,
            @AuthenticationPrincipal UserDetails u) {
        return ResponseEntity.ok(ApiResponse.success(workflowService.requestChanges(id, req, u.getUsername())));
    }

    /* ── UAT Workflow ────────────────────────────────── */
    @PatchMapping("/{id}/send-uat")
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
    @Operation(summary = "Send PASSED case to UAT_PENDING")
    public ResponseEntity<ApiResponse<TestCaseResponse>> sendToUAT(
            @PathVariable UUID id, @RequestBody(required = false) UATRequest req,
            @AuthenticationPrincipal UserDetails u) {
        return ResponseEntity.ok(ApiResponse.success(
                workflowService.sendToUAT(id, req != null ? req : new UATRequest(), u.getUsername())));
    }

    @PatchMapping("/{id}/uat-start")
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN','TESTER')")
    @Operation(summary = "Start UAT — UAT_PENDING → UAT_IN_PROGRESS")
    public ResponseEntity<ApiResponse<TestCaseResponse>> startUAT(
            @PathVariable UUID id, @AuthenticationPrincipal UserDetails u) {
        return ResponseEntity.ok(ApiResponse.success(workflowService.startUAT(id, u.getUsername())));
    }

    @PatchMapping("/{id}/uat-pass")
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN','SME')")
    @Operation(summary = "UAT passed — UAT_IN_PROGRESS → UAT_PASSED")
    public ResponseEntity<ApiResponse<TestCaseResponse>> passUAT(
            @PathVariable UUID id, @RequestBody(required = false) UATRequest req,
            @AuthenticationPrincipal UserDetails u) {
        return ResponseEntity.ok(ApiResponse.success(
                workflowService.passUAT(id, req != null ? req : new UATRequest(), u.getUsername())));
    }

    @PatchMapping("/{id}/send-redevelopment")
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN','SME')")
    @Operation(summary = "Failed UAT — send to REDEVELOPMENT")
    public ResponseEntity<ApiResponse<TestCaseResponse>> sendToRedevelopment(
            @PathVariable UUID id, @Valid @RequestBody RedevelopmentRequest req,
            @AuthenticationPrincipal UserDetails u) {
        return ResponseEntity.ok(ApiResponse.success(
                workflowService.sendToRedevelopment(id, req, u.getUsername())));
    }

    /* ── Clone ───────────────────────────────────────── */
    @PostMapping("/{id}/clone")
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
    @Operation(summary = "Clone a test case to another project (creates DRAFT copy)")
    public ResponseEntity<ApiResponse<TestCaseResponse>> clone(
            @PathVariable UUID id, @Valid @RequestBody CloneTestCaseRequest req,
            @AuthenticationPrincipal UserDetails u) {
        return ResponseEntity.ok(ApiResponse.success(workflowService.clone(id, req, u.getUsername())));
    }

    /* ── Sign Off ────────────────────────────────────── */
    @PostMapping("/signoff/{projectId}")
    @PreAuthorize("hasRole('SME')")
    public ResponseEntity<ApiResponse<SignOffResponse>> signOff(
            @PathVariable UUID projectId, @RequestBody SignOffRequest req,
            @AuthenticationPrincipal UserDetails u) {
        return ResponseEntity.ok(ApiResponse.success(workflowService.signOff(projectId, req, u.getUsername())));
    }
}
