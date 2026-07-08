/**
 * Unit tests for tie-break logic.
 *
 * Rules: highest score wins → tie → shortest codeLength → tie → earliest submittedAt
 *
 * AGENTS.md requires: "Any change to scoring/ (similarity calculation, tie-break logic)
 * must include a test with at least one known input/output pair."
 */

// Self-contained test runner — no vitest dependency needed.
// Run with: npx tsx src/scoring/tiebreak.test.ts

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

function assertEqual<T>(actual: T, expected: T, message?: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      message ?? `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
}

function assertLessThan(a: number, b: number, message?: string) {
  if (a >= b) {
    throw new Error(message ?? `Expected ${a} < ${b}`);
  }
}

// ---------------------------------------------------------------------------
// 2. Import the module
// ---------------------------------------------------------------------------

// Use dynamic import for ESM compat
let compareEntries: any;
let rankEntries: any;
let findBestSubmission: any;

try {
  const mod = require('./tiebreak.js');
  compareEntries = mod.compareEntries;
  rankEntries = mod.rankEntries;
  findBestSubmission = mod.findBestSubmission;
} catch {
  // Fallback for when imported directly — requires the TS source
  // In practice, run with tsx or vitest
  const mod = require('./tiebreak.ts');
  compareEntries = mod.compareEntries;
  rankEntries = mod.rankEntries;
  findBestSubmission = mod.findBestSubmission;
}

// ---------------------------------------------------------------------------
// 3. Tests
// ---------------------------------------------------------------------------

test('higher score beats lower score', () => {
  const a = { score: 95, codeLength: 100, submittedAt: '2024-01-01T00:00:00Z' };
  const b = { score: 90, codeLength: 100, submittedAt: '2024-01-01T00:00:00Z' };
  assertLessThan(compareEntries(a, b), 0, 'higher score should rank first');
});

test('same score: shorter code beats longer code', () => {
  const a = { score: 95, codeLength: 50, submittedAt: '2024-01-01T00:00:00Z' };
  const b = { score: 95, codeLength: 100, submittedAt: '2024-01-01T00:00:00Z' };
  assertLessThan(compareEntries(a, b), 0, 'shorter code should rank first when scores equal');
});

test('same score + code: earlier submission beats later', () => {
  const a = { score: 95, codeLength: 50, submittedAt: '2024-01-01T00:00:00Z' };
  const b = { score: 95, codeLength: 50, submittedAt: '2024-01-02T00:00:00Z' };
  assertLessThan(compareEntries(a, b), 0, 'earlier submission should rank first when score and code equal');
});

test('rankEntries sorts correctly with mixed cases', () => {
  const entries = [
    { userId: 'u1', userName: 'Alice', score: 95, codeLength: 100, submittedAt: '2024-01-01T00:00:00Z', submissionId: 's1' },
    { userId: 'u2', userName: 'Bob', score: 95, codeLength: 50, submittedAt: '2024-01-01T00:00:00Z', submissionId: 's2' },
    { userId: 'u3', userName: 'Charlie', score: 97, codeLength: 80, submittedAt: '2024-01-01T00:00:00Z', submissionId: 's3' },
    { userId: 'u4', userName: 'Diana', score: 95, codeLength: 50, submittedAt: '2024-01-03T00:00:00Z', submissionId: 's4' },
    { userId: 'u5', userName: 'Eve', score: 92, codeLength: 60, submittedAt: '2024-01-01T00:00:00Z', submissionId: 's5' },
  ];

  const ranked = rankEntries(entries);

  // Expected order: Charlie (97) > Bob (95/50/Jan1) > Diana (95/50/Jan3) > Alice (95/100) > Eve (92)
  assertEqual(ranked[0].userId, 'u3', 'Charlie should be first (highest score)');
  assertEqual(ranked[1].userId, 'u2', 'Bob should be second (tied score, shortest code, earliest)');
  assertEqual(ranked[2].userId, 'u4', 'Diana should be third (tied score+code, later than Bob)');
  assertEqual(ranked[3].userId, 'u1', 'Alice should be fourth (tied score, longer code)');
  assertEqual(ranked[4].userId, 'u5', 'Eve should be fifth (lowest score)');
});

test('findBestSubmission returns null for empty array', () => {
  assertEqual(findBestSubmission([]), null);
});

test('findBestSubmission returns null when all scores are null', () => {
  const subs = [
    { id: 's1', score: null, codeLength: 100, submittedAt: '2024-01-01T00:00:00Z' },
    { id: 's2', score: null, codeLength: 50, submittedAt: '2024-01-02T00:00:00Z' },
  ];
  assertEqual(findBestSubmission(subs), null);
});

test('findBestSubmission returns highest-scoring submission', () => {
  const subs = [
    { id: 's1', score: 85, codeLength: 100, submittedAt: '2024-01-01T00:00:00Z' },
    { id: 's2', score: 95, codeLength: 150, submittedAt: '2024-01-02T00:00:00Z' },
    { id: 's3', score: 90, codeLength: 80, submittedAt: '2024-01-03T00:00:00Z' },
  ];
  assertEqual(findBestSubmission(subs), 's2', 's2 has the highest score');
});

test('findBestSubmission uses tie-break when scores equal', () => {
  const subs = [
    { id: 's1', score: 95, codeLength: 100, submittedAt: '2024-01-02T00:00:00Z' },
    { id: 's2', score: 95, codeLength: 50, submittedAt: '2024-01-01T00:00:00Z' },
    { id: 's3', score: 95, codeLength: 50, submittedAt: '2024-01-03T00:00:00Z' },
  ];
  // s2 has shortest code AND earliest submission
  assertEqual(findBestSubmission(subs), 's2', 's2 wins on tie-break (shortest code + earliest)');
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
