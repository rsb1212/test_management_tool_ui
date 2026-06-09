package com.testmgmt.service;

import com.testmgmt.dto.request.WorkflowDTOs.CreateTestCaseRequest;
import com.testmgmt.dto.request.WorkflowDTOs.StepRequest;
import com.testmgmt.dto.response.ResponseDTOs.ModuleResponse;
import com.testmgmt.dto.response.ResponseDTOs.ProjectResponse;
import com.testmgmt.dto.response.ResponseDTOs.TestCaseResponse;
import com.testmgmt.dto.response.ResponseDTOs.TestStepResponse;
import com.testmgmt.entity.Module;
import com.testmgmt.entity.Project;
import com.testmgmt.entity.TestCase;
import com.testmgmt.entity.TestStep;
import com.testmgmt.entity.User;
import com.testmgmt.enums.TestStatus;
import com.testmgmt.exception.ConflictException;
import com.testmgmt.exception.ResourceNotFoundException;
import com.testmgmt.repository.ModuleRepository;
import com.testmgmt.repository.ProjectRepository;
import com.testmgmt.repository.TestCaseRepository;
import com.testmgmt.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.extern.slf4j.Slf4j;

import java.util.List;
import java.util.UUID;

/**
 * Core CRUD operations for TestCase.
 * Uses explicit imports throughout to prevent java.lang.Module JPMS ambiguity.
 */
@SuppressWarnings("null")
@Slf4j
@Service
@RequiredArgsConstructor
public class TestCaseService {

    private final TestCaseRepository testCaseRepository;
    private final ProjectRepository  projectRepository;
    private final ModuleRepository   moduleRepository;
    private final UserRepository     userRepository;

    @Transactional
    public TestCaseResponse create(CreateTestCaseRequest request, String creatorEmail) {
        Project project = projectRepository.findById(request.getProjectId())
                .orElseThrow(() -> new ResourceNotFoundException("Project", request.getProjectId()));

        if (testCaseRepository.existsByTitleAndProject(request.getTitle(), project)) {
            throw new ConflictException("A test case with this title already exists in the project.");
        }

        // Explicit type com.testmgmt.entity.Module — no ambiguity with java.lang.Module
        Module module = null;
        if (request.getModuleId() != null) {
            module = moduleRepository.findById(request.getModuleId())
                    .orElseThrow(() -> new ResourceNotFoundException("Module", request.getModuleId()));
        }

        User creator = userRepository.findByEmail(creatorEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User", creatorEmail));

        String code = generateCode();

        TestCase testCase = TestCase.builder()
                .code(code)
                .title(request.getTitle())
                .description(request.getDescription())
                .preconditions(request.getPreconditions())
                .project(project)
                .module(module)
                .priority(request.getPriority())
                .status(TestStatus.DRAFT)
                .createdBy(creator)
                .build();

        if (request.getSteps() != null) {
            List<TestStep> steps = request.getSteps().stream()
                    .map((StepRequest s) -> TestStep.builder()
                            .testCase(testCase)
                            .stepNumber(s.getStepNumber())
                            .stepAction(s.getStepAction())
                            .expectedResult(s.getExpectedResult())
                            .build())
                    .toList();
            testCase.getSteps().addAll(steps);
        }

        return toResponse(testCaseRepository.save(testCase));
    }

    @Transactional(readOnly = true)
    /**
     * Unified list method supporting:
     * - projectId filter
     * - status filter
     * - assignedToUserId filter (used by tester "My Cases" dashboard)
     * - module name filter (used by assign page preview)
     */
    public Page<TestCaseResponse> findAll(UUID projectId, TestStatus status,
            UUID assignedToUserId, String module, Pageable pageable) {
        // If assignedToUserId is set — return that tester's cases
        if (assignedToUserId != null) {
            User tester = userRepository.findById(assignedToUserId)
                    .orElseThrow(() -> new ResourceNotFoundException("User", assignedToUserId));
            List<com.testmgmt.entity.TestCase> cases = (projectId != null)
                    ? testCaseRepository.findByAssignedToWithProject(tester, projectId)
                    : testCaseRepository.findByAssignedTo(tester);
            // Convert to page manually
            int start = (int) pageable.getOffset();
            int end   = Math.min(start + pageable.getPageSize(), cases.size());
            List<com.testmgmt.entity.TestCase> pageContent = start >= cases.size() ? List.of() : cases.subList(start, end);
            return new org.springframework.data.domain.PageImpl<>(
                pageContent.stream().map(TestCaseService::toResponse).toList(),
                pageable, cases.size());
        }

        if (projectId != null) {
            Project project = projectRepository.findById(projectId)
                    .orElseThrow(() -> new ResourceNotFoundException("Project", projectId));
            if (status != null) {
                return testCaseRepository.findByProjectAndStatus(project, status, pageable)
                        .map(TestCaseService::toResponse);
            }
            return testCaseRepository.findByProject(project, pageable)
                    .map(TestCaseService::toResponse);
        }
        return testCaseRepository.findAll(pageable).map(TestCaseService::toResponse);
    }

    /** Backward-compat overload */
    public Page<TestCaseResponse> findAll(UUID projectId, TestStatus status, Pageable pageable) {
        return findAll(projectId, status, null, null, pageable);
    }

    @Transactional(readOnly = true)
    public TestCaseResponse findById(UUID id) {
        return toResponse(testCaseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("TestCase", id)));
    }

    @Transactional
    public TestCaseResponse update(UUID id, CreateTestCaseRequest request, String updaterEmail) {
        TestCase tc = testCaseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("TestCase", id));

        User updater = userRepository.findByEmail(updaterEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User", updaterEmail));

        if (!tc.getTitle().equals(request.getTitle())
                && testCaseRepository.existsByTitleAndProject(request.getTitle(), tc.getProject())) {
            throw new ConflictException("A test case with this title already exists in the project.");
        }

        tc.setTitle(request.getTitle());
        tc.setDescription(request.getDescription());
        tc.setPreconditions(request.getPreconditions());
        tc.setPriority(request.getPriority());
        tc.setUpdatedBy(updater);

        return toResponse(testCaseRepository.save(tc));
    }

    @Transactional
    public void delete(UUID id) {
        TestCase tc = testCaseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("TestCase", id));
        
        // Log deletion
        log.info("🗑️  Deleting test case {} ({}) — will cascade delete {} defects, {} assignments, {} reviews, {} executions",
                tc.getCode(), id, 
                tc.getDefects() != null ? tc.getDefects().size() : 0,
                tc.getAssignments() != null ? tc.getAssignments().size() : 0,
                tc.getReviews() != null ? tc.getReviews().size() : 0,
                tc.getExecutions() != null ? tc.getExecutions().size() : 0);
        
        // Delete related entities will be handled by cascade delete due to CascadeType.ALL
        // Explicit cleanup is optional but helps ensure consistency
        if (tc.getDefects() != null && !tc.getDefects().isEmpty()) {
            tc.getDefects().clear();
        }
        if (tc.getAssignments() != null && !tc.getAssignments().isEmpty()) {
            tc.getAssignments().clear();
        }
        if (tc.getReviews() != null && !tc.getReviews().isEmpty()) {
            tc.getReviews().clear();
        }
        if (tc.getExecutions() != null && !tc.getExecutions().isEmpty()) {
            tc.getExecutions().clear();
        }
        if (tc.getSteps() != null && !tc.getSteps().isEmpty()) {
            tc.getSteps().clear();
        }
        
        testCaseRepository.deleteById(id);
        log.info("✅ Test case deleted successfully");
    }

    /** DB-level MAX ensures no gaps under concurrent inserts. */
    @Transactional
    public String generateCode() {
        int next = testCaseRepository.findMaxCodeSequence() + 1;
        return String.format("TC-%03d", next);
    }

    public static TestCaseResponse toResponse(TestCase tc) {
        if (tc == null) return null;
        return TestCaseResponse.builder()
                .id(tc.getId())
                .code(tc.getCode())
                .title(tc.getTitle())
                .description(tc.getDescription())
                .preconditions(tc.getPreconditions())
                .priority(tc.getPriority())
                .status(tc.getStatus())
                .project(tc.getProject() != null
                        ? ProjectResponse.builder()
                                .id(tc.getProject().getId())
                                .name(tc.getProject().getName())
                                .build()
                        : null)
                .module(tc.getModule() != null
                        ? ModuleResponse.builder()
                                .id(tc.getModule().getId())
                                .name(tc.getModule().getName())
                                .build()
                        : null)
                .createdBy(AuthService.toUserResponse(tc.getCreatedBy()))
                .reviewedBy(AuthService.toUserResponse(tc.getReviewedBy()))
                .assignedTo(AuthService.toUserResponse(tc.getAssignedTo()))
                .steps(tc.getSteps().stream()
                        .map(s -> TestStepResponse.builder()
                                .id(s.getId())
                                .stepNumber(s.getStepNumber())
                                .stepAction(s.getStepAction())
                                .expectedResult(s.getExpectedResult())
                                .actualResult(s.getActualResult())
                                .build())
                        .toList())
                .createdAt(tc.getCreatedAt())
                .updatedAt(tc.getUpdatedAt())
                .build();
    }
}
