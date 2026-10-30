import { test } from "node:test";
import assert from "node:assert/strict";
import { diffInventories } from "../src/inventory.mjs";

const real = { dish: "chicken biryani", container: "white plate", not_present: ["naan"], components: [
  { name: "chicken piece", count: 4, colour: "brown", position: "centre" },
  { name: "raita bowl", count: 1, colour: "white", position: "top right" },
  { name: "lemon wedge", count: 2, colour: "yellow", position: "left" },
  { name: "rice", count: 0, colour: "orange-white", position: "everywhere" } ] };

test("identical inventories pass", () => {
  assert.equal(diffInventories(real, real).pass, true);
});

test("invented naan and 6 chicken pieces fail with specific reasons", () => {
  const cand = { ...real, components: [...real.components.map((c) => c.name === "chicken piece" ? { ...c, count: 6 } : c), { name: "Naan", count: 1, colour: "beige", position: "side" }] };
  const d = diffInventories(real, cand);
  assert.equal(d.pass, false);
  assert.deepEqual(d.invented, ["naan"]);
  assert.deepEqual(d.countMismatch, [{ name: "chicken piece", real: 4, candidate: 6 }]);
});

test("missing raita fails; uncountable rice never count-mismatches", () => {
  const cand = { ...real, components: real.components.filter((c) => c.name !== "raita bowl").map((c) => c.name === "rice" ? { ...c, count: 3 } : c) };
  const d = diffInventories(real, cand);
  assert.deepEqual(d.missing, ["raita bowl"]);
  assert.deepEqual(d.countMismatch, []);
});
