package com.testmgmt.repository;

import com.testmgmt.entity.Project;
import com.testmgmt.entity.Tag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TagRepository extends JpaRepository<Tag, UUID> {
    List<Tag>       findByProject(Project project);
    Optional<Tag>   findByNameAndProject(String name, Project project);
    boolean         existsByNameAndProject(String name, Project project);
}
