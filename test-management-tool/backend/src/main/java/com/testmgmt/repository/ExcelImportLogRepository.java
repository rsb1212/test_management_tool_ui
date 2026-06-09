package com.testmgmt.repository;

import com.testmgmt.entity.ExcelImportLog;
import com.testmgmt.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ExcelImportLogRepository extends JpaRepository<ExcelImportLog, UUID> {
    List<ExcelImportLog> findByProjectOrderByImportedAtDesc(Project project);
}
