package com.testmgmt.repository;

import com.testmgmt.entity.TestCase;
import com.testmgmt.entity.TestCaseVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TestCaseVersionRepository extends JpaRepository<TestCaseVersion, UUID> {
    List<TestCaseVersion>    findByTestCaseOrderByVersionNumberDesc(TestCase tc);
    Optional<TestCaseVersion> findByTestCaseAndVersionNumber(TestCase tc, Integer version);

    @Query("SELECT COALESCE(MAX(v.versionNumber), 0) FROM TestCaseVersion v WHERE v.testCase = :tc")
    int findMaxVersionNumber(@Param("tc") TestCase tc);
}
