package com.testmgmt.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "excel_import_logs",
        indexes = {
                @Index(name = "idx_eil_project", columnList = "project_id"),
                @Index(name = "idx_eil_importer", columnList = "imported_by_id")
        })
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ExcelImportLog extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "imported_by_id", nullable = false)
    private User importedBy;

    @Column(name = "file_name", length = 255)
    private String fileName;

    @Column(name = "row_count")
    private Integer rowCount;

    @Column(name = "success_count")
    private Integer successCount;

    @Column(name = "error_count")
    private Integer errorCount;

    @Column(name = "errors", columnDefinition = "TEXT")
    private String errors;  // JSON array of {row, column, message}

    @Column(name = "imported_at")
    private Instant importedAt;
}
