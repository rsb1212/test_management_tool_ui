package com.testmgmt.service;

import com.testmgmt.dto.request.WorkflowDTOs.CreateRequirementRequest;
import com.testmgmt.dto.response.ResponseDTOs.RequirementResponse;
import com.testmgmt.entity.*;
import com.testmgmt.enums.RequirementType;
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
public class RequirementService {

    private final RequirementRepository requirementRepository;
    private final ProjectRepository     projectRepository;
    private final TestCaseRepository    testCaseRepository;
    private final UserRepository        userRepository;

    @Transactional(readOnly = true)
    public List<RequirementResponse> listByProject(UUID projectId) {
        Project project = getProject(projectId);
        return requirementRepository.findByProject(project)
                .stream().map(this::toResponse).toList();
    }

    @Transactional
    public RequirementResponse create(CreateRequirementRequest req, String creatorEmail) {
        Project project = getProject(req.getProjectId());
        User creator = userRepository.findByEmail(creatorEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User", creatorEmail));

        String code = generateCode();
        Requirement requirement = Requirement.builder()
                .code(code)
                .title(req.getTitle())
                .description(req.getDescription())
                .project(project)
                .type(req.getType() != null ? req.getType() : RequirementType.FUNCTIONAL)
                .createdBy(creator)
                .build();
        return toResponse(requirementRepository.save(requirement));
    }

    @Transactional
    public void linkToTestCase(UUID testCaseId, UUID requirementId) {
        TestCase    tc  = getTestCase(testCaseId);
        Requirement req = requirementRepository.findById(requirementId)
                .orElseThrow(() -> new ResourceNotFoundException("Requirement", requirementId));
        tc.getRequirements().add(req);
        testCaseRepository.save(tc);
    }

    @Transactional
    public void unlinkFromTestCase(UUID testCaseId, UUID requirementId) {
        TestCase    tc  = getTestCase(testCaseId);
        Requirement req = requirementRepository.findById(requirementId)
                .orElseThrow(() -> new ResourceNotFoundException("Requirement", requirementId));
        tc.getRequirements().remove(req);
        testCaseRepository.save(tc);
    }

    private String generateCode() {
        int seq = requirementRepository.findMaxCodeSequence() + 1;
        return String.format("REQ-%03d", seq);
    }

    private Project  getProject(UUID id)  { return projectRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Project", id)); }
    private TestCase getTestCase(UUID id) { return testCaseRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("TestCase", id)); }

    public RequirementResponse toResponse(Requirement r) {
        return RequirementResponse.builder()
                .id(r.getId()).code(r.getCode()).title(r.getTitle())
                .description(r.getDescription()).type(r.getType())
                .projectId(r.getProject().getId()).projectName(r.getProject().getName())
                .createdAt(r.getCreatedAt()).build();
    }
}
