package com.testmgmt.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "test_case_versions",
       indexes = {
           @Index(name = "idx_tcv_testcase", columnList = "test_case_id"),
           @Index(name = "idx_tcv_ver_num",  columnList = "test_case_id,version_number")
       })
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TestCaseVersion extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "test_case_id", nullable = false)
    private TestCase testCase;

    @Column(name = "version_number", nullable = false)
    private Integer versionNumber;

    /** Full JSON snapshot of title, description, preconditions, priority, steps */
    @Column(name = "snapshot", nullable = false, columnDefinition = "TEXT")
    private String snapshot;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "changed_by_id")
    private User changedBy;

    @Column(name = "change_summary", length = 255)
    private String changeSummary;
}
