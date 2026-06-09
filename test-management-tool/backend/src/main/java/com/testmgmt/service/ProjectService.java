package com.testmgmt.service;

import com.testmgmt.dto.request.WorkflowDTOs.CreateProjectRequest;
import com.testmgmt.dto.response.ResponseDTOs.*;
import com.testmgmt.entity.Project;
import com.testmgmt.entity.User;
import com.testmgmt.exception.ResourceNotFoundException;
import com.testmgmt.repository.ProjectRepository;
import com.testmgmt.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.UUID;

@SuppressWarnings("null")
@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final UserRepository    userRepository;

    @Transactional
    public ProjectResponse create(CreateProjectRequest request, String ownerEmail) {
        User owner = userRepository.findByEmail(ownerEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User", ownerEmail));

        Project parent = null;
        if (request.getParentProjectId() != null) {
            parent = projectRepository.findById(request.getParentProjectId())
                    .orElseThrow(() -> new ResourceNotFoundException("Parent Project",
                            request.getParentProjectId()));
        }

        Project project = Project.builder()
                .name(request.getName())
                .description(request.getDescription())
                .owner(owner)
                .parentProject(parent)
                .active(true)
                .build();

        return toResponse(projectRepository.save(project), true);
    }

    /** Returns root-level projects with their sub-projects nested inside. */
    public List<ProjectResponse> findAll() {
        return projectRepository.findByActiveTrueAndParentProjectIsNull()
                .stream()
                .map(p -> toResponse(p, true))
                .toList();
    }

    /** Returns all projects flat (root + sub) — used for dropdowns. */
    public List<ProjectResponse> findAllFlat() {
        return projectRepository.findByActiveTrue()
                .stream()
                .map(p -> toResponse(p, false))
                .toList();
    }

    public List<ProjectResponse> findSubProjects(UUID parentId) {
        Project parent = projectRepository.findById(parentId)
                .orElseThrow(() -> new ResourceNotFoundException("Project", parentId));
        return projectRepository.findByActiveTrueAndParentProject(parent)
                .stream()
                .map(p -> toResponse(p, false))
                .toList();
    }

    public ProjectResponse findById(UUID id) {
        return toResponse(projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project", id)), true);
    }

    @Transactional
    public ProjectResponse update(UUID id, CreateProjectRequest request) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project", id));
        project.setName(request.getName());
        project.setDescription(request.getDescription());

        if (request.getParentProjectId() != null) {
            Project parent = projectRepository.findById(request.getParentProjectId())
                    .orElseThrow(() -> new ResourceNotFoundException("Parent Project",
                            request.getParentProjectId()));
            project.setParentProject(parent);
        }
        return toResponse(projectRepository.save(project), true);
    }

    @Transactional
    public void deactivate(UUID id) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project", id));
        project.setActive(false);
        // Also deactivate sub-projects
        projectRepository.findByActiveTrueAndParentProject(project)
                .forEach(sub -> { sub.setActive(false); projectRepository.save(sub); });
        projectRepository.save(project);
    }

    // ── Static helpers ────────────────────────────────────────────────────────

    public static ProjectResponse toResponse(Project p, boolean includeSubProjects) {
        if (p == null) return null;
        List<ProjectResponse> subs = Collections.emptyList();
        if (includeSubProjects && p.getSubProjects() != null && !p.getSubProjects().isEmpty()) {
            subs = p.getSubProjects().stream()
                    .filter(s -> Boolean.TRUE.equals(s.getActive()))
                    .map(s -> toResponse(s, false))
                    .toList();
        }
        return ProjectResponse.builder()
                .id(p.getId())
                .name(p.getName())
                .description(p.getDescription())
                .active(p.getActive())
                .createdAt(p.getCreatedAt())
                .owner(AuthService.toUserResponse(p.getOwner()))
                .parentProjectId(p.getParentProject() != null ? p.getParentProject().getId() : null)
                .parentProjectName(p.getParentProject() != null ? p.getParentProject().getName() : null)
                .subProjects(subs)
                .build();
    }

    /** Backward-compat overload */
    public static ProjectResponse toResponse(Project p) {
        return toResponse(p, false);
    }
}
