package com.testmgmt.controller;

import com.testmgmt.dto.response.ResponseDTOs.*;
import com.testmgmt.service.ManagerDashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
@Tag(name = "Reports & Dashboard", description = "Manager dashboard and reporting endpoints")
public class ManagerDashboardController {

    private final ManagerDashboardService dashboardService;

    @GetMapping("/manager-dashboard")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN', 'TESTER', 'SME')")
    @Operation(summary = "Real-time dashboard for a project — used by manager AND tester views")
    public ResponseEntity<ApiResponse<ManagerDashboardResponse>> getDashboard(
            @RequestParam UUID projectId) {
        return ResponseEntity.ok(ApiResponse.success(dashboardService.getDashboard(projectId)));
    }

    @GetMapping("/manager-dashboard/all")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @Operation(summary = "Dashboard metrics for all active projects")
    public ResponseEntity<ApiResponse<List<ManagerDashboardResponse>>> getAllDashboards() {
        return ResponseEntity.ok(ApiResponse.success(dashboardService.getAllProjectsDashboard()));
    }

    @GetMapping("/module-breakdown")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN', 'TESTER', 'SME')")
    @Operation(summary = "Per-module status breakdown — Pass/Fail/In Progress/NA/Not Released")
    public ResponseEntity<ApiResponse<List<ModuleStatusSummary>>> getModuleBreakdown(
            @RequestParam UUID projectId) {
        return ResponseEntity.ok(ApiResponse.success(dashboardService.getModuleBreakdown(projectId)));
    }
}
