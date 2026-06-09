package com.testmgmt.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "projects",
        indexes = {
            @Index(name = "idx_projects_owner",  columnList = "owner_id"),
            @Index(name = "idx_projects_parent", columnList = "parent_project_id")
        })
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Project extends BaseEntity {

    @Column(name = "name", nullable = false, length = 150)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id")
    private User owner;

    /** Null = root/parent project; non-null = sub-project */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_project_id")
    private Project parentProject;

    /** Sub-projects of this project (e.g. Claims → Commission, NB, PS) */
    @OneToMany(mappedBy = "parentProject", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Project> subProjects = new ArrayList<>();

    @Column(name = "active", nullable = false)
    @Builder.Default
    private Boolean active = true;
}
