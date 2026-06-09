package com.testmgmt.entity;

import com.testmgmt.enums.Priority;
import com.testmgmt.enums.TestStatus;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "test_cases",
        indexes = {
                @Index(name = "idx_tc_project",    columnList = "project_id"),
                @Index(name = "idx_tc_priority",   columnList = "priority"),
                @Index(name = "idx_tc_status",     columnList = "status"),
                @Index(name = "idx_tc_assignedto", columnList = "assigned_to_id")
        })
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TestCase extends BaseEntity {

    @Column(name = "code", unique = true, nullable = false, length = 20)
    private String code;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "preconditions", columnDefinition = "TEXT")
    private String preconditions;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "module_id")
    private Module module;

    @Enumerated(EnumType.STRING)
    @Column(name = "priority", nullable = false, length = 20)
    private Priority priority;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private TestStatus status = TestStatus.DRAFT;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id")
    private User createdBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by_id")
    private User reviewedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_to_id")
    private User assignedTo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by_id")
    private User updatedBy;

    /** Version counter — incremented on every save */
    @Column(name = "version_number", nullable = false)
    @Builder.Default
    private Integer versionNumber = 1;

    /** Regression suite membership */
    @Column(name = "is_regression", nullable = false)
    @Builder.Default
    private Boolean isRegression = false;

    /** Reusable template flag */
    @Column(name = "is_template", nullable = false)
    @Builder.Default
    private Boolean isTemplate = false;

    @OneToMany(mappedBy = "testCase", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("stepNumber ASC")
    @Builder.Default
    private List<TestStep> steps = new ArrayList<>();

    /** Defects related to this test case — cascade delete */
    @OneToMany(mappedBy = "testCase", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Defect> defects = new ArrayList<>();

    /** Test case assignments — cascade delete */
    @OneToMany(mappedBy = "testCase", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<TestCaseAssignment> assignments = new ArrayList<>();

    /** Test case reviews — cascade delete */
    @OneToMany(mappedBy = "testCase", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<TestCaseReview> reviews = new ArrayList<>();

    /** Test executions — cascade delete */
    @OneToMany(mappedBy = "testCase", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<TestExecution> executions = new ArrayList<>();

    /** Functional tags (many-to-many, join table: test_case_tags) */
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "test_case_tags",
        joinColumns        = @JoinColumn(name = "test_case_id"),
        inverseJoinColumns = @JoinColumn(name = "tag_id")
    )
    @Builder.Default
    private Set<Tag> tags = new HashSet<>();

    /** Requirement traceability (many-to-many, join table: tc_requirements) */
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "tc_requirements",
        joinColumns        = @JoinColumn(name = "test_case_id"),
        inverseJoinColumns = @JoinColumn(name = "requirement_id")
    )
    @Builder.Default
    private Set<Requirement> requirements = new HashSet<>();
}
