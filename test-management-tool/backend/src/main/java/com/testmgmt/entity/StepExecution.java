package com.testmgmt.entity;

import com.testmgmt.enums.ExecResult;
import jakarta.persistence.*;
import lombok.*;

/**
 * Records the actual result of each individual test step
 * during a test execution. Allows step-level pass/fail tracking.
 */
@Entity
@Table(name = "step_executions",
        indexes = {
                @Index(name = "idx_se_execution", columnList = "test_execution_id"),
                @Index(name = "idx_se_step",      columnList = "test_step_id")
        })
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class StepExecution extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "test_execution_id", nullable = false)
    private TestExecution testExecution;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "test_step_id", nullable = false)
    private TestStep testStep;

    @Column(name = "step_number", nullable = false)
    private Integer stepNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "result", nullable = false, length = 20)
    @Builder.Default
    private ExecResult result = ExecResult.IN_PROGRESS;

    @Column(name = "actual_result", columnDefinition = "TEXT")
    private String actualResult;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;
}
