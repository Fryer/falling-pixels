const ivec2 A = ivec2(0, 1); // Above.
const ivec2 B = ivec2(0, -1); // Below.
const ivec2 L = ivec2(-1, 0); // Left.
const ivec2 R = ivec2(1, 0); // Right.
const ivec2 BL = B + L; // Below Left.
const ivec2 BR = B + R; // Below Right.

vec4 pixel(ivec2 pos) {
    if (pos.x < 0 || pos.y < 0 || pos.x >= int(iResolution.x) || pos.y >= int(iResolution.y)) {
        return vec4(0);
    }
    return texelFetch(iChannel0, pos, 0);
}

float noise(ivec2 pos) {
    ivec2 noiseCoord = pos + ivec2(iFrame * 23, iFrame * 7);
    return texelFetch(iChannel1, noiseCoord % 64, 0).r;
}

ivec2 receive(ivec2 pos) {
    if (pos.y < 0 || pos.y >= int(iResolution.y)) {
        // Stop at bottom and top.
        return pos;
    }
    if (pos.x < 0) {
        // Remove at left.
        return pos + R;
    }
    if (pos.x >= int(iResolution.x)) {
        // Remove at right.
        return pos + L;
    }
    vec4 offsetColor = texelFetch(iChannel3, pos, 0);
    ivec2 offset = ivec2(int(offsetColor.r * 2.0 + 0.5) - 1, int(offsetColor.g * 2.0 + 0.5) - 1);
    return pos + offset;
}

vec4 move(ivec2 pos, vec4 self) {
    if (receive(pos + B) == pos) { return vec4(0); }
    if (receive(pos + BL) == pos) { return vec4(0); }
    if (receive(pos + BR) == pos) { return vec4(0); }
    if (receive(pos + L) == pos) { return vec4(0); }
    if (receive(pos + R) == pos) { return vec4(0); }
    if (receive(pos + A) == pos) { return vec4(0); }
    return self;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    ivec2 pos = ivec2(fragCoord);
    if (iMouse.z > 0.5 && distance(iMouse.xy, fragCoord) < 20.0) {
        // Mouse pressed.
        float value = noise(pos);
        bool water = texelFetch(iChannel2, ivec2(87, 0), 0).r > 0.0;
        if (water) {
            // W pressed, add water.
            value = float(value > 0.5);
            fragColor = vec4(value, 0.0, 1.0, 0.0);
            return;
        }
        bool bedrock = texelFetch(iChannel2, ivec2(66, 0), 0).r > 0.0;
        if (bedrock) {
            // B pressed, add bedrock.
            value = 0.75 + value * 0.25;
            fragColor = vec4(max(0.75, value), 1.0, 0.0, 0.0);
            return;
        }
        // No key, add sand.
        value = float(value > 0.5) * (0.5 + 0.5 * value);
       	fragColor = vec4(value, 0.0, 0.0, 0.0);
        return;
    }
    ivec2 receivePos = receive(pos);
    if (receivePos != pos) {
        // Receive.
        fragColor = pixel(receivePos);
        return;
    }
    vec4 self = pixel(pos);
    if (self.r > 0.5) {
        // Move.
        fragColor = move(ivec2(fragCoord), pixel(pos));
    }
}
