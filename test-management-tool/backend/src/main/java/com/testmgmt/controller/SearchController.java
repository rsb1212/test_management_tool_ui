package com.testmgmt.controller;

import com.testmgmt.dto.response.ResponseDTOs.*;
import com.testmgmt.service.SearchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/search")
@RequiredArgsConstructor
@Tag(name = "Search", description = "Global full-text search across test cases and defects")
public class SearchController {

    private final SearchService searchService;

    @GetMapping
    @Operation(summary = "Global search — returns test cases and defects matching query",
               description = "Minimum 2 characters required. Optionally filter by projectId.")
    public ResponseEntity<ApiResponse<List<SearchResultResponse>>> search(
            @RequestParam String q,
            @RequestParam(required = false) UUID projectId,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.success(
                searchService.search(q, projectId, user.getUsername())));
    }
}
