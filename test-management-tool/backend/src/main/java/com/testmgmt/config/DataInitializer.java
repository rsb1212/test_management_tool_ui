package com.testmgmt.config;

import com.testmgmt.entity.User;
import com.testmgmt.enums.UserRole;
import com.testmgmt.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@Order(1)
@RequiredArgsConstructor
@Slf4j
@SuppressWarnings("null")
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (!userRepository.existsByEmail("admin@testmgmt.io")) {
            User admin = User.builder()
                    .username("admin")
                    .email("admin@testmgmt.io")
                    .passwordHash(passwordEncoder.encode("Admin@1234"))
                    .fullName("Platform Admin")
                    .role(UserRole.ADMIN)
                    .team("Platform")
                    .active(true)
                    .build();
            userRepository.save(admin);
            log.info("✅  Default admin created: admin@testmgmt.io / Admin@1234");
        }

        if (!userRepository.existsByEmail("sme@testmgmt.io")) {
            User sme = User.builder()
                    .username("sme")
                    .email("sme@testmgmt.io")
                    .passwordHash(passwordEncoder.encode("Sme@1234"))
                    .fullName("SME Reviewer")
                    .role(UserRole.SME)
                    .team("QA")
                    .active(true)
                    .build();
            userRepository.save(sme);
            log.info("✅  Default SME created: sme@testmgmt.io / Sme@1234");
        }

        if (!userRepository.existsByEmail("manager@testmgmt.io")) {
            User mgr = User.builder()
                    .username("manager")
                    .email("manager@testmgmt.io")
                    .passwordHash(passwordEncoder.encode("Manager@1234"))
                    .fullName("Test Manager")
                    .role(UserRole.MANAGER)
                    .team("QA")
                    .active(true)
                    .build();
            userRepository.save(mgr);
            log.info("✅  Default Manager created: manager@testmgmt.io / Manager@1234");
        }

        if (!userRepository.existsByEmail("tester@testmgmt.io")) {
            User tester = User.builder()
                    .username("tester")
                    .email("tester@testmgmt.io")
                    .passwordHash(passwordEncoder.encode("Tester@1234"))
                    .fullName("QA Tester")
                    .role(UserRole.TESTER)
                    .team("QA")
                    .active(true)
                    .build();
            userRepository.save(tester);
            log.info("✅  Default Tester created: tester@testmgmt.io / Tester@1234");
        }
    }
}
