package com.testmgmt.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "audit_logs",
        indexes = @Index(name = "idx_al_entity", columnList = "entity_type,entity_id"))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AuditLog extends BaseEntity {

    @Column(name = "entity_type", length = 50)
    private String entityType;

    @Column(name = "entity_id")
    private UUID entityId;

    @Column(name = "action", length = 30)
    private String action;

    @Column(name = "performed_by", length = 120)
    private String performedBy;

    @Column(name = "diff", columnDefinition = "TEXT")
    private String diff;  // JSON diff

    @Column(name = "performed_at")
    private Instant performedAt;
}
