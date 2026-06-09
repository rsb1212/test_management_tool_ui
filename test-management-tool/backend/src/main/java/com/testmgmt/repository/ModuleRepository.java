package com.testmgmt.repository;

import com.testmgmt.entity.Module;
import com.testmgmt.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ModuleRepository extends JpaRepository<Module, UUID> {
    List<Module> findByProject(Project project);
    List<Module> findByProjectAndParentModuleIsNull(Project project);
    Optional<Module> findByNameAndProject(String name, Project project);
    Optional<Module> findByNameAndProjectAndParentModule(String name, Project project, Module parent);

    @Query("SELECT m FROM Module m WHERE m.project = :project AND m.parentModule = :parent")
    List<Module> findByProjectAndParentModule(Project project, Module parent);
}
