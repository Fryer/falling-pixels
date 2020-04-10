// = Falling Pixels =
// © 2020 Jacob Lindberg
//-----------------------
// Main/image buffer:
// - Performs shading of the state from Buffer B.

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    ivec2 pos = ivec2(fragCoord);
    vec4 pixel = texelFetch(iChannel0, pos, 0);
    if (pixel.r < 0.5) {
        // Empty.
        fragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }
    if (pixel.a > 0.5) {
        // Lava.
        vec2 noiseCoordA = fragCoord * vec2(0.2, 1.0) / 64.0;
        noiseCoordA.x += float(iFrame) * 0.001;
        vec2 noiseCoordB = fragCoord * vec2(0.2, 1.0) / 64.0;
        noiseCoordB -= vec2(float(iFrame) * 0.001, 0.5);
        float noiseA = texture(iChannel1, noiseCoordA).r;
        float noiseB = texture(iChannel1, noiseCoordB).r;
        float noise = noiseA * noiseB;
        fragColor = vec4(0.8, 0.4, 0.0, 1.0);
        fragColor += vec4(0.1, 0.4, 0.2, 0.0) * noise;
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
    if (pixel.g > 0.5) {
        // Bedrock.
        vec2 noiseCoord = fragCoord * vec2(0.25, 1.0) / 64.0;
        float noise = texture(iChannel1, noiseCoord).r;
        noise = 0.25 + noise * 0.1 + pixel.r * 0.2;
        fragColor = vec4(vec3(1) * noise, 1.0);
        return;
    }
    // Sand.
    fragColor = vec4(vec3(1.0, 0.8, 0.4) * pixel.r, 1.0);
}
