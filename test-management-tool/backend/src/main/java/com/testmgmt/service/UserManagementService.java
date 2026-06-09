package com.testmgmt.service;

import com.testmgmt.dto.request.AuthDTOs.CreateUserRequest;
import com.testmgmt.dto.request.AuthDTOs.ResetPasswordRequest;
import com.testmgmt.dto.request.AuthDTOs.UpdateUserRequest;
import com.testmgmt.dto.response.ResponseDTOs.UserResponse;
import com.testmgmt.entity.User;
import com.testmgmt.enums.UserRole;
import com.testmgmt.exception.BadRequestException;
import com.testmgmt.exception.ConflictException;
import com.testmgmt.exception.ResourceNotFoundException;
import com.testmgmt.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@SuppressWarnings("null")
@Service
@RequiredArgsConstructor
@Slf4j
public class UserManagementService {

    private final UserRepository  userRepository;
    private final PasswordEncoder passwordEncoder;

    // ── Roles a MANAGER is allowed to create ─────────────────────────────────
    private static final Set<UserRole> MANAGER_ALLOWED_ROLES =
            Set.of(UserRole.TESTER, UserRole.VIEWER);

    // ── Create a new user ─────────────────────────────────────────────────────

    @Transactional
    public UserResponse createUser(CreateUserRequest request, String creatorEmail) {
        User creator = userRepository.findByEmail(creatorEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User", creatorEmail));

        // Managers can only create TESTER or VIEWER accounts
        UserRole assignedRole = request.getRole() != null ? request.getRole() : UserRole.TESTER;
        if (creator.getRole() == UserRole.MANAGER
                && !MANAGER_ALLOWED_ROLES.contains(assignedRole)) {
            throw new BadRequestException(
                "Managers can only create TESTER or VIEWER accounts. " +
                "Contact an ADMIN to create " + assignedRole + " accounts.");
        }

        // Uniqueness checks
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ConflictException("Email already in use: " + request.getEmail());
        }
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new ConflictException("Username already taken: " + request.getUsername());
        }

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .team(request.getTeam())
                .role(assignedRole)
                .active(true)
                .build();

        user = userRepository.save(user);
        log.info("User {} created '{}' ({}) — role={}",
                creatorEmail, user.getEmail(), user.getFullName(), user.getRole());
        return AuthService.toUserResponse(user);
    }

    // ── Update user profile / role / active status ────────────────────────────

    @Transactional
    public UserResponse updateUser(UUID userId, UpdateUserRequest request, String updaterEmail) {
        User updater = userRepository.findByEmail(updaterEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User", updaterEmail));

        User target = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        // Managers cannot change roles to anything above TESTER/VIEWER
        if (request.getRole() != null) {
            if (updater.getRole() == UserRole.MANAGER
                    && !MANAGER_ALLOWED_ROLES.contains(request.getRole())) {
                throw new BadRequestException(
                    "Managers can only set roles to TESTER or VIEWER.");
            }
            target.setRole(request.getRole());
        }

        if (request.getFullName() != null) target.setFullName(request.getFullName());
        if (request.getTeam()     != null) target.setTeam(request.getTeam());
        if (request.getActive()   != null) target.setActive(request.getActive());

        target = userRepository.save(target);
        log.info("User {} updated '{}' — role={}, active={}",
                updaterEmail, target.getEmail(), target.getRole(), target.getActive());
        return AuthService.toUserResponse(target);
    }

    // ── Reset another user's password (MANAGER/ADMIN only) ───────────────────

    @Transactional
    public void resetPassword(UUID userId, ResetPasswordRequest request, String adminEmail) {
        User target = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
        target.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(target);
        log.info("Password reset for '{}' by {}", target.getEmail(), adminEmail);
    }

    // ── Activate / deactivate ─────────────────────────────────────────────────

    @Transactional
    public UserResponse setActive(UUID userId, boolean active, String updaterEmail) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
        user.setActive(active);
        user = userRepository.save(user);
        log.info("User '{}' {} by {}", user.getEmail(), active ? "activated" : "deactivated", updaterEmail);
        return AuthService.toUserResponse(user);
    }

    // ── List helpers ──────────────────────────────────────────────────────────


    @Transactional(readOnly = true)
    public UserResponse getByEmail(String email) {
        return AuthService.toUserResponse(
                userRepository.findByEmail(email)
                        .orElseThrow(() -> new ResourceNotFoundException("User", email)));
    }

    @Transactional(readOnly = true)
    public List<UserResponse> listAll(Boolean activeOnly) {
        List<User> users = Boolean.TRUE.equals(activeOnly)
                ? userRepository.findByActiveTrue()
                : userRepository.findAll();
        return users.stream().map(AuthService::toUserResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<UserResponse> listByRole(UserRole role) {
        return userRepository.findByRoleAndActiveTrue(role).stream()
                .map(AuthService::toUserResponse).toList();
    }

    @Transactional(readOnly = true)
    public UserResponse getById(UUID id) {
        return AuthService.toUserResponse(
                userRepository.findById(id)
                        .orElseThrow(() -> new ResourceNotFoundException("User", id)));
    }
}
