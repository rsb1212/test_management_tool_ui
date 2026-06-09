package com.testmgmt.service;

import com.testmgmt.dto.request.ExecutionDTOs.StepResultRequest;
import com.testmgmt.dto.request.ExecutionDTOs.SubmitExecutionRequest;
import com.testmgmt.dto.request.ExecutionDTOs.UpdateExecutionRequest;
import com.testmgmt.dto.response.ExecutionResponseDTOs.*;
import com.testmgmt.entity.*;
import com.testmgmt.enums.ExecResult;
import com.testmgmt.enums.TestStatus;
import com.testmgmt.exception.BadRequestException;
import com.testmgmt.exception.ResourceNotFoundException;
import com.testmgmt.exception.WorkflowException;
import com.testmgmt.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@SuppressWarnings("null")
@Service
@RequiredArgsConstructor
@Slf4j
public class TestExecutionService {

    private final TestExecutionRepository  executionRepository;
    private final StepExecutionRepository  stepExecutionRepository;
    private final TestCaseRepository       testCaseRepository;
    private final ProjectRepository        projectRepository;
    private final UserRepository           userRepository;

    // ── Submit new execution ──────────────────────────────────────────────────

    @Transactional
    public TestExecutionResponse submit(SubmitExecutionRequest req, String testerEmail) {
        User tester = getUser(testerEmail);
        TestCase tc = testCaseRepository.findById(req.getTestCaseId())
                .orElseThrow(() -> new ResourceNotFoundException("TestCase", req.getTestCaseId()));

        // Allow execution for any active (non-deprecated) status
        Set<TestStatus> blocked = Set.of(TestStatus.DEPRECATED);
        if (blocked.contains(tc.getStatus())) {
            throw new WorkflowException(
                "Cannot execute a DEPRECATED test case: " + tc.getCode());
        }

        // Mark all previous executions of this TC as not-latest
        executionRepository.markAllNotLatest(tc);

        int runNumber = executionRepository.findMaxRunNumber(tc) + 1;

        TestExecution execution = TestExecution.builder()
                .testCase(tc)
                .project(tc.getProject())
                .executedBy(tester)
                .result(req.getResult())
                .environment(req.getEnvironment() != null
                        ? req.getEnvironment()
                        : com.testmgmt.enums.ExecutionEnvironment.SIT)
                .buildVersion(req.getBuildVersion())
                .runNumber(runNumber)
                .actualResult(req.getActualResult())
                .notes(req.getNotes())
                .defectRef(req.getDefectRef())
                .durationSeconds(req.getDurationSeconds())
                .executedAt(Instant.now())
                .isLatest(true)
                .build();

        execution = executionRepository.save(execution);

        // Step-level results
        List<StepExecution> stepExecutions = new ArrayList<>();
        if (req.getStepResults() != null && !req.getStepResults().isEmpty()) {
            for (StepResultRequest sr : req.getStepResults()) {
                TestStep step = tc.getSteps().stream()
                        .filter(s -> s.getId().equals(sr.getStepId()))
                        .findFirst()
                        .orElse(null);
                if (step != null) {
                    StepExecution se = StepExecution.builder()
                            .testExecution(execution)
                            .testStep(step)
                            .stepNumber(step.getStepNumber())
                            .result(sr.getResult())
                            .actualResult(sr.getActualResult())
                            .notes(sr.getNotes())
                            .build();
                    stepExecutions.add(stepExecutionRepository.save(se));
                }
            }
        }

        // Update test case status based on result
        tc.setStatus(mapResultToStatus(req.getResult()));
        tc.setUpdatedBy(tester);
        testCaseRepository.save(tc);

        log.info("Execution #{} recorded for {} by {} — {}",
                runNumber, tc.getCode(), testerEmail, req.getResult());

        return toResponse(execution, stepExecutions);
    }

    // ── Update existing execution ─────────────────────────────────────────────

    @Transactional
    public TestExecutionResponse update(UUID executionId,
                                         UpdateExecutionRequest req, String testerEmail) {
        TestExecution ex = executionRepository.findById(executionId)
                .orElseThrow(() -> new ResourceNotFoundException("Execution", executionId));

        User requester = getUser(testerEmail);
        // Only the executing tester, manager, or admin can update
        if (!ex.getExecutedBy().getEmail().equals(testerEmail)
                && !Set.of("MANAGER", "ADMIN")
                       .contains(requester.getRole().name())) {
            throw new BadRequestException("Only the executing tester, manager, or admin can update this execution");
        }

        if (req.getResult()          != null) ex.setResult(req.getResult());
        if (req.getActualResult()    != null) ex.setActualResult(req.getActualResult());
        if (req.getNotes()           != null) ex.setNotes(req.getNotes());
        if (req.getDefectRef()       != null) ex.setDefectRef(req.getDefectRef());
        if (req.getDurationSeconds() != null) ex.setDurationSeconds(req.getDurationSeconds());

        // Update step results if provided
        if (req.getStepResults() != null && !req.getStepResults().isEmpty()) {
            stepExecutionRepository.deleteByTestExecution(ex);
            for (StepResultRequest sr : req.getStepResults()) {
                TestStep step = ex.getTestCase().getSteps().stream()
                        .filter(s -> s.getId().equals(sr.getStepId()))
                        .findFirst().orElse(null);
                if (step != null) {
                    stepExecutionRepository.save(StepExecution.builder()
                            .testExecution(ex).testStep(step)
                            .stepNumber(step.getStepNumber())
                            .result(sr.getResult())
                            .actualResult(sr.getActualResult())
                            .notes(sr.getNotes())
                            .build());
                }
            }
        }

        // If this is the latest execution, update the TC status too
        if (Boolean.TRUE.equals(ex.getIsLatest()) && req.getResult() != null) {
            TestCase tc = ex.getTestCase();
            tc.setStatus(mapResultToStatus(req.getResult()));
            testCaseRepository.save(tc);
        }

        ex = executionRepository.save(ex);
        List<StepExecution> steps =
                stepExecutionRepository.findByTestExecutionOrderByStepNumberAsc(ex);
        return toResponse(ex, steps);
    }

    // ── Get single execution ──────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public TestExecutionResponse getById(UUID id) {
        TestExecution ex = executionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Execution", id));
        List<StepExecution> steps =
                stepExecutionRepository.findByTestExecutionOrderByStepNumberAsc(ex);
        return toResponse(ex, steps);
    }

    // ── Get execution history for a test case ────────────────────────────────

    @Transactional(readOnly = true)
    public ExecutionHistoryResponse getHistoryForTestCase(UUID testCaseId) {
        TestCase tc = testCaseRepository.findById(testCaseId)
                .orElseThrow(() -> new ResourceNotFoundException("TestCase", testCaseId));

        List<TestExecution> executions =
                executionRepository.findByTestCaseOrderByExecutedAtDesc(tc);

        List<TestExecutionResponse> execResponses = executions.stream()
                .map(e -> toResponse(e,
                        stepExecutionRepository.findByTestExecutionOrderByStepNumberAsc(e)))
                .toList();

        return ExecutionHistoryResponse.builder()
                .testCaseId(tc.getId())
                .testCaseCode(tc.getCode())
                .testCaseTitle(tc.getTitle())
                .totalRuns(executions.size())
                .passed((int) executions.stream()
                        .filter(e -> e.getResult() == ExecResult.PASSED).count())
                .failed((int) executions.stream()
                        .filter(e -> e.getResult() == ExecResult.FAILED).count())
                .blocked((int) executions.stream()
                        .filter(e -> e.getResult() == ExecResult.BLOCKED).count())
                .defectRaised((int) executions.stream()
                        .filter(e -> e.getResult() == ExecResult.DEFECT_RAISED).count())
                .executions(execResponses)
                .build();
    }

    // ── Paginated list with filters ───────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<TestExecutionResponse> listExecutions(UUID projectId, UUID userId,
                                                       ExecResult result, Pageable pageable) {
        Page<TestExecution> page;

        if (projectId != null && userId != null) {
            Project project = projectRepository.findById(projectId)
                    .orElseThrow(() -> new ResourceNotFoundException("Project", projectId));
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new ResourceNotFoundException("User", userId));
            page = executionRepository.findByExecutedByAndProject(user, project, pageable);

        } else if (projectId != null) {
            Project project = projectRepository.findById(projectId)
                    .orElseThrow(() -> new ResourceNotFoundException("Project", projectId));
            if (result != null) {
                page = executionRepository.findByProjectAndResult(project, result, pageable);
            } else {
                page = executionRepository.findByProject(project, pageable);
            }

        } else if (userId != null) {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new ResourceNotFoundException("User", userId));
            page = executionRepository.findByExecutedBy(user, pageable);

        } else {
            page = executionRepository.findAll(pageable);
        }

        return page.map(e -> toResponse(e,
                stepExecutionRepository.findByTestExecutionOrderByStepNumberAsc(e)));
    }

    // ── Project execution summary ─────────────────────────────────────────────

    @Transactional(readOnly = true)
    public ExecutionSummaryResponse getSummary(UUID projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project", projectId));

        List<TestExecution> latest =
                executionRepository.findByProjectAndIsLatestTrue(project);

        long passed      = count(latest, ExecResult.PASSED);
        long failed      = count(latest, ExecResult.FAILED);
        long blocked     = count(latest, ExecResult.BLOCKED);
        long skipped     = count(latest, ExecResult.SKIPPED);
        long defects     = count(latest, ExecResult.DEFECT_RAISED);
        long inProgress  = count(latest, ExecResult.IN_PROGRESS);
        long total       = latest.size();
        long executed    = passed + failed + defects + blocked;
        double passRate  = executed > 0 ? round((double) passed / executed * 100) : 0.0;
        double failRate  = executed > 0 ? round((double) failed / executed * 100)  : 0.0;

        // Tester breakdown
        Map<UUID, List<TestExecution>> byTester = latest.stream()
                .collect(Collectors.groupingBy(e -> e.getExecutedBy().getId()));

        List<TesterExecutionStat> testerBreakdown = byTester.entrySet().stream()
                .map(entry -> {
                    List<TestExecution> execs = entry.getValue();
                    User tester = execs.get(0).getExecutedBy();
                    long tp = count(execs, ExecResult.PASSED);
                    long tf = count(execs, ExecResult.FAILED);
                    long tb = count(execs, ExecResult.BLOCKED);
                    long td = count(execs, ExecResult.DEFECT_RAISED);
                    long te = tp + tf + td + tb;
                    Instant lastAt = execs.stream()
                            .map(TestExecution::getExecutedAt)
                            .max(Comparator.naturalOrder()).orElse(null);
                    return TesterExecutionStat.builder()
                            .userId(tester.getId())
                            .testerName(tester.getFullName() != null
                                    ? tester.getFullName() : tester.getUsername())
                            .testerEmail(tester.getEmail())
                            .total((long) execs.size())
                            .passed(tp).failed(tf).blocked(tb).defectRaised(td)
                            .passRate(te > 0 ? round((double) tp / te * 100) : 0.0)
                            .lastExecutedAt(lastAt)
                            .build();
                })
                .sorted(Comparator.comparingLong(TesterExecutionStat::getTotal).reversed())
                .toList();

        // Module breakdown
        Map<String, List<TestExecution>> byModule = latest.stream()
                .filter(e -> e.getTestCase().getModule() != null)
                .collect(Collectors.groupingBy(
                        e -> e.getTestCase().getModule().getName()));

        List<ModuleExecutionStat> moduleBreakdown = byModule.entrySet().stream()
                .map(entry -> {
                    List<TestExecution> execs = entry.getValue();
                    long mp = count(execs, ExecResult.PASSED);
                    long mf = count(execs, ExecResult.FAILED);
                    long md = count(execs, ExecResult.DEFECT_RAISED);
                    long me = mp + mf + md;
                    return ModuleExecutionStat.builder()
                            .moduleName(entry.getKey())
                            .total((long) execs.size())
                            .passed(mp).failed(mf).defectRaised(md)
                            .passRate(me > 0 ? round((double) mp / me * 100) : 0.0)
                            .build();
                })
                .sorted(Comparator.comparingLong(ModuleExecutionStat::getTotal).reversed())
                .toList();

        // Daily trend (last 14 days)
        Instant fourteenDaysAgo = Instant.now().minusSeconds(86400L * 14);
        List<TestExecution> recent = executionRepository
                .findByProjectAndExecutedAtBetween(project, fourteenDaysAgo, Instant.now());

        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd").withZone(ZoneId.systemDefault());
        Map<String, List<TestExecution>> byDay = recent.stream()
                .collect(Collectors.groupingBy(e -> fmt.format(e.getExecutedAt())));

        List<DailyTrendEntry> dailyTrend = byDay.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> {
                    List<TestExecution> execs = entry.getValue();
                    return DailyTrendEntry.builder()
                            .date(entry.getKey())
                            .passed(count(execs, ExecResult.PASSED))
                            .failed(count(execs, ExecResult.FAILED))
                            .blocked(count(execs, ExecResult.BLOCKED))
                            .defectRaised(count(execs, ExecResult.DEFECT_RAISED))
                            .total((long) execs.size())
                            .build();
                })
                .toList();

        return ExecutionSummaryResponse.builder()
                .projectId(project.getId())
                .projectName(project.getName())
                .totalExecutions(total)
                .passed(passed).failed(failed).blocked(blocked)
                .skipped(skipped).defectRaised(defects).inProgress(inProgress)
                .passRate(passRate).failRate(failRate)
                .testerBreakdown(testerBreakdown)
                .moduleBreakdown(moduleBreakdown)
                .dailyTrend(dailyTrend)
                .build();
    }

    // ── Delete execution ──────────────────────────────────────────────────────

    @Transactional
    public void delete(UUID executionId, String requesterEmail) {
        TestExecution ex = executionRepository.findById(executionId)
                .orElseThrow(() -> new ResourceNotFoundException("Execution", executionId));
        User requester = getUser(requesterEmail);
        if (!ex.getExecutedBy().getEmail().equals(requesterEmail)
                && !Set.of("MANAGER","ADMIN").contains(requester.getRole().name())) {
            throw new BadRequestException("Only the executing tester, manager, or admin can delete this record");
        }
        stepExecutionRepository.deleteByTestExecution(ex);
        executionRepository.delete(ex);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Maps an execution result to a TestCase status.
     * Dashboard reflects this change immediately — no separate step needed.
     */
    private TestStatus mapResultToStatus(ExecResult result) {
        return switch (result) {
            case PASSED        -> TestStatus.PASSED;
            case FAILED        -> TestStatus.FAILED;
            case DEFECT_RAISED -> TestStatus.DEFECT_RAISED;
            case BLOCKED       -> TestStatus.UNDER_REVIEW;
            case SKIPPED       -> TestStatus.ASSIGNED;
            case IN_PROGRESS   -> TestStatus.IN_PROGRESS;
            case RETEST        -> TestStatus.RETEST;
        };
    }

    public static TestExecutionResponse toResponse(TestExecution ex,
                                                    List<StepExecution> steps) {
        return TestExecutionResponse.builder()
                .id(ex.getId())
                .testCaseId(ex.getTestCase().getId())
                .testCaseCode(ex.getTestCase().getCode())
                .testCaseTitle(ex.getTestCase().getTitle())
                .projectId(ex.getProject().getId())
                .projectName(ex.getProject().getName())
                .moduleName(ex.getTestCase().getModule() != null
                        ? ex.getTestCase().getModule().getName() : null)
                .executedById(ex.getExecutedBy().getId())
                .executedByName(ex.getExecutedBy().getFullName() != null
                        ? ex.getExecutedBy().getFullName()
                        : ex.getExecutedBy().getUsername())
                .executedByEmail(ex.getExecutedBy().getEmail())
                .executedAt(ex.getExecutedAt())
                .result(ex.getResult())
                .environment(ex.getEnvironment())
                .buildVersion(ex.getBuildVersion())
                .runNumber(ex.getRunNumber())
                .durationSeconds(ex.getDurationSeconds())
                .actualResult(ex.getActualResult())
                .notes(ex.getNotes())
                .defectRef(ex.getDefectRef())
                .isLatest(ex.getIsLatest())
                .stepResults(steps.stream().map(s -> StepExecutionResponse.builder()
                        .id(s.getId())
                        .stepNumber(s.getStepNumber())
                        .stepAction(s.getTestStep().getStepAction())
                        .expectedResult(s.getTestStep().getExpectedResult())
                        .actualResult(s.getActualResult())
                        .result(s.getResult())
                        .notes(s.getNotes())
                        .build()).toList())
                .build();
    }

    private long count(List<TestExecution> list, ExecResult result) {
        return list.stream().filter(e -> e.getResult() == result).count();
    }

    private double round(double v) { return Math.round(v * 100.0) / 100.0; }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User", email));
    }
}
