package com.testmgmt.entity;

import com.testmgmt.enums.ExecResult;
import com.testmgmt.enums.ExecutionEnvironment;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Records every execution attempt of a test case by a tester.
 * Multiple executions per test case are allowed (re-runs, regression, etc.)
 * The LATEST execution result drives the test case status.
 */
@Entity
@Table(name = "test_executions",
        indexes = {
                @Index(name = "idx_te_testcase",   columnList = "test_case_id"),
                @Index(name = "idx_te_executed_by", columnList = "executed_by_id"),
                @Index(name = "idx_te_result",      columnList = "result"),
                @Index(name = "idx_te_project",     columnList = "project_id"),
                @Index(name = "idx_te_executed_at", columnList = "executed_at")
        })
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TestExecution extends BaseEntity {

    /** The test case being executed */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "test_case_id", nullable = false)
    private TestCase testCase;

    /** Project (denormalised for fast dashboard queries) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    /** Tester who ran this execution */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "executed_by_id", nullable = false)
    private User executedBy;

    /** Execution result */
    @Enumerated(EnumType.STRING)
    @Column(name = "result", nullable = false, length = 20)
    private ExecResult result;

    /** Environment where the test was run */
    @Enumerated(EnumType.STRING)
    @Column(name = "environment", nullable = false, length = 20)
    @Builder.Default
    private ExecutionEnvironment environment = ExecutionEnvironment.SIT;

    /** Build / sprint / release label */
    @Column(name = "build_version", length = 80)
    private String buildVersion;

    /** Execution run number (1 = first run, 2 = re-run, etc.) */
    @Column(name = "run_number", nullable = false)
    @Builder.Default
    private Integer runNumber = 1;

    /** Time taken to execute in seconds */
    @Column(name = "duration_seconds")
    private Integer durationSeconds;

    /** What actually happened (for FAILED/BLOCKED/DEFECT_RAISED) */
    @Column(name = "actual_result", columnDefinition = "TEXT")
    private String actualResult;

    /** Tester notes / observations */
    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    /** Defect ID raised if result = DEFECT_RAISED */
    @Column(name = "defect_ref", length = 80)
    private String defectRef;

    /** Timestamp when execution was performed */
    @Column(name = "executed_at", nullable = false)
    private Instant executedAt;

    /** Whether this is the latest execution for the test case */
    @Column(name = "is_latest", nullable = false)
    @Builder.Default
    private Boolean isLatest = true;
}
