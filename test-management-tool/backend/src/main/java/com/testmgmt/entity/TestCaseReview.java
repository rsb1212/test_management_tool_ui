package com.testmgmt.entity;

import com.testmgmt.enums.ReviewAction;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "test_case_reviews",
        indexes = {
                @Index(name = "idx_tcr_testcase", columnList = "test_case_id"),
                @Index(name = "idx_tcr_sme", columnList = "reviewed_by_id")
        })
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TestCaseReview extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "test_case_id", nullable = false)
    private TestCase testCase;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by_id", nullable = false)
    private User reviewedBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "action", nullable = false, length = 20)
    private ReviewAction action;

    @Column(name = "comment", columnDefinition = "TEXT")
    private String comment;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;
}
