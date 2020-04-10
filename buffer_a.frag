// = Falling Pixels =
// © 2020 Jacob Lindberg
//-----------------------
// Buffer A:
// - Determines which particle to receive from neighboring pixels.
// - All movement and most interaction rules are defined here.

const ivec2 A = ivec2(0, 1); // Above.
const ivec2 B = ivec2(0, -1); // Below.
const ivec2 L = ivec2(-1, 0); // Left.
const ivec2 R = ivec2(1, 0); // Right.
const ivec2 AL = A + L; // Above Left.
const ivec2 AR = A + R; // Above Right.
const ivec2 BL = B + L; // Below Left.
const ivec2 BR = B + R; // Below Right.

vec4 pixel(ivec2 pos) {
    if (pos.x < 0 || pos.y < 0 || pos.x >= int(iResolution.x) || pos.y >= int(iResolution.y)) {
        return vec4(0);
    }
    return texelFetch(iChannel0, pos, 0);
}

float noise(ivec2 pos) {
    // 2531 = ClosestPrime(TextureArea * GoldenRatio).
    int n = iFrame % 4096 * 2531;
    ivec2 noiseCoord = pos + ivec2(n, n / 64);
    return texelFetch(iChannel1, noiseCoord % 64, 0).r;
}

ivec2 bubble(ivec2 pos, vec4 self) {
    if (self.g > 0.5 || self.a > 0.5) {
        // Self is bedrock or lava, can't bubble.
        return pos;
    }
    if (iFrame % 2 == 0) {
        // Bubble at half speed.
        return pos;
    }
    if (self.b > 0.5) {
        // Self is water.
        vec4 above = pixel(pos + A);
        if (above.r < 0.5 || above.g > 0.5 || above.b > 0.5) {
            // No sand above, can't bubble.
            return pos;
        }
        if (pos.y > 0 && pixel(pos + B).r < 0.5) {
            // Might fall, don't bubble.
            return pos;
        }
        if (pixel(pos + L).r < 0.5 || pixel(pos + R).r < 0.5) {
            // Sand might roll, don't bubble.
            return pos;
        }
        // Bubble up.
        return pos + A;
    }
    // Self is sand.
    vec4 below = pixel(pos + B);
    if (below.b < 0.5 || below.a > 0.5) {
        // No water below, can't bubble.
        return pos;
    }
    if (pos.y > 0 && (pixel(pos + BL).r < 0.5 || pixel(pos + BR).r < 0.5)) {
        // Might roll, don't bubble.
        return pos;
    }
    if (pos.y > 1 && pixel(pos + B + B).r < 0.5) {
        // Water might fall, don't bubble.
        return pos;
    }
    // Bubble down.
    return pos + B;
}

float flowRight(ivec2 pos) {
    if (pixel(pos + L).b > 0.5 && (pos.y == 0 || pixel(pos + BL).r > 0.5)) {
        // Left flowing.
        if (pixel(pos + L + L).r > 0.5) {
            // Can't flow left, flow right.
            return noise(pos + L) + 1.0;
        }
        // Flow randomly.
        return noise(pos + L);
    }
    return 0.0;
}

float flowLeft(ivec2 pos) {
    if (pixel(pos + R).b > 0.5 && (pos.y == 0 || pixel(pos + BR).r > 0.5)) {
        // Right flowing.
        if (pixel(pos + R + R).r > 0.5) {
            // Can't flow right, flow left.
            return noise(pos + R) - 1.0;
        }
        // Flow randomly.
        return noise(pos + R);
    }
    return 1.0;
}

ivec2 flow(ivec2 pos) {
    float rightFlow = flowRight(pos);
    float leftFlow = flowLeft(pos);
    if (rightFlow > 0.5 && leftFlow < 0.5) {
        // Flow contested.
        if (leftFlow + rightFlow > 1.0) {
            // Left wins, flow right.
            return pos + L;
        }
        // Right wins, flow left.
        return pos + R;
    }
    if (rightFlow > 0.5) {
        // Flow right.
        return pos + L;
    }
    if (leftFlow < 0.5) {
        // Flow left.
        return pos + R;
    }
    return pos;
}

bool rollRight(ivec2 pos) {
    vec4 aboveLeft = pixel(pos + AL);
    if (aboveLeft.g > 0.5 || aboveLeft.b > 0.5) {
        // Above left is not sand, can't roll.
        return false;
    }
    if (pixel(pos + L).r > 0.5 && aboveLeft.r > 0.5) {
        // Above left rolling.
        if (pixel(pos + AL + L).r > 0.5 || pixel(pos + L + L).r > 0.5) {
            // Can't roll left, roll right.
            return true;
        }
        if (noise(pos + AL) > 0.5) {
            // Roll right.
            return true;
        }
    }
    return false;
}

bool rollLeft(ivec2 pos) {
    vec4 aboveRight = pixel(pos + AR);
    if (aboveRight.g > 0.5 || aboveRight.b > 0.5) {
        // Above right is not sand, can't roll.
        return false;
    }
    if (pixel(pos + R).r > 0.5 && aboveRight.r > 0.5) {
        // Above right rolling.
        if (pixel(pos + AR + R).r > 0.5 || pixel(pos + R + R).r > 0.5) {
            // Can't roll right, roll left.
            return true;
        }
        if (noise(pos + AR) < 0.5) {
            // Roll left.
            return true;
        }
    }
    return false;
}

ivec2 roll(ivec2 pos) {
    bool canRollRight = rollRight(pos);
    bool canRollLeft = rollLeft(pos);
    if (canRollRight && canRollLeft) {
        // Roll contested.
        if (noise(pos + AL) + noise(pos + AR) > 1.0) {
            // Left wins, roll right.
            return pos + AL;
        }
        // Right wins, roll left.
        return pos + AR;
    }
    if (canRollRight) {
        // Roll right.
        return pos + AL;
    }
    if (canRollLeft) {
        // Roll left.
        return pos + AR;
    }
    return pos;
}

ivec2 receive(ivec2 pos) {
    vec4 self = pixel(pos);
    if (self.r > 0.5) {
        // Self not empty.
        ivec2 bubblePos = bubble(pos, self);
        if (bubblePos != pos) {
            // Receive bubbling.
            return bubblePos;
        }
        // Block.
        return pos;
    }
    vec4 above = pixel(pos + A);
    if (above.r > 0.5 && above.g < 0.5) {
        if (pixel(pos + AL).r > 0.5 && pixel(pos + AR).r > 0.5) {
            // Self contested from roll, let above fall.
            return pos + A;
        }
        if (pixel(pos + L).b > 0.5 && pixel(pos + R).b > 0.5) {
            // Self contested from flow, let above fall.
            return pos + A;
        }
    }
    ivec2 rollPos = roll(pos);
    if (rollPos != pos) {
        // Receive rolling.
        return rollPos;
    }
    ivec2 flowPos = flow(pos);
    if (flowPos != pos) {
        // Receive flowing.
        return flowPos;
    }
    if (above.r > 0.5 && above.g < 0.5) {
        // Receive falling.
        return pos + A;
    }
    return pos;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    ivec2 pos = ivec2(fragCoord);
    ivec2 receivePos = receive(pos);
    ivec2 offset = receivePos - pos;
    fragColor = vec4(float(offset.x + 1) / 2.0, float(offset.y + 1) / 2.0, 0.0, 0.0);
}
