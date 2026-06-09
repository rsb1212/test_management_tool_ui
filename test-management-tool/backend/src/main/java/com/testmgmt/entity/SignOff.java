package com.testmgmt.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "sign_offs",
        indexes = {
                @Index(name = "idx_so_project", columnList = "project_id"),
                @Index(name = "idx_so_sme", columnList = "signed_off_by_id")
        })
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SignOff extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "signed_off_by_id", nullable = false)
    private User signedOffBy;

    @Column(name = "passed_case_count")
    private Integer passedCaseCount;

    @Column(name = "exported_doc_path", columnDefinition = "TEXT")
    private String exportedDocPath;

    @Column(name = "signed_off_at")
    private Instant signedOffAt;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;
}
