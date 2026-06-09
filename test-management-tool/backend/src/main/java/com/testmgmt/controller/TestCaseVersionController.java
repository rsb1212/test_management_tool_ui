package com.testmgmt.controller;

import com.testmgmt.dto.response.ResponseDTOs.*;
import com.testmgmt.service.TestCaseVersionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/testcases")
@RequiredArgsConstructor
@Tag(name = "Version History", description = "Test case version history — snapshot on every save")
public class TestCaseVersionController {

    private final TestCaseVersionService versionService;

    @GetMapping("/{id}/versions")
    @Operation(summary = "List all versions for a test case (newest first)")
    public ResponseEntity<ApiResponse<List<TestCaseVersionResponse>>> listVersions(
            @PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(versionService.getVersions(id)));
    }

    @GetMapping("/{id}/versions/{versionNumber}")
    @Operation(summary = "Get a specific version snapshot")
    public ResponseEntity<ApiResponse<TestCaseVersionResponse>> getVersion(
            @PathVariable UUID id, @PathVariable Integer versionNumber) {
        return ResponseEntity.ok(ApiResponse.success(versionService.getVersion(id, versionNumber)));
    }
}
