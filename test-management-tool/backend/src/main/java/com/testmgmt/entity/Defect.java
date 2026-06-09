package com.testmgmt.entity;

import com.testmgmt.enums.DefectPriority;
import com.testmgmt.enums.DefectSeverity;
import com.testmgmt.enums.DefectStatus;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "defects",
        indexes = {
                @Index(name = "idx_def_project", columnList = "project_id"),
                @Index(name = "idx_def_status", columnList = "status"),
                @Index(name = "idx_def_severity", columnList = "severity")
        })
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Defect extends BaseEntity {

    @Column(name = "code", unique = true, nullable = false, length = 20)
    private String code;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "test_case_id")
    private TestCase testCase;

    @Enumerated(EnumType.STRING)
    @Column(name = "severity", nullable = false, length = 20)
    private DefectSeverity severity;

    @Enumerated(EnumType.STRING)
    @Column(name = "priority", nullable = false, length = 5)
    private DefectPriority priority;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private DefectStatus status = DefectStatus.NEW;

    @Column(name = "jira_issue_key", length = 50)
    private String jiraIssueKey;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reported_by_id")
    private User reportedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_to_id")
    private User assignedTo;
}
