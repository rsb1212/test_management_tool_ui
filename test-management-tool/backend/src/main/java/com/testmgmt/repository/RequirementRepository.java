package com.testmgmt.repository;

import com.testmgmt.entity.Project;
import com.testmgmt.entity.Requirement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RequirementRepository extends JpaRepository<Requirement, UUID> {
    List<Requirement> findByProject(Project project);
    Optional<Requirement> findByCode(String code);
    boolean existsByCodeAndProject(String code, Project project);

    @org.springframework.data.jpa.repository.Query(
        "SELECT COALESCE(MAX(CAST(SUBSTRING(r.code, 5) AS int)), 0) FROM Requirement r " +
        "WHERE r.code LIKE 'REQ-%'")
    int findMaxCodeSequence();
}
