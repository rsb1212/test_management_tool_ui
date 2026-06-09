package com.testmgmt.entity;

import com.testmgmt.enums.RequirementType;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "requirements",
       indexes = {
           @Index(name = "idx_req_project", columnList = "project_id"),
           @Index(name = "idx_req_code",    columnList = "code")
       })
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Requirement extends BaseEntity {

    @Column(name = "code", unique = true, nullable = false, length = 30)
    private String code;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 20)
    @Builder.Default
    private RequirementType type = RequirementType.FUNCTIONAL;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id")
    private User createdBy;
}
