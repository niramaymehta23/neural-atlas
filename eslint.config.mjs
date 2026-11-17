import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";
import boundaries from "eslint-plugin-boundaries";

// Layer table from docs/architecture.md ("Dependency direction"). Each layer may import itself.
const LAYERS = [
  "engine",
  "design",
  "ui",
  "visuals",
  "scene3d",
  "data",
  "platform",
  "features",
  "catalog",
  "constellation",
  "experiences",
  "app",
];
const BELOW_FEATURES = ["design", "ui", "visuals", "scene3d", "data", "engine", "platform"];
const MAY_IMPORT = {
  ui: ["design"],
  visuals: ["design"],
  scene3d: ["design"],
  data: ["design", "ui", "engine"],
  platform: ["design", "ui", "visuals", "scene3d", "data", "engine"],
  features: BELOW_FEATURES,
  module: ["features", ...BELOW_FEATURES],
  constellation: ["catalog", "features", ...BELOW_FEATURES],
  experiences: ["catalog", "features", ...BELOW_FEATURES],
  app: [...LAYERS, "module"],
};

const to = (types, dependency) => ({
  to: { element: { types } },
  ...(dependency && { dependency }),
});

const layerPolicies = [
  ...LAYERS.map((type) => ({ from: { element: { type } }, allow: to([type]) })),
  ...Object.entries(MAY_IMPORT).map(([type, types]) => ({
    from: { element: { type } },
    allow: to(types),
  })),
  // visuals and scene3d see engine types only; catalog sees platform types only.
  { from: { element: { types: ["visuals", "scene3d"] } }, allow: to(["engine"], { kind: "type" }) },
  { from: { element: { type: "catalog" } }, allow: to(["platform"], { kind: "type" }) },
  // catalog lazy-loads modules; a module never imports another module.
  {
    from: { element: { type: "catalog" } },
    allow: to(["module"], { nodeKind: "dynamic-import" }),
  },
  {
    from: { element: { type: "module" } },
    allow: {
      to: {
        element: {
          type: "module",
          captured: { world: "{{ from.captured.world }}", module: "{{ from.captured.module }}" },
        },
      },
    },
  },
];

// Colours, fonts and easings are owned by src/design (REQ-FND-02).
const COLOUR =
  "(^|[^\\w&])#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\\b|\\b(rgba?|hsla?|oklch|oklab|hwb|lab|lch)\\(";
const EASING =
  "cubic-bezier\\(|\\bease-(in|out|in-out|linear)\\b|^(linear|easeIn|easeOut|easeInOut|anticipate|backIn|backOut|backInOut|circIn|circOut|circInOut)$";
const FONT = "font-family|\\bfont-\\[";
const TAILWIND_ARBITRARY_COLOUR =
  "\\b(bg|text|border|fill|stroke|ring|outline|decoration|caret|accent|from|via|to|shadow)-\\[(?!var\\(|-?[\\d.])";
const COLOUR_KEYS = "/^(color|background|backgroundColor|borderColor|fill|stroke|outlineColor)$/";
const SPRING_KEYS = "/^(ease|stiffness|damping|mass|bounce|visualDuration)$/";
const owned = (pattern, what) => [
  { selector: `Literal[value=/${pattern}/]`, message: `${what} live only in src/design.` },
  {
    selector: `TemplateElement[value.raw=/${pattern}/]`,
    message: `${what} live only in src/design.`,
  },
];
const designBans = [
  ...owned(COLOUR, "Colours"),
  ...owned(EASING, "Easing curves"),
  ...owned(FONT, "Fonts"),
  // Named CSS colours ("crimson") and Tailwind arbitrary colours ("text-[crimson]").
  {
    selector: `:matches(Property[key.name=${COLOUR_KEYS}], Property[key.value=${COLOUR_KEYS}], JSXAttribute[name.name=/^(fill|stroke|color)$/]) > Literal.value[value=/^(?!none$|currentColor$|transparent$|inherit$|var\\()[a-zA-Z]+$/]`,
    message: "Colours live only in src/design; use a token class or var(--…).",
  },
  ...owned(TAILWIND_ARBITRARY_COLOUR, "Colours"),
  {
    selector: `Property[key.name=${SPRING_KEYS}], Property[key.value=${SPRING_KEYS}]`,
    message: "Springs and easings live only in src/design/motion.ts.",
  },
  {
    selector: "Property[key.name='fontFamily'], JSXAttribute[name.name='fontFamily']",
    message: "Fonts live only in src/design/fonts.ts.",
  },
  // Plain clay is too light to read as text on ivory (A11Y-02); clay stays for fills.
  ...[
    "Literal[value=/\\btext-accent(?![-\\w])/]",
    "TemplateElement[value.raw=/\\btext-accent(?![-\\w])/]",
  ].map((selector) => ({
    selector,
    message: "Use text-accent-ink for clay text; text-accent fails contrast.",
  })),
];

const config = [
  {
    ignores: [
      ".next/**",
      "out/**",
      "node_modules/**",
      "next-env.d.ts",
      "playwright-report/**",
      "test-results/**",
      "public/models/**",
    ],
  },
  ...nextVitals,
  ...nextTs,
  {
    plugins: { boundaries },
    settings: {
      "import/resolver": { typescript: { alwaysTryTypes: true } },
      "boundaries/dependency-nodes": ["import", "export", "dynamic-import"],
      "boundaries/elements": [
        { type: "module", pattern: "src/modules/*/*", capture: ["world", "module"] },
        ...LAYERS.map((type) => ({ type, pattern: `src/${type}` })),
      ],
    },
    rules: {
      "boundaries/dependencies": [2, { default: "disallow", policies: layerPolicies }],
      // A folder outside the layer table cannot be used as a back door between layers.
      "boundaries/no-unknown-dependencies": 2,
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "import/no-default-export": "error",
      "no-restricted-syntax": ["error", ...designBans],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["next/font/*"], message: "Fonts live only in src/design/fonts.ts." },
          ],
        },
      ],
    },
  },
  {
    // Design owns these values; the lint config, its test and the browser tests must spell
    // colours out to check them.
    files: ["src/design/**", "eslint.config.mjs", "src/lint.test.ts", "e2e/**"],
    rules: { "no-restricted-syntax": "off", "no-restricted-imports": "off" },
  },
  {
    // Next.js and tool configs require default exports.
    files: [
      "src/app/**/{page,layout,not-found,error,loading,template,default}.tsx",
      "*.config.{ts,mjs}",
    ],
    rules: { "import/no-default-export": "off" },
  },
  {
    files: ["**/*.test.{ts,tsx}", "e2e/**"],
    rules: { "@typescript-eslint/no-non-null-assertion": "off" },
  },
  prettier,
];

export default config;
