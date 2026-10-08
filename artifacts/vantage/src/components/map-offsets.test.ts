import { describe, expect, it, vi } from "vitest";

// The component module imports Leaflet's stylesheet and touches the DOM on load.
vi.mock("leaflet", () => ({}));
vi.mock("leaflet/dist/leaflet.css", () => ({}));

import { overlapOffsets } from "./InteractiveConflictMap";

describe("overlapOffsets", () => {
	it("leaves markers in distinct places where they are", () => {
		expect(overlapOffsets([31.5, 34.47], [[15.5, 32.56], [21.49, 39.19]])).toEqual([[0, 0], [0, 0]]);
	});

	it("moves every event that shares the primary pin's place to its own spot", () => {
		const hub: [number, number] = [31.5, 34.47];
		const offsets = overlapOffsets(hub, [hub, hub, hub]);
		expect(offsets.every(([dx, dy]) => dx !== 0 || dy !== 0)).toBe(true);
		expect(new Set(offsets.map((o) => o.join(","))).size).toBe(3);
	});

	it("keeps the first of several events at one place and moves the rest", () => {
		const offsets = overlapOffsets(null, [[15.5, 32.56], [15.5, 32.56]]);
		expect(offsets[0]).toEqual([0, 0]);
		expect(offsets[1]).not.toEqual([0, 0]);
	});
});
