package com.testmgmt.repository;

import com.testmgmt.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProjectRepository extends JpaRepository<Project, UUID> {

    /** All active projects (root + sub) */
    List<Project> findByActiveTrue();

    /** Only root-level active projects (no parent) */
    List<Project> findByActiveTrueAndParentProjectIsNull();

    /** Sub-projects of a given parent */
    List<Project> findByActiveTrueAndParentProject(Project parent);

    /** Sub-projects by parent ID */
    @Query("SELECT p FROM Project p WHERE p.active = true AND p.parentProject.id = :parentId")
    List<Project> findByActiveTrueAndParentProjectId(UUID parentId);

    Optional<Project> findByNameAndParentProject(String name, Project parent);
}
