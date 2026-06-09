package com.testmgmt.repository;

import com.testmgmt.entity.Defect;
import com.testmgmt.entity.Project;
import com.testmgmt.enums.DefectStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DefectRepository extends JpaRepository<Defect, UUID> {

    List<Defect>  findByProject(Project project);
    Page<Defect>  findByProject(Project project, Pageable pageable);
    long          countByProject(Project project);
    long          countByProjectAndStatus(Project project, DefectStatus status);
    long          countByProjectAndStatusIn(Project project, List<DefectStatus> statuses);

    @Query(value = "SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM 5) AS INTEGER)), 0) " +
                   "FROM defects WHERE code ~ '^DEF-[0-9]+$'", nativeQuery = true)
    int findMaxCodeSequence();

    @Query("SELECT d FROM Defect d WHERE " +
           "(LOWER(d.title) LIKE :q OR LOWER(d.code) LIKE :q) " +
           "AND (:projectId IS NULL OR d.project.id = :projectId)")
    List<Defect> searchByQuery(@Param("q") String q,
                               @Param("projectId") UUID projectId,
                               Pageable pageable);
}
