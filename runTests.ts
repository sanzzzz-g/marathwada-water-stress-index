import { runAllPlatformTests } from './src/__tests__/wsiPlatform.test';

async function main() {
  console.log('Running MARATHWADA WSI INTELLIGENCE Scientific Invariant & GitHub Retrieval Tests...');
  const { passed, failed, errors } = await runAllPlatformTests();
  console.log(`Results: ${passed} assertions passed, ${failed} failed.`);

  if (failed > 0) {
    console.error('FAILED TESTS:');
    errors.forEach(e => console.error(e));
    process.exit(1);
  } else {
    console.log('ALL INVARIANT & GITHUB FETCH TESTS PASSED SUCCESSFULLY! ✓');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Test runner encountered unexpected error:', err);
  process.exit(1);
});
