package com.testmgmt.repository;

import com.testmgmt.entity.TestCase;
import com.testmgmt.entity.TestCaseReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TestCaseReviewRepository extends JpaRepository<TestCaseReview, UUID> {
    List<TestCaseReview> findByTestCase(TestCase testCase);
    List<TestCaseReview> findByTestCaseOrderByReviewedAtDesc(TestCase testCase);
}
