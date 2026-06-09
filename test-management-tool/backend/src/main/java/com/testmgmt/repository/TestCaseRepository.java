package com.testmgmt.repository;

import com.testmgmt.entity.Module;
import com.testmgmt.entity.Project;
import com.testmgmt.entity.TestCase;
import com.testmgmt.entity.User;
import com.testmgmt.enums.Priority;
import com.testmgmt.enums.TestStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TestCaseRepository extends JpaRepository<TestCase, UUID> {

    Page<TestCase> findByProject(Project project, Pageable pageable);
    Page<TestCase> findByProjectAndStatus(Project project, TestStatus status, Pageable pageable);
    Page<TestCase> findByProjectAndPriority(Project project, Priority priority, Pageable pageable);

    List<TestCase> findByProject(Project project);
    List<TestCase> findByProjectAndStatus(Project project, TestStatus status);
    List<TestCase> findByAssignedTo(User assignedTo);
    List<TestCase> findByAssignedToAndProject(User assignedTo, Project project);
    List<TestCase> findByStatusIn(List<TestStatus> statuses);

    Optional<TestCase> findByCode(String code);
    boolean existsByTitleAndProject(String title, Project project);

    // ── Count by project ──────────────────────────────────────────────────────
    long countByProject(Project project);
    long countByProjectAndStatus(Project project, TestStatus status);

    // ── Count by project + module (for module breakdown) ──────────────────────
    long countByProjectAndModule(Project project, Module module);
    long countByProjectAndModuleAndStatus(Project project, Module module, TestStatus status);

    @Query("SELECT COUNT(tc) FROM TestCase tc WHERE tc.project = :project AND tc.status IN :statuses")
    long countByProjectAndStatusIn(@Param("project") Project project,
                                   @Param("statuses") List<TestStatus> statuses);

    @Query(value = "SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM 4) AS INTEGER)), 0) " +
                   "FROM test_cases WHERE code ~ '^TC-[0-9]+$'", nativeQuery = true)
    int findMaxCodeSequence();

    @Query("SELECT tc FROM TestCase tc WHERE tc.module.name = :moduleName " +
           "AND tc.status IN (com.testmgmt.enums.TestStatus.DRAFT, " +
           "com.testmgmt.enums.TestStatus.SME_APPROVED, " +
           "com.testmgmt.enums.TestStatus.PENDING_SME_REVIEW) " +
           "AND tc.assignedTo IS NULL " +
           "AND (:projectId IS NULL OR tc.project.id = :projectId)")
    List<TestCase> findSmeApprovedByModuleName(@Param("moduleName") String moduleName,
                                               @Param("projectId")  UUID projectId);

    @Query("SELECT tc FROM TestCase tc WHERE tc.assignedTo = :tester " +
           "AND (:projectId IS NULL OR tc.project.id = :projectId) " +
           "ORDER BY tc.createdAt DESC")
    List<TestCase> findByAssignedToWithProject(@Param("tester")    User tester,
                                               @Param("projectId") UUID projectId);

    @Query("SELECT tc FROM TestCase tc WHERE " +
           "(LOWER(tc.title) LIKE :q OR LOWER(tc.code) LIKE :q) " +
           "AND (:projectId IS NULL OR tc.project.id = :projectId)")
    List<TestCase> searchByQuery(@Param("q") String q,
                                 @Param("projectId") UUID projectId,
                                 Pageable pageable);

    @Query("SELECT tc FROM TestCase tc WHERE tc.isRegression = true " +
           "AND (:projectId IS NULL OR tc.project.id = :projectId)")
    List<TestCase> findRegressionCases(@Param("projectId") UUID projectId);

    @Query("SELECT tc.assignedTo.id, COUNT(tc) FROM TestCase tc " +
           "WHERE tc.status IN ('ASSIGNED', 'IN_PROGRESS') " +
           "AND tc.assignedTo IS NOT NULL GROUP BY tc.assignedTo.id")
    List<Object[]> countPendingPerTester();
}
