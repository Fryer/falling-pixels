void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    ivec2 pos = ivec2(fragCoord);
    vec4 pixel = texelFetch(iChannel0, pos, 0);
    if (pixel.r < 0.5) {
        // Empty.
        fragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }
    if (pixel.b > 0.5) {
        // Water.
        ivec2 noiseCoordA = pos + ivec2(iFrame * 23, 0);
        ivec2 noiseCoordB = pos + ivec2(0, iFrame * 14 + 1);
        float noiseA = texelFetch(iChannel1, noiseCoordA % 64, 0).r;
        float noiseB = texelFetch(iChannel1, noiseCoordB % 64, 0).r;
        float noise = noiseA * noiseB;
        fragColor = vec4(0.2, 0.6, 1.0, 1.0);
        if (noise > 0.9) {
            // Sparkle!
            fragColor += vec4(0.2, 0.2, 0.0, 0.0) * noise;
        }
        return;
    }
    // Sand.
    fragColor = vec4(pixel.rrr * vec3(1.0, 0.8, 0.4), 1.0);
}
