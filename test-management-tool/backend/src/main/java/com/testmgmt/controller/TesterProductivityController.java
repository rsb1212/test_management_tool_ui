package com.testmgmt.controller;

import com.testmgmt.dto.response.ResponseDTOs.ApiResponse;
import com.testmgmt.dto.response.TesterProductivityDTOs.*;
import com.testmgmt.service.TesterProductivityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/productivity")
@RequiredArgsConstructor
@Tag(name = "Tester Productivity",
     description = "Manager view of individual and team execution performance with daily tracking")
public class TesterProductivityController {

    private final TesterProductivityService productivityService;

    // ── Existing: team summary ────────────────────────────────────────────────

    @GetMapping("/team")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @Operation(summary = "Team productivity summary — all testers with pass/fail/defect rates",
               description = "Returns aggregated execution statistics for every active tester, " +
                             "with optional filter by project. Includes per-module breakdown.")
    public ResponseEntity<ApiResponse<TeamProductivitySummaryResponse>> getTeamProductivity(
            @RequestParam(required = false) UUID projectId) {
        return ResponseEntity.ok(
                ApiResponse.success(productivityService.getTeamProductivity(projectId)));
    }

    // ── Existing: individual tester ───────────────────────────────────────────

    @GetMapping("/tester/{userId}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @Operation(summary = "Individual tester productivity — detailed module, project and daily breakdown")
    public ResponseEntity<ApiResponse<TesterProductivityResponse>> getTesterProductivity(
            @PathVariable UUID userId,
            @RequestParam(required = false) UUID projectId) {
        return ResponseEntity.ok(
                ApiResponse.success(productivityService.getTesterProductivity(userId, projectId)));
    }

    // ── NEW: Tester views their own productivity ──────────────────────────────
    //   Feature 5 — tester sees their own day-by-day record

    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('TESTER', 'MANAGER', 'ADMIN')")
    @Operation(summary = "Current tester's own productivity (self-service)",
               description = "Returns the authenticated tester's productivity stats and daily history. " +
                             "Accessible to TESTER role so they can view their own record.")
    public ResponseEntity<ApiResponse<TesterProductivityResponse>> getMyProductivity(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) UUID projectId) {
        // Resolve the caller's user ID from the UserRepository via email
        return ResponseEntity.ok(
                ApiResponse.success(
                        productivityService.getMyProductivity(userDetails.getUsername(), projectId)));
    }

    // ── NEW: Tester's day-by-day history only ─────────────────────────────────

    @GetMapping("/tester/{userId}/daily")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @Operation(summary = "Day-by-day execution history for one tester",
               description = "Returns one entry per calendar day (up to `days` days back). " +
                             "Each entry has passed/failed/blocked/defect counts and pass rate.")
    public ResponseEntity<ApiResponse<List<DailyProductivityEntry>>> getTesterDailyHistory(
            @PathVariable UUID userId,
            @RequestParam(defaultValue = "30") int days) {
        return ResponseEntity.ok(
                ApiResponse.success(productivityService.getTesterDailyHistory(userId, days)));
    }

    // ── NEW: Manager daily tracking dashboard ────────────────────────────────
    //   Feature 3 — manager sees all testers' execution counts for a given date

    @GetMapping("/daily-tracking")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @Operation(summary = "Daily team execution tracking for a specific date",
               description = "Returns per-tester execution counts (passed/failed/defect_raised) " +
                             "for the given calendar date. Includes defect IDs (defectRef) raised " +
                             "that day. Date defaults to today if not supplied.")
    public ResponseEntity<ApiResponse<DailyTeamTrackingResponse>> getDailyTeamTracking(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        LocalDate trackingDate = date != null ? date : LocalDate.now();
        return ResponseEntity.ok(
                ApiResponse.success(productivityService.getDailyTeamTracking(trackingDate)));
    }
}
