package com.testmgmt.repository;

import com.testmgmt.entity.Project;
import com.testmgmt.entity.TestCase;
import com.testmgmt.entity.TestExecution;
import com.testmgmt.entity.User;
import com.testmgmt.enums.ExecResult;
import com.testmgmt.enums.ExecutionEnvironment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TestExecutionRepository extends JpaRepository<TestExecution, UUID> {

    // ── By test case ───────────────────────────────────────────────────────────
    List<TestExecution>     findByTestCaseOrderByExecutedAtDesc(TestCase testCase);
    Page<TestExecution>     findByTestCase(TestCase testCase, Pageable pageable);
    Optional<TestExecution> findByTestCaseAndIsLatestTrue(TestCase testCase);

    // ── By tester ─────────────────────────────────────────────────────────────
    List<TestExecution> findByExecutedBy(User tester);
    Page<TestExecution> findByExecutedBy(User tester, Pageable pageable);
    Page<TestExecution> findByExecutedByAndProject(User tester, Project project, Pageable pageable);

    // ── By project ────────────────────────────────────────────────────────────
    List<TestExecution> findByProject(Project project);
    Page<TestExecution> findByProject(Project project, Pageable pageable);
    Page<TestExecution> findByProjectAndResult(Project project, ExecResult result, Pageable pageable);
    Page<TestExecution> findByProjectAndEnvironment(Project project, ExecutionEnvironment env, Pageable pageable);

    // ── Latest-only ───────────────────────────────────────────────────────────
    List<TestExecution> findByProjectAndIsLatestTrue(Project project);
    List<TestExecution> findByExecutedByAndIsLatestTrue(User tester);
    List<TestExecution> findByProjectAndResultAndIsLatestTrue(Project project, ExecResult result);

    // ── Date range ────────────────────────────────────────────────────────────
    List<TestExecution> findByProjectAndExecutedAtBetween(Project project, Instant from, Instant to);
    List<TestExecution> findByExecutedByAndExecutedAtBetween(User tester, Instant from, Instant to);

    // ── Counts ────────────────────────────────────────────────────────────────
    long countByProject(Project project);
    long countByExecutedBy(User tester);
    long countByProjectAndResult(Project project, ExecResult result);
    long countByExecutedByAndResult(User tester, ExecResult result);
    long countByExecutedByAndProject(User tester, Project project);

    @Query("SELECT COUNT(te) FROM TestExecution te WHERE te.executedBy = :tester " +
           "AND te.result = :result AND te.isLatest = true")
    long countLatestByTesterAndResult(@Param("tester") User tester, @Param("result") ExecResult result);

    // ── Mark previous executions as not-latest ────────────────────────────────
    @Modifying
    @Query("UPDATE TestExecution te SET te.isLatest = false " +
           "WHERE te.testCase = :testCase AND te.isLatest = true")
    void markAllNotLatest(@Param("testCase") TestCase testCase);

    // ── Max run number ────────────────────────────────────────────────────────
    @Query("SELECT COALESCE(MAX(te.runNumber), 0) FROM TestExecution te WHERE te.testCase = :tc")
    int findMaxRunNumber(@Param("tc") TestCase tc);

    // ── Tester summary stats (used by productivity dashboard) ─────────────────
    @Query("SELECT te.executedBy.id, te.result, COUNT(te) FROM TestExecution te " +
           "WHERE te.project = :project AND te.isLatest = true " +
           "GROUP BY te.executedBy.id, te.result")
    List<Object[]> countByTesterAndResultForProject(@Param("project") Project project);

    @Query("SELECT te.executedBy.id, te.result, COUNT(te) FROM TestExecution te " +
           "WHERE te.isLatest = true GROUP BY te.executedBy.id, te.result")
    List<Object[]> countByTesterAndResultAllProjects();

    // ── Daily execution trend (project-level) ─────────────────────────────────
    @Query(value = "SELECT DATE(executed_at) as exec_date, result, COUNT(*) as cnt " +
                   "FROM test_executions WHERE project_id = :projectId " +
                   "AND executed_at >= :from GROUP BY DATE(executed_at), result " +
                   "ORDER BY exec_date", nativeQuery = true)
    List<Object[]> dailyExecutionTrend(@Param("projectId") UUID projectId,
                                        @Param("from") Instant from);

    /**
     * NEW — all executions by a specific tester within a date window.
     * Used for day-by-day individual productivity history.
     */
    @Query("SELECT te FROM TestExecution te " +
           "WHERE te.executedBy = :tester " +
           "AND te.executedAt >= :from AND te.executedAt < :to " +
           "ORDER BY te.executedAt DESC")
    List<TestExecution> findByTesterAndDateRange(
            @Param("tester") User tester,
            @Param("from")   Instant from,
            @Param("to")     Instant to);

    /**
     * NEW — all executions for all testers on a specific calendar day.
     * Used for manager daily-tracking dashboard.
     */
    @Query("SELECT te FROM TestExecution te " +
           "WHERE te.executedAt >= :from AND te.executedAt < :to " +
           "ORDER BY te.executedBy.id, te.executedAt DESC")
    List<TestExecution> findAllByDateRange(
            @Param("from") Instant from,
            @Param("to")   Instant to);
}
