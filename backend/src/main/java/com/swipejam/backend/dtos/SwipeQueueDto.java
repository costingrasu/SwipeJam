package com.swipejam.backend.dtos;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SwipeQueueDto {
    private List<QueueItemDto> songs;
    private Boolean usedSuperlike;
}
