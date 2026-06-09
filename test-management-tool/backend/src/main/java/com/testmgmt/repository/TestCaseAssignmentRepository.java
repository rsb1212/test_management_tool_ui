package com.testmgmt.repository;

import com.testmgmt.entity.TestCase;
import com.testmgmt.entity.TestCaseAssignment;
import com.testmgmt.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TestCaseAssignmentRepository extends JpaRepository<TestCaseAssignment, UUID> {
    List<TestCaseAssignment> findByAssignedTo(User tester);
    List<TestCaseAssignment> findByTestCase(TestCase testCase);
}
