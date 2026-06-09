package com.testmgmt.service;

import com.testmgmt.dto.request.WorkflowDTOs.*;
import com.testmgmt.dto.response.ResponseDTOs.*;
import com.testmgmt.entity.*;
import com.testmgmt.enums.*;
import com.testmgmt.entity.Module;
import com.testmgmt.exception.ResourceNotFoundException;
import com.testmgmt.exception.WorkflowException;
import com.testmgmt.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@SuppressWarnings("null")
@Service
@RequiredArgsConstructor
public class TestCaseWorkflowService {

    private final TestCaseRepository           testCaseRepository;
    private final TestCaseReviewRepository     reviewRepository;
    private final TestCaseAssignmentRepository assignmentRepository;
    private final UserRepository               userRepository;
    private final SignOffRepository            signOffRepository;
    private final ProjectRepository            projectRepository;
    private final ModuleRepository             moduleRepository;
    private final NotificationService          notificationService;

    // ── Forward DRAFT → PENDING_SME_REVIEW ───────────────────
    @Transactional
    public TestCaseResponse forwardToSME(UUID testCaseId, String managerEmail) {
        TestCase tc = getTestCase(testCaseId);
        // Allow forward for DRAFT and any status that needs re-review
        if (List.of(TestStatus.PASSED, TestStatus.SIGNED_OFF, TestStatus.UAT_PASSED,
                    TestStatus.DEPRECATED, TestStatus.PENDING_SME_REVIEW).contains(tc.getStatus()))
            throw new WorkflowException("Cannot forward case in status " + tc.getStatus() +
                " — only DRAFT, NA, NOT_RELEASED, FAILED, RETEST, or ASSIGNED cases can be forwarded.");
        tc.setStatus(TestStatus.PENDING_SME_REVIEW);
        return TestCaseService.toResponse(testCaseRepository.save(tc));
    }

    // ── SME Queue ─────────────────────────────────────────────
    @Transactional(readOnly = true)
    public List<TestCaseResponse> getSMEQueue(UUID projectId) {
        if (projectId != null) {
            Project p = getProject(projectId);
            return testCaseRepository.findByProjectAndStatus(p, TestStatus.PENDING_SME_REVIEW)
                    .stream().map(TestCaseService::toResponse).toList();
        }
        return testCaseRepository.findByStatusIn(
                List.of(TestStatus.PENDING_SME_REVIEW, TestStatus.SME_REVIEWING))
                .stream().map(TestCaseService::toResponse).toList();
    }

    // ── SME Review ────────────────────────────────────────────
    @Transactional
    public TestCaseResponse smeReview(UUID testCaseId, SMEReviewRequest request, String smeEmail) {
        TestCase tc = getTestCase(testCaseId);
        if (tc.getStatus() != TestStatus.PENDING_SME_REVIEW && tc.getStatus() != TestStatus.SME_REVIEWING)
            throw new WorkflowException("Case must be in review state. Current: " + tc.getStatus());
        User sme = getUser(smeEmail);
        // Set status based on review action
        boolean isApprove = "APPROVE".equalsIgnoreCase(request.getAction());
        tc.setStatus(isApprove ? TestStatus.SME_APPROVED : TestStatus.SME_REVIEWING);
        tc.setReviewedBy(sme);
        if (request.getTitle()        != null) tc.setTitle(request.getTitle());
        if (request.getDescription()  != null) tc.setDescription(request.getDescription());
        if (request.getPreconditions()!= null) tc.setPreconditions(request.getPreconditions());
        if (request.getPriority()     != null) tc.setPriority(request.getPriority());
        ReviewAction action = isApprove ? ReviewAction.APPROVED : ReviewAction.MODIFIED;
        saveReview(tc, sme, action, request.getReviewNote());
        TestCase saved = testCaseRepository.save(tc);
        if (isApprove && saved.getCreatedBy() != null)
            notificationService.create(saved.getCreatedBy(), NotificationType.SME_APPROVED,
                "Case Approved: " + saved.getCode(),
                saved.getTitle() + " approved by SME and ready for assignment.",
                "TEST_CASE", saved.getId());
        return TestCaseService.toResponse(saved);
    }

    // ── Bulk Approve → SME_APPROVED ───────────────────────────
    @Transactional
    public List<TestCaseResponse> bulkApprove(BulkApproveRequest request, String smeEmail) {
        User sme = getUser(smeEmail);
        return request.getTestCaseIds().stream().map(id -> {
            TestCase tc = getTestCase(id);
            if (tc.getStatus() != TestStatus.PENDING_SME_REVIEW && tc.getStatus() != TestStatus.SME_REVIEWING)
                throw new WorkflowException(tc.getCode() + " not in review state.");
            tc.setStatus(TestStatus.SME_APPROVED);
            tc.setReviewedBy(sme);
            saveReview(tc, sme, ReviewAction.APPROVED, request.getComment());
            TestCase saved = testCaseRepository.save(tc);
            // Notify the case creator
            if (saved.getCreatedBy() != null)
                notificationService.create(saved.getCreatedBy(), NotificationType.SME_APPROVED,
                    "Case Approved: " + saved.getCode(),
                    saved.getTitle() + " has been approved by SME and is ready for assignment.",
                    "TEST_CASE", saved.getId());
            return TestCaseService.toResponse(saved);
        }).toList();
    }

    // ── Request Changes → DRAFT ───────────────────────────────
    @Transactional
    public TestCaseResponse requestChanges(UUID testCaseId, RequestChangesRequest request, String smeEmail) {
        TestCase tc = getTestCase(testCaseId);
        if (tc.getStatus() != TestStatus.PENDING_SME_REVIEW && tc.getStatus() != TestStatus.SME_REVIEWING)
            throw new WorkflowException("Case must be in review state.");
        User sme = getUser(smeEmail);
        tc.setStatus(TestStatus.DRAFT);
        saveReview(tc, sme, ReviewAction.REJECTED, request.getComment());
        if (tc.getCreatedBy() != null)
            notificationService.create(tc.getCreatedBy(), NotificationType.SME_REJECTED,
                "Changes Requested: " + tc.getCode(), request.getComment(), "TEST_CASE", tc.getId());
        return TestCaseService.toResponse(testCaseRepository.save(tc));
    }

    // ── Assign by ID list ─────────────────────────────────────
    @Transactional
    public List<TestCaseResponse> assignCases(AssignCasesRequest request, String managerEmail) {
        User manager = getUser(managerEmail);
        User tester  = userRepository.findById(request.getAssignedToUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User", request.getAssignedToUserId()));
        List<TestCase> assigned = new ArrayList<>();
        request.getTestCaseIds().forEach(id -> {
            TestCase tc = getTestCase(id);
            // Allow DRAFT, PENDING_SME_REVIEW, SME_APPROVED — block only terminal statuses
            if (List.of(TestStatus.PASSED, TestStatus.SIGNED_OFF, TestStatus.DEPRECATED, TestStatus.UAT_PASSED).contains(tc.getStatus()))
                throw new WorkflowException(tc.getCode() + " cannot be assigned in status: " + tc.getStatus());
            tc.setStatus(TestStatus.ASSIGNED);
            tc.setAssignedTo(tester);
            saveAssignment(tc, tester, manager, request.getDueDate(), AssignmentRole.MEMBER, null, null);
            assigned.add(testCaseRepository.save(tc));
        });
        if (!assigned.isEmpty())
            notificationService.create(tester, NotificationType.ASSIGNED,
                assigned.size() + " test case(s) assigned to you",
                "Manager " + manager.getFullName() + " assigned " + assigned.size() + " cases.",
                "TEST_CASE", assigned.get(0).getId());
        return assigned.stream().map(TestCaseService::toResponse).toList();
    }

    // ── Assign by Module ──────────────────────────────────────
    @Transactional
    public List<TestCaseResponse> assignByModule(AssignByModuleRequest request, String managerEmail) {
        User manager = getUser(managerEmail);
        User tester  = userRepository.findById(request.getAssignedToUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User", request.getAssignedToUserId()));
        List<TestCase> eligible = testCaseRepository.findSmeApprovedByModuleName(
                request.getModuleName(), request.getProjectId());
        if (eligible.isEmpty())
            throw new WorkflowException("No SME_APPROVED cases in module '" + request.getModuleName() + "'.");
        List<TestCase> assigned = new ArrayList<>();
        eligible.forEach(tc -> {
            tc.setStatus(TestStatus.ASSIGNED);
            tc.setAssignedTo(tester);
            saveAssignment(tc, tester, manager, request.getDueDate(), AssignmentRole.MEMBER, null, null);
            assigned.add(testCaseRepository.save(tc));
        });
        notificationService.create(tester, NotificationType.ASSIGNED,
            assigned.size() + " cases from module '" + request.getModuleName() + "' assigned",
            "Manager " + manager.getFullName() + " assigned all " + request.getModuleName() + " cases.",
            "TEST_CASE", assigned.get(0).getId());
        return assigned.stream().map(TestCaseService::toResponse).toList();
    }

    // ── Reassign ──────────────────────────────────────────────
    @Transactional
    public TestCaseResponse reassign(UUID testCaseId, ReassignRequest request, String managerEmail) {
        User manager = getUser(managerEmail);
        TestCase tc  = getTestCase(testCaseId);
        User newTester = userRepository.findById(request.getNewAssigneeId())
                .orElseThrow(() -> new ResourceNotFoundException("User", request.getNewAssigneeId()));
        UUID prevId = tc.getAssignedTo() != null ? tc.getAssignedTo().getId() : null;
        tc.setAssignedTo(newTester);
        saveAssignment(tc, newTester, manager, request.getDueDate(),
                AssignmentRole.MEMBER, prevId, request.getReason());
        notificationService.create(newTester, NotificationType.REASSIGNED,
            "Reassigned: " + tc.getCode(), "Case " + tc.getCode() + " has been reassigned to you. Reason: " + request.getReason(),
            "TEST_CASE", tc.getId());
        return TestCaseService.toResponse(testCaseRepository.save(tc));
    }

    // ── UAT Workflow ──────────────────────────────────────────
    @Transactional
    public TestCaseResponse sendToUAT(UUID testCaseId, UATRequest request, String managerEmail) {
        TestCase tc = getTestCase(testCaseId);
        if (tc.getStatus() != TestStatus.PASSED)
            throw new WorkflowException("Only PASSED cases can be sent to UAT. Current: " + tc.getStatus());
        tc.setStatus(TestStatus.UAT_PENDING);
        return TestCaseService.toResponse(testCaseRepository.save(tc));
    }

    @Transactional
    public TestCaseResponse startUAT(UUID testCaseId, String email) {
        TestCase tc = getTestCase(testCaseId);
        if (tc.getStatus() != TestStatus.UAT_PENDING)
            throw new WorkflowException("Case must be UAT_PENDING. Current: " + tc.getStatus());
        tc.setStatus(TestStatus.UAT_IN_PROGRESS);
        return TestCaseService.toResponse(testCaseRepository.save(tc));
    }

    @Transactional
    public TestCaseResponse passUAT(UUID testCaseId, UATRequest request, String email) {
        TestCase tc = getTestCase(testCaseId);
        if (tc.getStatus() != TestStatus.UAT_IN_PROGRESS)
            throw new WorkflowException("Case must be UAT_IN_PROGRESS. Current: " + tc.getStatus());
        tc.setStatus(TestStatus.UAT_PASSED);
        return TestCaseService.toResponse(testCaseRepository.save(tc));
    }

    @Transactional
    public TestCaseResponse sendToRedevelopment(UUID testCaseId, RedevelopmentRequest request, String email) {
        TestCase tc = getTestCase(testCaseId);
        if (tc.getStatus() != TestStatus.UAT_IN_PROGRESS && tc.getStatus() != TestStatus.UAT_PENDING)
            throw new WorkflowException("Case must be in UAT to send to redevelopment. Current: " + tc.getStatus());
        tc.setStatus(TestStatus.REDEVELOPMENT);
        if (tc.getAssignedTo() != null)
            notificationService.create(tc.getAssignedTo(), NotificationType.REASSIGNED,
                "Sent to Redevelopment: " + tc.getCode(),
                "Reason: " + request.getReason(), "TEST_CASE", tc.getId());
        return TestCaseService.toResponse(testCaseRepository.save(tc));
    }

    // ── Clone test case to another project ────────────────────
    @Transactional
    public TestCaseResponse clone(UUID testCaseId, CloneTestCaseRequest request, String email) {
        TestCase orig    = getTestCase(testCaseId);
        Project  target  = getProject(request.getTargetProjectId());
        User     cloner  = getUser(email);

        Module targetModule = null;
        if (request.getTargetModuleId() != null) {
            targetModule = moduleRepository.findById(request.getTargetModuleId())
                    .orElseThrow(() -> new ResourceNotFoundException("Module", request.getTargetModuleId()));
        }

        String code = generateCode();
        TestCase cloned = TestCase.builder()
                .code(code)
                .title("[Clone] " + orig.getTitle())
                .description(orig.getDescription())
                .preconditions(orig.getPreconditions())
                .project(target)
                .module(targetModule)
                .priority(orig.getPriority())
                .status(TestStatus.DRAFT)
                .createdBy(cloner)
                .isTemplate(false)
                .isRegression(false)
                .versionNumber(1)
                .build();

        // Clone steps
        orig.getSteps().forEach(s -> cloned.getSteps().add(
            TestStep.builder().testCase(cloned)
                .stepNumber(s.getStepNumber())
                .stepAction(s.getStepAction())
                .expectedResult(s.getExpectedResult()).build()
        ));

        return TestCaseService.toResponse(testCaseRepository.save(cloned));
    }

    // ── Sign Off ──────────────────────────────────────────────
    @Transactional
    public SignOffResponse signOff(UUID projectId, SignOffRequest request, String smeEmail) {
        Project project = getProject(projectId);
        User    sme     = getUser(smeEmail);
        List<TestCase> passedCases =
                testCaseRepository.findByProjectAndStatus(project, TestStatus.PASSED);
        if (passedCases.isEmpty())
            throw new WorkflowException("No PASSED test cases found in project.");
        passedCases.forEach(tc -> { tc.setStatus(TestStatus.SIGNED_OFF); testCaseRepository.save(tc); });
        SignOff signOff = SignOff.builder()
                .project(project).signedOffBy(sme)
                .passedCaseCount(passedCases.size())
                .signedOffAt(Instant.now()).notes(request.getNotes()).build();
        signOff = signOffRepository.save(signOff);
        return SignOffResponse.builder().id(signOff.getId()).projectId(project.getId())
                .projectName(project.getName()).signedOffBy(AuthService.toUserResponse(sme))
                .passedCaseCount(signOff.getPassedCaseCount())
                .signedOffAt(signOff.getSignedOffAt()).notes(signOff.getNotes()).build();
    }

    // ── Helpers ───────────────────────────────────────────────
    private void saveReview(TestCase tc, User reviewer, ReviewAction action, String comment) {
        reviewRepository.save(TestCaseReview.builder()
                .testCase(tc).reviewedBy(reviewer).action(action)
                .comment(comment).reviewedAt(Instant.now()).build());
    }

    private void saveAssignment(TestCase tc, User tester, User manager, java.time.LocalDate dueDate,
            AssignmentRole role, UUID reassignedFromId, String reassignReason) {
        assignmentRepository.save(TestCaseAssignment.builder()
                .testCase(tc).assignedTo(tester).assignedBy(manager)
                .assignedAt(Instant.now()).dueDate(dueDate)
                .assignmentRole(role)
                .reassignedFromId(reassignedFromId)
                .reassignReason(reassignReason).build());
    }

    private String generateCode() {
        int seq = testCaseRepository.findMaxCodeSequence() + 1;
        return String.format("TC-%03d", seq);
    }

    private TestCase getTestCase(UUID id) {
        return testCaseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("TestCase", id));
    }
    private User    getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User", email));
    }
    private Project getProject(UUID id) {
        return projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project", id));
    }
}
