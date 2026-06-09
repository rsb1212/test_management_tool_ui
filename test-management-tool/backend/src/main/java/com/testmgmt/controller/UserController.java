package com.testmgmt.controller;

import com.testmgmt.dto.request.AuthDTOs.*;
import com.testmgmt.dto.response.ResponseDTOs.*;
import com.testmgmt.enums.UserRole;
import com.testmgmt.service.UserManagementService;
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
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Tag(name = "User Management",
     description = "Create testers, manage team members, update roles and activation status")
public class UserController {

    private final UserManagementService userManagementService;

    // ── Current user profile ──────────────────────────────────────────────────

    @GetMapping("/me")
    @Operation(summary = "Get current authenticated user's profile")
    public ResponseEntity<ApiResponse<UserResponse>> getMe(
            @AuthenticationPrincipal UserDetails userDetails) {
        // Look up by email (username in Spring Security = email in this project)
        return ResponseEntity.ok(ApiResponse.success(
                userManagementService.getByEmail(userDetails.getUsername())));
    }

    // ── NEW: Manager creates a new tester ────────────────────────────────────
    //   Feature 1 — POST /api/v1/users
    //   MANAGER can only create TESTER or VIEWER; ADMIN can create any role.

    @PostMapping
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @Operation(
        summary = "Create a new team member (MANAGER: TESTER/VIEWER only; ADMIN: any role)",
        description = "Manager supplies username, email, password, fullName, optional team and role. " +
                      "Role defaults to TESTER. Returns the created user profile (no password).")
    public ResponseEntity<ApiResponse<UserResponse>> createUser(
            @Valid @RequestBody CreateUserRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                "User created successfully",
                userManagementService.createUser(request, userDetails.getUsername())));
    }

    // ── List all users ────────────────────────────────────────────────────────

    @GetMapping
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @Operation(summary = "List all users (optionally filter active-only)")
    public ResponseEntity<ApiResponse<List<UserResponse>>> listAll(
            @RequestParam(defaultValue = "false") boolean activeOnly) {
        return ResponseEntity.ok(ApiResponse.success(
                userManagementService.listAll(activeOnly)));
    }

    // ── List all active testers (used by assignment dropdowns) ────────────────
    //   Feature 1 / Feature 2 — frontend needs this to populate tester selects

    @GetMapping("/testers")
    @Operation(summary = "List all active testers — used by assignment and productivity pages")
    public ResponseEntity<ApiResponse<List<UserResponse>>> listTesters() {
        return ResponseEntity.ok(ApiResponse.success(
                userManagementService.listByRole(UserRole.TESTER)));
    }

    // ── Get single user ───────────────────────────────────────────────────────

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @Operation(summary = "Get user by ID")
    public ResponseEntity<ApiResponse<UserResponse>> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(userManagementService.getById(id)));
    }

    // ── Update user ───────────────────────────────────────────────────────────

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @Operation(summary = "Update user profile, role, or active status")
    public ResponseEntity<ApiResponse<UserResponse>> updateUser(
            @PathVariable UUID id,
            @RequestBody UpdateUserRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                userManagementService.updateUser(id, request, userDetails.getUsername())));
    }

    // ── Activate / deactivate ─────────────────────────────────────────────────

    @PatchMapping("/{id}/activate")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @Operation(summary = "Activate a user account")
    public ResponseEntity<ApiResponse<UserResponse>> activate(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                userManagementService.setActive(id, true, userDetails.getUsername())));
    }

    @PatchMapping("/{id}/deactivate")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @Operation(summary = "Deactivate a user account")
    public ResponseEntity<ApiResponse<UserResponse>> deactivate(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                userManagementService.setActive(id, false, userDetails.getUsername())));
    }

    // ── Reset password ────────────────────────────────────────────────────────

    @PatchMapping("/{id}/reset-password")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @Operation(summary = "Reset a user's password (MANAGER/ADMIN only)")
    public ResponseEntity<ApiResponse<Void>> resetPassword(
            @PathVariable UUID id,
            @Valid @RequestBody ResetPasswordRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        userManagementService.resetPassword(id, request, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.ok("Password reset successfully"));
    }
}
