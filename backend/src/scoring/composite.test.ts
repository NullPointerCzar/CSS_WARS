/**
 * Unit tests for composite submission scoring.
 *
 * AGENTS.md requires: "Any change to scoring/ (similarity calculation,
 * tie-break logic) must include a test with at least one known input/output
 * pair." The composite scorer is scoring logic, so it gets a known pair too.
 *
 * Run with: npx tsx src/scoring/composite.test.ts
 */

// ---------------------------------------------------------------------------
// 1. Inline test runner (no vitest dependency needed)
// ---------------------------------------------------------------------------

interface TestCase {
  name: string;
  fn: () => void;
}

const tests: TestCase[] = [];
let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  tests.push({ name, fn });
}

function assertEqual(actual: unknown, expected: unknown, message?: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      message ?? `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
}

function assertClose(actual: number, expected: number, eps = 0.01, message?: string) {
  if (Math.abs(actual - expected) > eps) {
    throw new Error(message ?? `Expected ~${expected}, got ${actual}`);
  }
}

// ---------------------------------------------------------------------------
// 2. Import the module (ESM-safe via dynamic import)
// ---------------------------------------------------------------------------

const mod = await import('./composite.js');
const computeCompositeScore = mod.computeCompositeScore;

// ---------------------------------------------------------------------------
// 3. Tests — known input/output pairs
// ---------------------------------------------------------------------------

test('perfect submission (par pixel + par bytes + par time) scores 100', () => {
  const r = computeCompositeScore({
    pixelScore: 100,
    codeLength: 600,
    solveTimeMs: 180_000,
  });
  assertEqual(r.pixelComponent, 100);
  assertEqual(r.byteComponent, 100);
  assertEqual(r.timeComponent, 100);
  assertEqual(r.score, 100);
});

test('known blend: pixel 80, 2x par bytes, 2x par time → 72.5', () => {
  // pixel  = 80   (weight 0.75) → 60
  // bytes  = 600/1200*100 = 50 (weight 0.15) → 7.5
  // time   = 180000/360000*100 = 50 (weight 0.10) → 5
  // total  = 72.5
  const r = computeCompositeScore({
    pixelScore: 80,
    codeLength: 1200,
    solveTimeMs: 360_000,
  });
  assertClose(r.byteComponent, 50);
  assertClose(r.timeComponent, 50);
  assertClose(r.score, 72.5);
});

test('weighting: identical components still respect weights', () => {
  const r = computeCompositeScore({
    pixelScore: 100,
    codeLength: 1200, // byte component = 50
    solveTimeMs: 180_000, // time component = 100
  });
  assertClose(r.score, 0.75 * 100 + 0.15 * 50 + 0.1 * 100);
});

test('pixel score is clamped to [0,100]', () => {
  const over = computeCompositeScore({ pixelScore: 140, codeLength: 600, solveTimeMs: 180_000 });
  assertEqual(over.pixelComponent, 100);
  const under = computeCompositeScore({ pixelScore: -20, codeLength: 600, solveTimeMs: 180_000 });
  assertEqual(under.pixelComponent, 0);
});

test('beating par (smaller code / faster time) yields full marks', () => {
  const r = computeCompositeScore({
    pixelScore: 90,
    codeLength: 300, // below par 600 → 100
    solveTimeMs: 60_000, // below par 180000 → 100
  });
  assertEqual(r.byteComponent, 100);
  assertEqual(r.timeComponent, 100);
  assertClose(r.score, 0.75 * 90 + 0.15 * 100 + 0.1 * 100);
});

// ---------------------------------------------------------------------------
// 4. Run
// ---------------------------------------------------------------------------

const failures: { name: string; error: any }[] = [];

for (const t of tests) {
  try {
    t.fn();
    passed++;
    console.log(`  ✓ ${t.name}`);
  } catch (err) {
    failed++;
    failures.push({ name: t.name, error: err });
    console.log(`  ✗ ${t.name}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.log('\nFailures:');
  for (const f of failures) {
    console.log(`  - ${f.name}: ${f.error instanceof Error ? f.error.message : String(f.error)}`);
  }
  process.exit(1);
}
