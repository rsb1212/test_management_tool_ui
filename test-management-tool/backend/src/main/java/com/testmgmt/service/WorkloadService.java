package com.testmgmt.service;

import com.testmgmt.dto.response.ResponseDTOs.WorkloadResponse;
import com.testmgmt.entity.User;
import com.testmgmt.enums.UserRole;
import com.testmgmt.repository.TestCaseRepository;
import com.testmgmt.repository.TestExecutionRepository;
import com.testmgmt.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WorkloadService {

    private final UserRepository          userRepository;
    private final TestCaseRepository      testCaseRepository;
    private final TestExecutionRepository executionRepository;

    private static final int OVERLOADED_THRESHOLD = 15;
    private static final int HIGH_THRESHOLD       = 8;

    @Transactional(readOnly = true)
    public List<WorkloadResponse> getTeamWorkload() {

        List<User> testers = userRepository.findByRoleAndActiveTrue(UserRole.TESTER);

        // pending counts per tester (ASSIGNED or IN_PROGRESS)
        Map<UUID, Long> pendingMap = new HashMap<>();
        Map<UUID, Long> inProgressMap = new HashMap<>();

        testCaseRepository.countPendingPerTester().forEach(row -> {
            UUID userId = (UUID) row[0];
            long count  = (Long)  row[1];
            pendingMap.put(userId, count);
        });

        // Average daily velocity from executions in last 14 days
        Instant since = Instant.now().minusSeconds(86400L * 14);
        Map<UUID, Double> velocityMap = new HashMap<>();

        testers.forEach(t -> {
            List<?> execs = executionRepository.findByTesterAndDateRange(t, since, Instant.now());
            double avg = execs.size() / 14.0;
            velocityMap.put(t.getId(), Math.round(avg * 10.0) / 10.0);
        });

        return testers.stream().map(t -> {
            long pending    = pendingMap.getOrDefault(t.getId(), 0L);
            long inProgress = inProgressMap.getOrDefault(t.getId(), 0L);
            double velocity = velocityMap.getOrDefault(t.getId(), 0.0);

            String status;
            if      (pending >= OVERLOADED_THRESHOLD) status = "OVERLOADED";
            else if (pending >= HIGH_THRESHOLD)       status = "HIGH";
            else                                       status = "NORMAL";

            return WorkloadResponse.builder()
                    .userId(t.getId())
                    .fullName(t.getFullName() != null ? t.getFullName() : t.getUsername())
                    .team(t.getTeam())
                    .pendingCases(pending)
                    .inProgressCases(inProgress)
                    .avgDailyVelocity(velocity)
                    .loadStatus(status)
                    .build();
        })
        .sorted(Comparator.comparingLong(WorkloadResponse::getPendingCases).reversed())
        .collect(Collectors.toList());
    }
}
