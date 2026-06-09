package com.testmgmt.service;

import com.testmgmt.dto.request.WorkflowDTOs.CreateTagRequest;
import com.testmgmt.dto.response.ResponseDTOs.TagResponse;
import com.testmgmt.entity.Project;
import com.testmgmt.entity.Tag;
import com.testmgmt.entity.TestCase;
import com.testmgmt.exception.ConflictException;
import com.testmgmt.exception.ResourceNotFoundException;
import com.testmgmt.repository.ProjectRepository;
import com.testmgmt.repository.TagRepository;
import com.testmgmt.repository.TestCaseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@SuppressWarnings("null")
@Service
@RequiredArgsConstructor
public class TagService {

    private final TagRepository      tagRepository;
    private final ProjectRepository  projectRepository;
    private final TestCaseRepository testCaseRepository;

    @Transactional(readOnly = true)
    public List<TagResponse> listByProject(UUID projectId) {
        Project project = getProject(projectId);
        return tagRepository.findByProject(project).stream().map(this::toResponse).toList();
    }

    @Transactional
    public TagResponse create(CreateTagRequest request) {
        Project project = getProject(request.getProjectId());
        if (tagRepository.existsByNameAndProject(request.getName(), project)) {
            throw new ConflictException("Tag '" + request.getName() + "' already exists in this project.");
        }
        Tag tag = Tag.builder().name(request.getName()).project(project).build();
        return toResponse(tagRepository.save(tag));
    }

    @Transactional
    public void addToTestCase(UUID testCaseId, UUID tagId) {
        TestCase tc  = getTestCase(testCaseId);
        Tag      tag = tagRepository.findById(tagId)
                .orElseThrow(() -> new ResourceNotFoundException("Tag", tagId));
        tc.getTags().add(tag);
        testCaseRepository.save(tc);
    }

    @Transactional
    public void removeFromTestCase(UUID testCaseId, UUID tagId) {
        TestCase tc  = getTestCase(testCaseId);
        Tag      tag = tagRepository.findById(tagId)
                .orElseThrow(() -> new ResourceNotFoundException("Tag", tagId));
        tc.getTags().remove(tag);
        testCaseRepository.save(tc);
    }

    private Project  getProject(UUID id)  { return projectRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Project", id)); }
    private TestCase getTestCase(UUID id) { return testCaseRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("TestCase", id)); }

    public TagResponse toResponse(Tag t) {
        return TagResponse.builder()
                .id(t.getId()).name(t.getName())
                .projectId(t.getProject().getId()).build();
    }
}
