package com.testmgmt.entity;

import com.testmgmt.enums.AssignmentRole;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "test_case_assignments",
        indexes = {
                @Index(name = "idx_tca_testcase", columnList = "test_case_id"),
                @Index(name = "idx_tca_tester",   columnList = "assigned_to_id")
        })
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TestCaseAssignment extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "test_case_id", nullable = false)
    private TestCase testCase;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_to_id", nullable = false)
    private User assignedTo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_by_id", nullable = false)
    private User assignedBy;

    @Column(name = "assigned_at")
    private Instant assignedAt;

    @Column(name = "due_date")
    private LocalDate dueDate;

    /** Lead vs Member vs Co-Tester vs Reviewer */
    @Enumerated(EnumType.STRING)
    @Column(name = "assignment_role", length = 20)
    @Builder.Default
    private AssignmentRole assignmentRole = AssignmentRole.MEMBER;

    /** Previous assignee when this is a reassignment record */
    @Column(name = "reassigned_from_id")
    private UUID reassignedFromId;

    /** Optional reason for reassignment */
    @Column(name = "reassign_reason", length = 255)
    private String reassignReason;
}
