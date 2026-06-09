package com.testmgmt.controller;

import com.testmgmt.dto.response.ResponseDTOs.*;
import com.testmgmt.service.WorkloadService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/productivity")
@RequiredArgsConstructor
@Tag(name = "Workload", description = "Team capacity and pending case distribution")
public class WorkloadController {

    private final WorkloadService workloadService;

    @GetMapping("/workload")
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
    @Operation(summary = "Team workload — pending cases per tester with load status (NORMAL/HIGH/OVERLOADED)")
    public ResponseEntity<ApiResponse<List<WorkloadResponse>>> getWorkload() {
        return ResponseEntity.ok(ApiResponse.success(workloadService.getTeamWorkload()));
    }
}
