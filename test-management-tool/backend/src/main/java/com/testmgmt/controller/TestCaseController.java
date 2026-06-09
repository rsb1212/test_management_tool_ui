package com.testmgmt.controller;

import com.testmgmt.dto.request.WorkflowDTOs.*;
import com.testmgmt.dto.response.ResponseDTOs.*;
import com.testmgmt.enums.TestStatus;
import com.testmgmt.service.TestCaseService;
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
@RequestMapping("/api/v1/testcases")
@RequiredArgsConstructor
@Tag(name = "Test Cases", description = "Test case CRUD operations")
public class TestCaseController {

    private final TestCaseService testCaseService;

    @PostMapping
    @PreAuthorize("hasAnyRole('TESTER', 'MANAGER', 'ADMIN')")
    @Operation(summary = "Create a test case with steps")
    public ResponseEntity<ApiResponse<TestCaseResponse>> create(
            @Valid @RequestBody CreateTestCaseRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(testCaseService.create(request, userDetails.getUsername())));
    }

    @GetMapping
    @Operation(summary = "List test cases with optional filters — supports projectId, status, assignedToUserId, module")
    public ResponseEntity<ApiResponse<Page<TestCaseResponse>>> findAll(
            @RequestParam(required = false) UUID   projectId,
            @RequestParam(required = false) TestStatus status,
            @RequestParam(required = false) UUID   assignedToUserId,
            @RequestParam(required = false) String module,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(
                testCaseService.findAll(projectId, status, assignedToUserId, module,
                        PageRequest.of(page, size, Sort.by("createdAt").descending()))));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get test case by ID")
    public ResponseEntity<ApiResponse<TestCaseResponse>> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(testCaseService.findById(id)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('TESTER', 'MANAGER', 'ADMIN')")
    @Operation(summary = "Update test case")
    public ResponseEntity<ApiResponse<TestCaseResponse>> update(
            @PathVariable UUID id,
            @Valid @RequestBody CreateTestCaseRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                testCaseService.update(id, request, userDetails.getUsername())));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @Operation(summary = "Delete test case")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID id) {
        testCaseService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok("Test case deleted"));
    }
}
