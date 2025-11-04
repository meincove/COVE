"use client";
import { forwardRef, useMemo } from "react";
import { NoiseEffect, BlendFunction } from "postprocessing";

type Props = {
  /** Subtle film grain feel; 0.04–0.08 is a good range */
  opacity?: number;
  /** Keep true for nicer blending */
  premultiply?: boolean;
  /** Try SOFT_LIGHT or OVERLAY */
  blendFunction?: BlendFunction;
};

export const NoisePrimitive = forwardRef<any, Props>(function NoisePrimitive(
  { opacity = 0.06, premultiply = true, blendFunction = BlendFunction.SOFT_LIGHT },
  ref
) {
  const effect = useMemo(() => {
    const e = new NoiseEffect({ premultiply, blendFunction });
    // control opacity via blendMode (NoiseEffect doesn’t have a direct opacity prop)
    e.blendMode.opacity.value = opacity;
    return e;
  }, [opacity, premultiply, blendFunction]);

  return <primitive ref={ref} object={effect} dispose={null} />;
});
