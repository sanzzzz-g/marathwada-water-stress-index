import { runAllPlatformTests } from './src/__tests__/wsiPlatform.test';

console.log('Running MARATHWADA WSI INTELLIGENCE Scientific Invariant Tests...');
const { passed, failed, errors } = runAllPlatformTests();
console.log(`Results: ${passed} assertions passed, ${failed} failed.`);

if (failed > 0) {
  console.error('FAILED TESTS:');
  errors.forEach(e => console.error(e));
  process.exit(1);
} else {
  console.log('ALL INVARIANT TESTS PASSED SUCCESSFULLY! ✓');
  process.exit(0);
}
