package com.testmgmt.repository;

import com.testmgmt.entity.Attachment;
import com.testmgmt.enums.AttachmentEntityType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AttachmentRepository extends JpaRepository<Attachment, UUID> {
    List<Attachment> findByEntityTypeAndEntityId(AttachmentEntityType type, UUID entityId);
    long             countByEntityTypeAndEntityId(AttachmentEntityType type, UUID entityId);
    void             deleteByEntityTypeAndEntityId(AttachmentEntityType type, UUID entityId);
}
