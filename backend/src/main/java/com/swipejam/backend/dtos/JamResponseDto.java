package com.swipejam.backend.dtos;

import lombok.Builder;
import lombok.Data;
import java.util.UUID;

@Data
@Builder
public class JamResponseDto {
    private UUID id;
    private String accessCode;
}
