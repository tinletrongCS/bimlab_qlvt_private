package com.bimlab.asset.repository;

import com.bimlab.asset.model.Contract;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ContractRepository extends JpaRepository<Contract, Long> {
    Optional<Contract> findByContractNumber(String contractNumber);
    boolean existsByContractNumber(String contractNumber);
}
