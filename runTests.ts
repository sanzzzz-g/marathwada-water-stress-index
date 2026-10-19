import { runAllPlatformTests } from './src/__tests__/wsiPlatform.test';

async function main() {
  console.log('======================================================================');
  console.log('MARATHWADA WSI INTELLIGENCE: TEST SUITE VERIFICATION');
  console.log('======================================================================');
  
  const { passed, failed, errors, unitPassed, integrationPassed } = await runAllPlatformTests();
  
  console.log('----------------------------------------------------------------------');
  console.log(`Test Execution Summary:`);
  console.log(`- Offline Unit & Mock Assertions:      ${unitPassed} passed`);
  console.log(`- Live GitHub Network Integration:     ${integrationPassed} passed`);
  console.log(`- Total Assertions Passed:             ${passed} / ${passed + failed}`);
  console.log('----------------------------------------------------------------------');

  if (failed > 0) {
    console.error('FAILED ASSERTIONS:');
    errors.forEach(e => console.error(`  ✖ ${e}`));
    process.exit(1);
  } else {
    console.log('ALL TESTS PASSED: Both unit invariants and live GitHub integration verified. ✓');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Test runner encountered unexpected error:', err);
  process.exit(1);
});
