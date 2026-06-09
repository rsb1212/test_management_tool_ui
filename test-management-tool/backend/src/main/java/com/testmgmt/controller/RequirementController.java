package com.testmgmt.controller;

import com.testmgmt.dto.request.WorkflowDTOs.CreateRequirementRequest;
import com.testmgmt.dto.response.ResponseDTOs.*;
import com.testmgmt.service.RequirementService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/requirements")
@RequiredArgsConstructor
@Tag(name = "Requirements", description = "Requirement traceability — link test cases to business requirements")
public class RequirementController {

    private final RequirementService requirementService;

    @GetMapping
    @Operation(summary = "List requirements for a project")
    public ResponseEntity<ApiResponse<List<RequirementResponse>>> list(@RequestParam UUID projectId) {
        return ResponseEntity.ok(ApiResponse.success(requirementService.listByProject(projectId)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
    @Operation(summary = "Create a new requirement")
    public ResponseEntity<ApiResponse<RequirementResponse>> create(
            @Valid @RequestBody CreateRequirementRequest req,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(
                ApiResponse.success(requirementService.create(req, user.getUsername())));
    }

    @PostMapping("/testcases/{tcId}/link/{reqId}")
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
    @Operation(summary = "Link requirement to a test case")
    public ResponseEntity<ApiResponse<Void>> link(@PathVariable UUID tcId, @PathVariable UUID reqId) {
        requirementService.linkToTestCase(tcId, reqId);
        return ResponseEntity.ok(ApiResponse.ok("Linked"));
    }

    @DeleteMapping("/testcases/{tcId}/unlink/{reqId}")
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
    @Operation(summary = "Unlink requirement from a test case")
    public ResponseEntity<ApiResponse<Void>> unlink(@PathVariable UUID tcId, @PathVariable UUID reqId) {
        requirementService.unlinkFromTestCase(tcId, reqId);
        return ResponseEntity.ok(ApiResponse.ok("Unlinked"));
    }
}
