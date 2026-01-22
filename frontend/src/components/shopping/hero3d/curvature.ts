// src/components/shopping/hero3d/curvature.ts

export type CurvatureParams = {
    /**
     * NOW interpreted as: "maximum inward depth" (sagitta) in WORLD units
     * at x = ±maxBendWorldX after soft saturation.
     *
     * Example: curvature: 1.0 means edges go ~1 world unit deeper than center.
     */
    curvature: number;

    /**
     * Controls how quickly the edges stop bending (higher = less bend at sides).
     * This is the "effective half-width" of the bend region.
     */
    maxBendWorldX: number;
};

export function clamp(v: number, min: number, max: number) {
    return Math.max(min, Math.min(max, v));
}

export function softBendX(x: number, maxBendWorldX: number) {
    // Smoothly saturate so extreme sides don't over-bend
    return Math.tanh(x / maxBendWorldX) * maxBendWorldX;
}

/**
 * Concave "cylindrical arc" curvature.
 * Returns negative z for edges (pushed back), ~0 at center.
 *
 * We treat curvature as sagitta s at |x|=maxBendWorldX.
 * Solve cylinder radius R from sagitta formula:
 *   s = R - sqrt(R^2 - a^2)  where a = maxBendWorldX
 * => R = (a^2 + s^2) / (2s)
 */
export function curvedZFromX(x: number, params: CurvatureParams) {
    const a = Math.max(0.0001, params.maxBendWorldX);
    const s = Math.max(0.0001, params.curvature);

    const xs = softBendX(x, a);

    // Radius derived from sagitta
    const R = (a * a + s * s) / (2 * s);

    // z(x) = -(R - sqrt(R^2 - x^2))
    const under = Math.max(0, R * R - xs * xs);
    const z = -(R - Math.sqrt(under));

    return z;
}

/**
 * Optional helper: tangent-aligned yaw so tiles "hug" the curve properly.
 * For a cylinder: angle ~= asin(x/R)
 */
export function curvedYawFromX(x: number, params: CurvatureParams) {
    const a = Math.max(0.0001, params.maxBendWorldX);
    const s = Math.max(0.0001, params.curvature);
    const xs = softBendX(x, a);

    const R = (a * a + s * s) / (2 * s);

    // Keep safe
    const t = clamp(xs / R, -0.999, 0.999);

    // Negative so left side turns toward camera correctly
    return -Math.asin(t);
}
