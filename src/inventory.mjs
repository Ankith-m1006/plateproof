// The plate inventory: the single source of truth that both the generator and the auditor are held to.
export const INVENTORY_SCHEMA = {
  name: "plate_inventory",
  schema: {
    type: "object", additionalProperties: false,
    properties: {
      dish: { type: "string" },
      container: { type: "string", description: "plate/bowl/banana leaf/box, with colour" },
      components: {
        type: "array",
        items: {
          type: "object", additionalProperties: false,
          properties: {
            name: { type: "string" },
            sam_prompt: { type: "string", description: "simple visual noun phrase a segmentation model can find, e.g. 'small steel bowl', 'fried snack', 'chicken piece'" },
            count: { type: "integer", description: "0 = uncountable (gravy, rice)" },
            colour: { type: "string" },
            position: { type: "string" }
          },
          required: ["name", "sam_prompt", "count", "colour", "position"]
        }
      },
      not_present: { type: "array", items: { type: "string" }, description: "things a model might add that are NOT on this plate" }
    },
    required: ["dish", "container", "components", "not_present"]
  }
};

/** Deterministic diff of two inventories: what was invented, what vanished, what changed count. */
export function diffInventories(real, candidate) {
  const norm = (s) => s.toLowerCase().replace(/[^a-z ]/g, "").trim();
  const realMap = new Map(real.components.map((c) => [norm(c.name), c]));
  const candMap = new Map(candidate.components.map((c) => [norm(c.name), c]));
  const invented = [...candMap.keys()].filter((k) => !realMap.has(k));
  const missing = [...realMap.keys()].filter((k) => !candMap.has(k));
  const countMismatch = [...realMap.keys()].filter((k) => candMap.has(k) && realMap.get(k).count > 0 && candMap.get(k).count > 0 && realMap.get(k).count !== candMap.get(k).count)
    .map((k) => ({ name: k, real: realMap.get(k).count, candidate: candMap.get(k).count }));
  const containerOk = norm(real.container) === norm(candidate.container);
  const pass = invented.length === 0 && missing.length === 0 && countMismatch.length === 0 && containerOk;
  return { pass, invented, missing, countMismatch, containerOk };
}
