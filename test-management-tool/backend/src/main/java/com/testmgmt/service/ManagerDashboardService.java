package com.testmgmt.service;

import com.testmgmt.dto.response.ResponseDTOs.ManagerDashboardResponse;
import com.testmgmt.dto.response.ResponseDTOs.ModuleStatusSummary;
import com.testmgmt.entity.Project;
import com.testmgmt.enums.DefectStatus;
import com.testmgmt.enums.TestStatus;
import com.testmgmt.exception.ResourceNotFoundException;
import com.testmgmt.repository.DefectRepository;
import com.testmgmt.repository.ModuleRepository;
import com.testmgmt.repository.ProjectRepository;
import com.testmgmt.repository.TestCaseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@SuppressWarnings("null")
@Service
@RequiredArgsConstructor
public class ManagerDashboardService {

    private final ProjectRepository  projectRepository;
    private final TestCaseRepository testCaseRepository;
    private final DefectRepository   defectRepository;
    private final ModuleRepository   moduleRepository;

    @Transactional(readOnly = true)
    public ManagerDashboardResponse getDashboard(UUID projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project", projectId));

        // Collect this project + all its sub-projects so imported TCs are counted regardless
        // of whether they were imported directly or into a sub-project
        List<Project> scope = new java.util.ArrayList<>();
        scope.add(project);
        scope.addAll(projectRepository.findByActiveTrueAndParentProject(project));

        long total       = scope.stream().mapToLong(testCaseRepository::countByProject).sum();
        long draft       = sumByStatus(scope, TestStatus.DRAFT);
        long pendingReview = sumByStatus(scope, TestStatus.PENDING_SME_REVIEW);
        long pendingSme  = sumByStatus(scope, TestStatus.SME_REVIEWING);
        long smeApproved = sumByStatus(scope, TestStatus.SME_APPROVED);
        long assigned    = sumByStatus(scope, TestStatus.ASSIGNED);
        long inProgress  = sumByStatus(scope, TestStatus.IN_PROGRESS);
        long passed      = sumByStatus(scope, TestStatus.PASSED);
        long failed      = sumByStatus(scope, TestStatus.FAILED);
        long defectRaised= sumByStatus(scope, TestStatus.DEFECT_RAISED);
        long signedOff   = sumByStatus(scope, TestStatus.SIGNED_OFF);
        long uatPending  = sumByStatus(scope, TestStatus.UAT_PENDING);
        long uatPassed   = sumByStatus(scope, TestStatus.UAT_PASSED);
        long redevelopment= sumByStatus(scope, TestStatus.REDEVELOPMENT);
        long retest      = sumByStatus(scope, TestStatus.RETEST);
        long naCount     = sumByStatus(scope, TestStatus.NA);
        long notReleased = sumByStatus(scope, TestStatus.NOT_RELEASED);

        long totalExecuted = passed + failed + defectRaised;
        double passRate = totalExecuted > 0
                ? Math.round((double) passed / totalExecuted * 10000.0) / 100.0 : 0.0;
        double executionRate = total > 0
                ? Math.round((double) totalExecuted / total * 10000.0) / 100.0 : 0.0;

        long totalDefects = scope.stream().mapToLong(defectRepository::countByProject).sum();
        long openDefects  = scope.stream().mapToLong(p ->
                defectRepository.countByProjectAndStatus(p, DefectStatus.OPEN)
              + defectRepository.countByProjectAndStatus(p, DefectStatus.NEW)
              + defectRepository.countByProjectAndStatus(p, DefectStatus.IN_PROGRESS)).sum();

        return ManagerDashboardResponse.builder()
                .projectId(project.getId())
                .projectName(project.getName())
                .totalTestCases(total)
                .draft(draft)
                .pendingReview(pendingReview)
                .pendingSmeReview(pendingSme)
                .smeApproved(smeApproved)
                .assigned(assigned)
                .inProgress(inProgress)
                .passed(passed)
                .failed(failed)
                .defectRaised(defectRaised)
                .naCount(naCount)
                .notReleased(notReleased)
                .signedOff(signedOff)
                .uatPending(uatPending)
                .uatPassed(uatPassed)
                .redevelopment(redevelopment)
                .retest(retest)
                .passRate(passRate)
                .executionRate(executionRate)
                .totalDefects(totalDefects)
                .openDefects(openDefects)
                .build();
    }

    @Transactional(readOnly = true)
    public List<ManagerDashboardResponse> getAllProjectsDashboard() {
        return projectRepository.findByActiveTrue().stream()
                .map(p -> getDashboard(p.getId()))
                .toList();
    }

    /** Per-module status breakdown for a project */
    @Transactional(readOnly = true)
    public List<ModuleStatusSummary> getModuleBreakdown(UUID projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project", projectId));

        return moduleRepository.findByProject(project).stream().map(mod -> {
            long total       = testCaseRepository.countByProjectAndModule(project, mod);
            long passed      = testCaseRepository.countByProjectAndModuleAndStatus(project, mod, TestStatus.PASSED);
            long failed      = testCaseRepository.countByProjectAndModuleAndStatus(project, mod, TestStatus.FAILED);
            long inProgress  = testCaseRepository.countByProjectAndModuleAndStatus(project, mod, TestStatus.IN_PROGRESS);
            long naCount     = testCaseRepository.countByProjectAndModuleAndStatus(project, mod, TestStatus.NA);
            long notReleased = testCaseRepository.countByProjectAndModuleAndStatus(project, mod, TestStatus.NOT_RELEASED);
            long defectRaised= testCaseRepository.countByProjectAndModuleAndStatus(project, mod, TestStatus.DEFECT_RAISED);
            long executed    = passed + failed + defectRaised;
            double passRate  = executed > 0
                    ? Math.round((double) passed / executed * 10000.0) / 100.0 : 0.0;
            return ModuleStatusSummary.builder()
                    .moduleId(mod.getId())
                    .moduleName(mod.getName())
                    .total(total)
                    .passed(passed)
                    .failed(failed)
                    .inProgress(inProgress)
                    .naCount(naCount)
                    .notReleased(notReleased)
                    .defectRaised(defectRaised)
                    .passRate(passRate)
                    .build();
        }).filter(m -> m.getTotal() > 0).toList();
    }

    /** Sum a status count across a list of projects (used to include sub-projects). */
    private long sumByStatus(java.util.List<Project> projects, TestStatus status) {
        return projects.stream()
                .mapToLong(p -> testCaseRepository.countByProjectAndStatus(p, status))
                .sum();
    }
}
