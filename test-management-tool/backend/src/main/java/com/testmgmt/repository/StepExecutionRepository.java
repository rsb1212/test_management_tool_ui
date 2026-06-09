package com.testmgmt.repository;

import com.testmgmt.entity.StepExecution;
import com.testmgmt.entity.TestExecution;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface StepExecutionRepository extends JpaRepository<StepExecution, UUID> {
    List<StepExecution> findByTestExecutionOrderByStepNumberAsc(TestExecution execution);
    void deleteByTestExecution(TestExecution execution);
}
