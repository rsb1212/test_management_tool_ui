package com.testmgmt.service;

import com.testmgmt.dto.response.ResponseDTOs.SearchResultResponse;
import com.testmgmt.repository.DefectRepository;
import com.testmgmt.repository.TestCaseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SearchService {

    private final TestCaseRepository testCaseRepository;
    private final DefectRepository   defectRepository;

    @Transactional(readOnly = true)
    public List<SearchResultResponse> search(String query, UUID projectId, String email) {
        if (query == null || query.trim().length() < 2) return List.of();

        String q = "%" + query.trim().toLowerCase() + "%";
        List<SearchResultResponse> results = new ArrayList<>();

        // Test cases
        testCaseRepository.searchByQuery(q, projectId, PageRequest.of(0, 20))
                .forEach(tc -> results.add(SearchResultResponse.builder()
                        .type("TEST_CASE")
                        .id(tc.getId())
                        .code(tc.getCode())
                        .title(tc.getTitle())
                        .status(tc.getStatus().name())
                        .projectName(tc.getProject() != null ? tc.getProject().getName() : "")
                        .moduleName(tc.getModule()  != null ? tc.getModule().getName()   : "")
                        .build()));

        // Defects
        defectRepository.searchByQuery(q, projectId, PageRequest.of(0, 10))
                .forEach(d -> results.add(SearchResultResponse.builder()
                        .type("DEFECT")
                        .id(d.getId())
                        .code(d.getCode())
                        .title(d.getTitle())
                        .status(d.getStatus().name())
                        .projectName(d.getProject() != null ? d.getProject().getName() : "")
                        .build()));

        return results;
    }
}
