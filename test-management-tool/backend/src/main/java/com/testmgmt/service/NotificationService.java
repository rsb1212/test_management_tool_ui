package com.testmgmt.service;

import com.testmgmt.dto.response.ResponseDTOs.NotificationResponse;
import com.testmgmt.entity.Notification;
import com.testmgmt.entity.User;
import com.testmgmt.enums.NotificationType;
import com.testmgmt.exception.ResourceNotFoundException;
import com.testmgmt.repository.NotificationRepository;
import com.testmgmt.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@SuppressWarnings("null")
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository         userRepository;

    // ── Create a notification for a user ─────────────────────
    @Transactional
    public void create(User user, NotificationType type, String title, String message,
                       String entityType, UUID entityId) {
        Notification n = Notification.builder()
                .user(user)
                .type(type)
                .title(title)
                .message(message)
                .entityType(entityType)
                .entityId(entityId)
                .isRead(false)
                .build();
        notificationRepository.save(n);
    }

    // ── Get all for current user ─────────────────────────────
    @Transactional(readOnly = true)
    public List<NotificationResponse> getMyNotifications(String email) {
        User user = getUser(email);
        return notificationRepository
                .findByUserOrderByCreatedAtDesc(user)
                .stream().map(this::toResponse).toList();
    }

    // ── Unread count (for bell badge) ────────────────────────
    @Transactional(readOnly = true)
    public long getUnreadCount(String email) {
        User user = getUser(email);
        return notificationRepository.countByUserAndIsReadFalse(user);
    }

    // ── Mark single as read ──────────────────────────────────
    @Transactional
    public void markRead(UUID notifId, String email) {
        Notification n = notificationRepository.findById(notifId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification", notifId));
        if (!n.getUser().getEmail().equals(email)) {
            throw new ResourceNotFoundException("Notification", notifId);
        }
        n.setIsRead(true);
        notificationRepository.save(n);
    }

    // ── Mark all read ────────────────────────────────────────
    @Transactional
    public void markAllRead(String email) {
        User user = getUser(email);
        notificationRepository.markAllReadForUser(user);
    }

    // ── Helper ───────────────────────────────────────────────
    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User", email));
    }

    public NotificationResponse toResponse(Notification n) {
        return NotificationResponse.builder()
                .id(n.getId())
                .type(n.getType())
                .title(n.getTitle())
                .message(n.getMessage())
                .entityType(n.getEntityType())
                .entityId(n.getEntityId())
                .isRead(n.getIsRead())
                .createdAt(n.getCreatedAt())
                .build();
    }
}
