package com.testmgmt.service;

import com.testmgmt.dto.response.ResponseDTOs.AttachmentResponse;
import com.testmgmt.entity.Attachment;
import com.testmgmt.entity.User;
import com.testmgmt.enums.AttachmentEntityType;
import com.testmgmt.exception.ResourceNotFoundException;
import com.testmgmt.repository.AttachmentRepository;
import com.testmgmt.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.*;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@SuppressWarnings({"null"})
public class AttachmentService {

    private final AttachmentRepository attachmentRepository;
    private final UserRepository       userRepository;

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    @Transactional
    public AttachmentResponse upload(AttachmentEntityType entityType, UUID entityId,
                                     MultipartFile file, String uploaderEmail) throws IOException {
        User uploader = userRepository.findByEmail(uploaderEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User", uploaderEmail));

        // Build a safe file path: uploads/{type}/{entityId}/{uuid}_{filename}
        Path dir = Paths.get(uploadDir, entityType.name().toLowerCase(), entityId.toString());
        Files.createDirectories(dir);

        String originalName = file.getOriginalFilename() != null
                ? file.getOriginalFilename() : "file";
        String safeFilename = UUID.randomUUID() + "_" + originalName
                .replaceAll("[^a-zA-Z0-9._-]", "_");
        Path target = dir.resolve(safeFilename);
        Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);

        Attachment att = Attachment.builder()
                .entityType(entityType)
                .entityId(entityId)
                .fileName(file.getOriginalFilename() != null ? file.getOriginalFilename() : "attachment")
                .filePath(target.toString())
                .mimeType(file.getContentType())
                .fileSizeBytes(file.getSize())
                .uploadedBy(uploader)
                .build();

        Attachment saved = attachmentRepository.save(att);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<AttachmentResponse> list(AttachmentEntityType entityType, UUID entityId) {
        return attachmentRepository.findByEntityTypeAndEntityId(entityType, entityId)
                .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public Resource download(UUID attachmentId) throws MalformedURLException {
        Attachment att = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Attachment", attachmentId));
        Path path = Paths.get(att.getFilePath());
        Resource resource = new UrlResource(path.toUri());
        if (!resource.exists()) throw new ResourceNotFoundException("File", att.getFilePath());
        return resource;
    }

    @Transactional
    public void delete(UUID attachmentId, String requesterEmail) {
        Attachment att = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Attachment", attachmentId));
        try { Files.deleteIfExists(Paths.get(att.getFilePath())); } catch (IOException ignored) {}
        attachmentRepository.delete(att);
    }

    public AttachmentResponse toResponse(Attachment a) {
        return AttachmentResponse.builder()
                .id(a.getId()).entityType(a.getEntityType()).entityId(a.getEntityId())
                .fileName(a.getFileName()).mimeType(a.getMimeType())
                .fileSizeBytes(a.getFileSizeBytes())
                .uploadedByName(a.getUploadedBy().getFullName() != null
                        ? a.getUploadedBy().getFullName() : a.getUploadedBy().getUsername())
                .createdAt(a.getCreatedAt())
                .downloadUrl("/api/v1/attachments/" + a.getId() + "/download")
                .build();
    }
}
