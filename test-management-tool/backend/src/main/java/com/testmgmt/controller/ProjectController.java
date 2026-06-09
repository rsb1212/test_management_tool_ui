package com.testmgmt.controller;

import com.testmgmt.dto.request.WorkflowDTOs.CreateProjectRequest;
import com.testmgmt.dto.response.ResponseDTOs.*;
import com.testmgmt.service.ProjectService;
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
@RequestMapping("/api/v1/projects")
@RequiredArgsConstructor
@Tag(name = "Projects", description = "Project & sub-project management")
public class ProjectController {

    private final ProjectService projectService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Create a new project or sub-project (set parentProjectId for sub-project)")
    public ResponseEntity<ApiResponse<ProjectResponse>> create(
            @Valid @RequestBody CreateProjectRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(projectService.create(request, userDetails.getUsername())));
    }

    @GetMapping
    @Operation(summary = "List root projects with nested sub-projects")
    public ResponseEntity<ApiResponse<List<ProjectResponse>>> findAll() {
        return ResponseEntity.ok(ApiResponse.success(projectService.findAll()));
    }

    @GetMapping("/flat")
    @Operation(summary = "List all projects flat (root + sub) — for dropdowns")
    public ResponseEntity<ApiResponse<List<ProjectResponse>>> findAllFlat() {
        return ResponseEntity.ok(ApiResponse.success(projectService.findAllFlat()));
    }

    @GetMapping("/{id}/sub-projects")
    @Operation(summary = "List sub-projects of a parent project")
    public ResponseEntity<ApiResponse<List<ProjectResponse>>> findSubProjects(
            @PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(projectService.findSubProjects(id)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get project by ID (includes sub-projects)")
    public ResponseEntity<ApiResponse<ProjectResponse>> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(projectService.findById(id)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Update project")
    public ResponseEntity<ApiResponse<ProjectResponse>> update(
            @PathVariable UUID id,
            @Valid @RequestBody CreateProjectRequest request) {
        return ResponseEntity.ok(ApiResponse.success(projectService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Deactivate project (soft delete, cascades to sub-projects)")
    public ResponseEntity<ApiResponse<Void>> deactivate(@PathVariable UUID id) {
        projectService.deactivate(id);
        return ResponseEntity.ok(ApiResponse.ok("Project deactivated"));
    }
}
