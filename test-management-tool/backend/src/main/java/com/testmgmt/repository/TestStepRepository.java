package com.testmgmt.repository;

import com.testmgmt.entity.TestCase;
import com.testmgmt.entity.TestStep;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TestStepRepository extends JpaRepository<TestStep, UUID> {
    List<TestStep> findByTestCaseOrderByStepNumberAsc(TestCase testCase);
    void deleteByTestCase(TestCase testCase);
}
