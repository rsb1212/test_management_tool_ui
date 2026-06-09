package com.testmgmt.dto.request;

import com.testmgmt.enums.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

public class AuthDTOs {

    @Data
    public static class LoginRequest {
        @NotBlank @Email
        private String email;
        @NotBlank
        private String password;
    }

    @Data
    public static class RegisterRequest {
        @NotBlank @Size(min = 3, max = 50)
        private String username;
        @NotBlank @Email
        private String email;
        @NotBlank @Size(min = 8)
        private String password;
        private String fullName;
        private String team;
    }

    /**
     * Used by MANAGER/ADMIN to create a new tester (or any role below admin).
     * Password is set by the manager; user can change it later.
     */
    @Data
    public static class CreateUserRequest {
        @NotBlank @Size(min = 3, max = 50)
        private String username;

        @NotBlank @Email
        private String email;

        @NotBlank @Size(min = 8, message = "Password must be at least 8 characters")
        private String password;

        @NotBlank
        private String fullName;

        private String team;

        /** Default TESTER; MANAGER can only assign TESTER/VIEWER, ADMIN can assign any */
        private UserRole role = UserRole.TESTER;
    }

    @Data
    public static class UpdateUserRequest {
        private String fullName;
        private String team;
        private UserRole role;
        private Boolean active;
    }

    @Data
    public static class ChangePasswordRequest {
        @NotBlank
        private String currentPassword;
        @NotBlank @Size(min = 8)
        private String newPassword;
    }

    @Data
    public static class ResetPasswordRequest {
        @NotBlank @Size(min = 8)
        private String newPassword;
    }

    @Data
    public static class UpdateProfileRequest {
        private String fullName;
        private String team;
    }

    @Data
    public static class UpdateRoleRequest {
        private UserRole role;
    }
}
