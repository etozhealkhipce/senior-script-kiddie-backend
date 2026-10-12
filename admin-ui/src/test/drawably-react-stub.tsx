// Test double for "drawably/react": same DOM structure as the real wrappers
// (wrapper <span> around inputs, className on the wrapper), no SVG sketching.
import type { ComponentProps, ReactElement } from "react";

interface Sketch {
  seed?: number;
  roughness?: number;
  boil?: number;
  stroke?: string;
  fill?: string;
  paper?: string;
  width?: number;
}

function omitSketch<T extends Sketch>(props: T): Omit<T, keyof Sketch> {
  const {
    seed: _seed,
    roughness: _roughness,
    boil: _boil,
    stroke: _stroke,
    fill: _fill,
    paper: _paper,
    width: _width,
    ...rest
  } = props;
  return rest;
}

function sketchData(kind: string, { boil, stroke }: Sketch) {
  return {
    "data-drawably": kind,
    "data-boil": boil === undefined ? undefined : String(boil),
    "data-stroke": stroke,
  };
}

type ButtonProps = ComponentProps<"button"> &
  Sketch & { variant?: string; state?: string; tone?: string };

export function DrawablyButton({ variant, state, tone, ...props }: ButtonProps): ReactElement {
  return (
    <button
      type="button"
      {...omitSketch(props)}
      {...sketchData("button", props)}
      data-variant={variant}
      data-state={state}
      data-tone={tone}
    />
  );
}

export function DrawablyInput({ className, ...props }: ComponentProps<"input"> & Sketch) {
  return (
    <span className={className} {...sketchData("input", props)}>
      <input {...omitSketch(props)} />
    </span>
  );
}

export function DrawablyTextarea({ className, ...props }: ComponentProps<"textarea"> & Sketch) {
  return (
    <span className={className} {...sketchData("textarea", props)}>
      <textarea {...omitSketch(props)} />
    </span>
  );
}
