package com.testmgmt.service;

import com.testmgmt.dto.request.WorkflowDTOs.CreateDefectRequest;
import com.testmgmt.dto.response.ResponseDTOs.*;
import com.testmgmt.entity.*;
import com.testmgmt.enums.DefectStatus;
import com.testmgmt.exception.ResourceNotFoundException;
import com.testmgmt.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@SuppressWarnings("null")
@Service
@RequiredArgsConstructor
public class DefectService {

    private final DefectRepository defectRepository;
    private final ProjectRepository projectRepository;
    private final TestCaseRepository testCaseRepository;
    private final UserRepository userRepository;

    @Transactional
    public DefectResponse create(CreateDefectRequest request, String reporterEmail) {
        Project project = projectRepository.findById(request.getProjectId())
                .orElseThrow(() -> new ResourceNotFoundException("Project", request.getProjectId()));

        User reporter = userRepository.findByEmail(reporterEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User", reporterEmail));

        TestCase testCase = null;
        if (request.getTestCaseId() != null) {
            testCase = testCaseRepository.findById(request.getTestCaseId()).orElse(null);
        }

        User assignedTo = null;
        if (request.getAssignedToId() != null) {
            assignedTo = userRepository.findById(request.getAssignedToId()).orElse(null);
        }

        String code = generateCode();

        Defect defect = Defect.builder()
                .code(code)
                .title(request.getTitle())
                .description(request.getDescription())
                .project(project)
                .testCase(testCase)
                .severity(request.getSeverity())
                .priority(request.getPriority())
                .status(DefectStatus.NEW)
                .reportedBy(reporter)
                .assignedTo(assignedTo)
                .build();

        return toResponse(defectRepository.save(defect));
    }

    @Transactional(readOnly = true)
    public List<DefectResponse> findByProject(UUID projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project", projectId));
        return defectRepository.findByProject(project).stream().map(this::toResponse).toList();
    }

    @Transactional
    public DefectResponse updateStatus(UUID id, DefectStatus newStatus) {
        Defect defect = defectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Defect", id));
        defect.setStatus(newStatus);
        return toResponse(defectRepository.save(defect));
    }

    private String generateCode() {
        int next = defectRepository.findMaxCodeSequence() + 1;
        return String.format("DEF-%03d", next);
    }

    private DefectResponse toResponse(Defect d) {
        return DefectResponse.builder()
                .id(d.getId())
                .code(d.getCode())
                .title(d.getTitle())
                .description(d.getDescription())
                .severity(d.getSeverity())
                .priority(d.getPriority())
                .status(d.getStatus())
                .jiraIssueKey(d.getJiraIssueKey())
                .project(ProjectService.toResponse(d.getProject()))
                .reportedBy(AuthService.toUserResponse(d.getReportedBy()))
                .assignedTo(AuthService.toUserResponse(d.getAssignedTo()))
                .createdAt(d.getCreatedAt())
                .build();
    }
}
