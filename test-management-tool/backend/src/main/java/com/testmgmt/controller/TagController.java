package com.testmgmt.controller;

import com.testmgmt.dto.request.WorkflowDTOs.CreateTagRequest;
import com.testmgmt.dto.response.ResponseDTOs.*;
import com.testmgmt.service.TagService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@Tag(name = "Tags", description = "Functional tag management for test cases")
public class TagController {

    private final TagService tagService;

    @GetMapping("/api/v1/tags")
    @Operation(summary = "List all tags for a project")
    public ResponseEntity<ApiResponse<List<TagResponse>>> list(@RequestParam UUID projectId) {
        return ResponseEntity.ok(ApiResponse.success(tagService.listByProject(projectId)));
    }

    @PostMapping("/api/v1/tags")
    @Operation(summary = "Create a new tag in a project")
    public ResponseEntity<ApiResponse<TagResponse>> create(@Valid @RequestBody CreateTagRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(tagService.create(req)));
    }

    @PostMapping("/api/v1/testcases/{id}/tags/{tagId}")
    @Operation(summary = "Add a tag to a test case")
    public ResponseEntity<ApiResponse<Void>> addTag(@PathVariable UUID id, @PathVariable UUID tagId) {
        tagService.addToTestCase(id, tagId);
        return ResponseEntity.ok(ApiResponse.ok("Tag added"));
    }

    @DeleteMapping("/api/v1/testcases/{id}/tags/{tagId}")
    @Operation(summary = "Remove a tag from a test case")
    public ResponseEntity<ApiResponse<Void>> removeTag(@PathVariable UUID id, @PathVariable UUID tagId) {
        tagService.removeFromTestCase(id, tagId);
        return ResponseEntity.ok(ApiResponse.ok("Tag removed"));
    }
}
