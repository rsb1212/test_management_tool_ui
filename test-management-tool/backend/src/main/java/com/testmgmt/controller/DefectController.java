package com.testmgmt.controller;

import com.testmgmt.dto.request.WorkflowDTOs.CreateDefectRequest;
import com.testmgmt.dto.response.ResponseDTOs.*;
import com.testmgmt.enums.DefectStatus;
import com.testmgmt.service.DefectService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/defects")
@RequiredArgsConstructor
@Tag(name = "Defects", description = "Defect tracking")
public class DefectController {

    private final DefectService defectService;

    @PostMapping
    @Operation(summary = "Report a defect")
    public ResponseEntity<ApiResponse<DefectResponse>> create(
            @Valid @RequestBody CreateDefectRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(defectService.create(request, userDetails.getUsername())));
    }

    @GetMapping
    @Operation(summary = "List defects for a project")
    public ResponseEntity<ApiResponse<List<DefectResponse>>> findAll(
            @RequestParam UUID projectId) {
        return ResponseEntity.ok(ApiResponse.success(defectService.findByProject(projectId)));
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Update defect status")
    public ResponseEntity<ApiResponse<DefectResponse>> updateStatus(
            @PathVariable UUID id,
            @RequestParam DefectStatus status) {
        return ResponseEntity.ok(ApiResponse.success(defectService.updateStatus(id, status)));
    }
}
