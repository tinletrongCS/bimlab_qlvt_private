package com.bimlab.asset.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "asset_code_sequences", schema = "asset")
@Getter
@Setter
@NoArgsConstructor
public class AssetCodeSequence {
    @Id
    @Column(name = "category_id")
    private Long categoryId;

    @Column(name = "current_number", nullable = false)
    private Long currentNumber;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public AssetCodeSequence(Long categoryId) {
        this.categoryId = categoryId;
        this.currentNumber = 0L;
    }

    @PrePersist
    void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
        if (currentNumber == null) currentNumber = 0L;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
