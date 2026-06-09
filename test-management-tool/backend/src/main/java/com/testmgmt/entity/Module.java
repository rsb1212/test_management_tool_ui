package com.testmgmt.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "modules",
        indexes = {
            @Index(name = "idx_modules_project", columnList = "project_id"),
            @Index(name = "idx_modules_parent",  columnList = "parent_module_id")
        })
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Module extends BaseEntity {

    @Column(name = "name", nullable = false, length = 150)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    /** Supports sub-module hierarchy: Module → SubModule → SubModule1 */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_module_id")
    private Module parentModule;

    /** Display order within parent */
    @Column(name = "sort_order")
    @Builder.Default
    private Integer sortOrder = 0;
}
