package com.testmgmt.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "test_steps",
        indexes = @Index(name = "idx_ts_testcase", columnList = "test_case_id"))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TestStep extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "test_case_id", nullable = false)
    private TestCase testCase;

    @Column(name = "step_number", nullable = false)
    private Integer stepNumber;

    @Column(name = "step_action", columnDefinition = "TEXT", nullable = false)
    private String stepAction;

    @Column(name = "expected_result", columnDefinition = "TEXT", nullable = false)
    private String expectedResult;

    @Column(name = "actual_result", columnDefinition = "TEXT")
    private String actualResult;
}
