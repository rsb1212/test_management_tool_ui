package com.testmgmt.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.testmgmt.dto.response.ResponseDTOs.TestCaseVersionResponse;
import com.testmgmt.entity.TestCase;
import com.testmgmt.entity.TestCaseVersion;
import com.testmgmt.entity.User;
import com.testmgmt.exception.ResourceNotFoundException;
import com.testmgmt.repository.TestCaseRepository;
import com.testmgmt.repository.TestCaseVersionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@SuppressWarnings("null")
@Service
@RequiredArgsConstructor
public class TestCaseVersionService {

    private final TestCaseVersionRepository versionRepository;
    private final TestCaseRepository        testCaseRepository;
    private final ObjectMapper              objectMapper;

    /** Called from TestCaseService.update() to snapshot before save */
    @Transactional
    public void snapshot(TestCase tc, User changedBy, String changeSummary) {
        int nextVersion = versionRepository.findMaxVersionNumber(tc) + 1;

        Map<String, Object> snap = new HashMap<>();
        snap.put("title",        tc.getTitle());
        snap.put("description",  tc.getDescription());
        snap.put("preconditions",tc.getPreconditions());
        snap.put("priority",     tc.getPriority() != null ? tc.getPriority().name() : null);
        snap.put("status",       tc.getStatus() != null ? tc.getStatus().name() : null);
        snap.put("versionNumber",nextVersion);
        if (tc.getSteps() != null) {
            snap.put("steps", tc.getSteps().stream().map(s -> {
                Map<String, Object> step = new HashMap<>();
                step.put("stepNumber",    s.getStepNumber());
                step.put("stepAction",    s.getStepAction());
                step.put("expectedResult",s.getExpectedResult());
                return step;
            }).toList());
        }

        String json;
        try { json = objectMapper.writeValueAsString(snap); }
        catch (JsonProcessingException e) { json = "{}"; }

        TestCaseVersion version = TestCaseVersion.builder()
                .testCase(tc)
                .versionNumber(nextVersion)
                .snapshot(json)
                .changedBy(changedBy)
                .changeSummary(changeSummary != null ? changeSummary : "Updated")
                .build();

        versionRepository.save(version);
        tc.setVersionNumber(nextVersion);
    }

    @Transactional(readOnly = true)
    public List<TestCaseVersionResponse> getVersions(UUID testCaseId) {
        TestCase tc = testCaseRepository.findById(testCaseId)
                .orElseThrow(() -> new ResourceNotFoundException("TestCase", testCaseId));
        return versionRepository.findByTestCaseOrderByVersionNumberDesc(tc)
                .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public TestCaseVersionResponse getVersion(UUID testCaseId, Integer versionNumber) {
        TestCase tc = testCaseRepository.findById(testCaseId)
                .orElseThrow(() -> new ResourceNotFoundException("TestCase", testCaseId));
        TestCaseVersion ver = versionRepository.findByTestCaseAndVersionNumber(tc, versionNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Version", versionNumber));
        return toResponse(ver);
    }

    private TestCaseVersionResponse toResponse(TestCaseVersion v) {
        return TestCaseVersionResponse.builder()
                .id(v.getId())
                .versionNumber(v.getVersionNumber())
                .snapshot(v.getSnapshot())
                .changeSummary(v.getChangeSummary())
                .changedByName(v.getChangedBy() != null
                        ? (v.getChangedBy().getFullName() != null
                            ? v.getChangedBy().getFullName()
                            : v.getChangedBy().getUsername())
                        : "System")
                .createdAt(v.getCreatedAt())
                .build();
    }
}
