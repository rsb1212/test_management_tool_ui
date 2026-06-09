package com.testmgmt.service;

import com.testmgmt.dto.response.TesterProductivityDTOs.*;
import com.testmgmt.entity.TestCase;
import com.testmgmt.entity.TestExecution;
import com.testmgmt.entity.User;
import com.testmgmt.enums.ExecResult;
import com.testmgmt.enums.TestStatus;
import com.testmgmt.enums.UserRole;
import com.testmgmt.exception.ResourceNotFoundException;
import com.testmgmt.repository.ProjectRepository;
import com.testmgmt.repository.TestCaseRepository;
import com.testmgmt.repository.TestExecutionRepository;
import com.testmgmt.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@SuppressWarnings("null")
@Service
@RequiredArgsConstructor
public class TesterProductivityService {

    private final UserRepository          userRepository;
    private final TestCaseRepository      testCaseRepository;
    private final TestExecutionRepository executionRepository;
    private final ProjectRepository       projectRepository;

    private static final DateTimeFormatter DATE_FMT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd").withZone(ZoneId.systemDefault());

    // ── Team productivity summary ─────────────────────────────────────────────

    @Transactional(readOnly = true)
    public TeamProductivitySummaryResponse getTeamProductivity(UUID projectId) {

        List<User> testers = userRepository.findByRoleAndActiveTrue(UserRole.TESTER);

        List<TesterProductivityResponse> testerStats = testers.stream().map(user -> {
            List<TestCase> cases = projectId != null
                    ? testCaseRepository.findByAssignedToAndProject(user,
                            projectRepository.findById(projectId)
                                    .orElseThrow(() -> new ResourceNotFoundException("Project", projectId)))
                    : testCaseRepository.findByAssignedTo(user);
            return buildProductivity(user, cases);
        }).toList();

        long totalAssigned = testerStats.stream().mapToLong(TesterProductivityResponse::getTotalAssigned).sum();
        long totalPassed   = testerStats.stream().mapToLong(TesterProductivityResponse::getPassed).sum();
        long totalFailed   = testerStats.stream().mapToLong(TesterProductivityResponse::getFailed).sum();
        long totalDefects  = testerStats.stream().mapToLong(TesterProductivityResponse::getDefectRaised).sum();
        long executed      = totalPassed + totalFailed + totalDefects;
        double overallPassRate = executed > 0 ? round((double) totalPassed / executed * 100) : 0.0;

        return TeamProductivitySummaryResponse.builder()
                .totalTesters(testerStats.size())
                .totalAssigned(totalAssigned)
                .totalPassed(totalPassed)
                .totalFailed(totalFailed)
                .totalDefects(totalDefects)
                .overallPassRate(overallPassRate)
                .testers(testerStats)
                .build();
    }

    // ── Individual tester productivity ────────────────────────────────────────

    @Transactional(readOnly = true)
    public TesterProductivityResponse getTesterProductivity(UUID userId, UUID projectId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        List<TestCase> cases = projectId != null
                ? testCaseRepository.findByAssignedToAndProject(user,
                        projectRepository.findById(projectId)
                                .orElseThrow(() -> new ResourceNotFoundException("Project", projectId)))
                : testCaseRepository.findByAssignedTo(user);

        return buildProductivity(user, cases);
    }

    // ── NEW: Daily team tracking for a specific date ──────────────────────────
    //   Returns per-tester execution counts for the given calendar day,
    //   including defect IDs raised that day. (Feature 3 & 5)

    @Transactional(readOnly = true)
    public DailyTeamTrackingResponse getDailyTeamTracking(LocalDate date) {

        ZoneId zone = ZoneId.systemDefault();
        Instant from = date.atStartOfDay(zone).toInstant();
        Instant to   = date.plusDays(1).atStartOfDay(zone).toInstant();

        List<TestExecution> executions = executionRepository.findAllByDateRange(from, to);

        // Group by tester
        Map<UUID, List<TestExecution>> byTester = executions.stream()
                .collect(Collectors.groupingBy(e -> e.getExecutedBy().getId()));

        List<TesterDailyRecord> records = byTester.entrySet().stream().map(entry -> {
            List<TestExecution> execs = entry.getValue();
            User tester = execs.get(0).getExecutedBy();

            long passed      = countExec(execs, ExecResult.PASSED);
            long failed      = countExec(execs, ExecResult.FAILED);
            long blocked     = countExec(execs, ExecResult.BLOCKED);
            long defectRaised= countExec(execs, ExecResult.DEFECT_RAISED);
            long total       = execs.size();
            long executed    = passed + failed + defectRaised + blocked;
            double passRate  = executed > 0 ? round((double) passed / executed * 100) : 0.0;

            // Collect non-null defect refs from DEFECT_RAISED executions
            List<String> defectIds = execs.stream()
                    .filter(e -> e.getResult() == ExecResult.DEFECT_RAISED
                              && e.getDefectRef() != null
                              && !e.getDefectRef().isBlank())
                    .map(TestExecution::getDefectRef)
                    .distinct()
                    .sorted()
                    .toList();

            return TesterDailyRecord.builder()
                    .userId(tester.getId())
                    .fullName(tester.getFullName() != null ? tester.getFullName() : tester.getUsername())
                    .username(tester.getUsername())
                    .email(tester.getEmail())
                    .team(tester.getTeam())
                    .total(total)
                    .passed(passed)
                    .failed(failed)
                    .blocked(blocked)
                    .defectRaised(defectRaised)
                    .passRate(passRate)
                    .defectIds(defectIds)
                    .build();
        })
        .sorted(Comparator.comparingLong(TesterDailyRecord::getTotal).reversed())
        .toList();

        long teamTotal   = records.stream().mapToLong(TesterDailyRecord::getTotal).sum();
        long teamPassed  = records.stream().mapToLong(TesterDailyRecord::getPassed).sum();
        long teamFailed  = records.stream().mapToLong(TesterDailyRecord::getFailed).sum();
        long teamDefects = records.stream().mapToLong(TesterDailyRecord::getDefectRaised).sum();

        return DailyTeamTrackingResponse.builder()
                .date(DATE_FMT.format(from))
                .teamTotal(teamTotal)
                .teamPassed(teamPassed)
                .teamFailed(teamFailed)
                .teamDefects(teamDefects)
                .testerRecords(records)
                .build();
    }

    // ── NEW: Day-by-day history for one tester ────────────────────────────────
    //   Returns one entry per calendar day the tester executed something.
    //   Used for Feature 5 (individual productivity trend).

    @Transactional(readOnly = true)
    public List<DailyProductivityEntry> getTesterDailyHistory(UUID userId, int days) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        Instant from = Instant.now().minusSeconds(86400L * days);
        Instant to   = Instant.now();

        List<TestExecution> executions =
                executionRepository.findByTesterAndDateRange(user, from, to);

        // Group by calendar date
        Map<String, List<TestExecution>> byDay = executions.stream()
                .collect(Collectors.groupingBy(e -> DATE_FMT.format(e.getExecutedAt())));

        return byDay.entrySet().stream()
                .sorted(Map.Entry.<String, List<TestExecution>>comparingByKey().reversed())
                .map(entry -> {
                    List<TestExecution> execs = entry.getValue();
                    long passed       = countExec(execs, ExecResult.PASSED);
                    long failed       = countExec(execs, ExecResult.FAILED);
                    long blocked      = countExec(execs, ExecResult.BLOCKED);
                    long defectRaised = countExec(execs, ExecResult.DEFECT_RAISED);
                    long total        = execs.size();
                    long executed     = passed + failed + defectRaised + blocked;
                    double passRate   = executed > 0 ? round((double) passed / executed * 100) : 0.0;

                    return DailyProductivityEntry.builder()
                            .date(entry.getKey())
                            .total(total)
                            .passed(passed)
                            .failed(failed)
                            .blocked(blocked)
                            .defectRaised(defectRaised)
                            .passRate(passRate)
                            .build();
                })
                .toList();
    }


    // ── NEW: resolve current user by email (for /me endpoint) ────────────────

    @Transactional(readOnly = true)
    public TesterProductivityResponse getMyProductivity(String email, UUID projectId) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User", email));
        return getTesterProductivity(user.getId(), projectId);
    }

    // ── Build full productivity breakdown for one user ────────────────────────


    private TesterProductivityResponse buildProductivity(User user, List<TestCase> cases) {

        long passed      = count(cases, TestStatus.PASSED, TestStatus.SIGNED_OFF);
        long failed      = count(cases, TestStatus.FAILED);
        long defects     = count(cases, TestStatus.DEFECT_RAISED);
        long inProgress  = count(cases, TestStatus.IN_PROGRESS);
        long underReview = count(cases, TestStatus.UNDER_REVIEW);
        long pending     = count(cases, TestStatus.ASSIGNED, TestStatus.DRAFT);
        long executed    = passed + failed + defects;
        long total       = cases.size();

        double passRate   = executed > 0 ? round((double) passed / executed * 100)  : 0.0;
        double execRate   = total    > 0 ? round((double) executed / total * 100)   : 0.0;
        double defectRate = executed > 0 ? round((double) defects  / executed * 100): 0.0;

        // Module breakdown (from test case statuses)
        List<ModuleProductivity> moduleBreakdown = cases.stream()
                .filter(tc -> tc.getModule() != null)
                .collect(Collectors.groupingBy(tc -> tc.getModule().getName()))
                .entrySet().stream()
                .map(e -> {
                    long mp = countList(e.getValue(), TestStatus.PASSED, TestStatus.SIGNED_OFF);
                    long mf = countList(e.getValue(), TestStatus.FAILED);
                    long md = countList(e.getValue(), TestStatus.DEFECT_RAISED);
                    long me = mp + mf + md;
                    return ModuleProductivity.builder()
                            .moduleName(e.getKey())
                            .assigned((long) e.getValue().size())
                            .passed(mp).failed(mf).defectRaised(md)
                            .passRate(me > 0 ? round((double) mp / me * 100) : 0.0)
                            .build();
                })
                .sorted((a, b) -> Long.compare(b.getAssigned(), a.getAssigned()))
                .toList();

        // Project breakdown
        List<ProjectProductivity> projectBreakdown = cases.stream()
                .filter(tc -> tc.getProject() != null)
                .collect(Collectors.groupingBy(tc -> tc.getProject().getId()))
                .entrySet().stream()
                .map(e -> {
                    var first = e.getValue().get(0);
                    long pp = countList(e.getValue(), TestStatus.PASSED, TestStatus.SIGNED_OFF);
                    long pf = countList(e.getValue(), TestStatus.FAILED);
                    long pe = pp + pf;
                    return ProjectProductivity.builder()
                            .projectId(e.getKey())
                            .projectName(first.getProject().getName())
                            .assigned((long) e.getValue().size())
                            .passed(pp).failed(pf)
                            .passRate(pe > 0 ? round((double) pp / pe * 100) : 0.0)
                            .build();
                })
                .sorted((a, b) -> Long.compare(b.getAssigned(), a.getAssigned()))
                .toList();

        // Daily history (last 30 days) — included inline for the individual view
        List<DailyProductivityEntry> dailyHistory =
                getTesterDailyHistory(user.getId(), 30);

        return TesterProductivityResponse.builder()
                .userId(user.getId())
                .fullName(user.getFullName())
                .username(user.getUsername())
                .email(user.getEmail())
                .team(user.getTeam())
                .totalAssigned(total)
                .totalExecuted(executed)
                .passed(passed).failed(failed).defectRaised(defects)
                .inProgress(inProgress).underReview(underReview).pending(pending)
                .passRate(passRate).executionRate(execRate).defectRate(defectRate)
                .moduleBreakdown(moduleBreakdown)
                .projectBreakdown(projectBreakdown)
                .dailyHistory(dailyHistory)
                .build();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private long count(List<TestCase> cases, TestStatus... statuses) {
        var set = Set.of(statuses);
        return cases.stream().filter(tc -> set.contains(tc.getStatus())).count();
    }

    private long countList(List<TestCase> cases, TestStatus... statuses) {
        return count(cases, statuses);
    }

    private long countExec(List<TestExecution> execs, ExecResult result) {
        return execs.stream().filter(e -> e.getResult() == result).count();
    }

    private double round(double v) { return Math.round(v * 100.0) / 100.0; }
}
