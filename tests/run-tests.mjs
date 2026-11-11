// Runs every property suite. Usage: node tests/run-tests.mjs
// Exit code 0 = all properties hold, 1 = at least one counter-example.
import { suite as validateSuite } from "./properties-validate.mjs";
import { suite as simulationSuite } from "./properties-simulation.mjs";
import { suite as labsSuite } from "./properties-labs.mjs";
import { suite as chemistrySuite } from "./properties-chemistry.mjs";
import { suite as bridgeSuite } from "./properties-bridge.mjs";
import { suite as levelsSuite } from "./properties-levels.mjs";
import { suite as chemScenarios } from "./properties-chemistry-scenarios.mjs";
import { installDom } from "./dom-stub.mjs";

installDom();

const suites = [validateSuite, simulationSuite, labsSuite, chemistrySuite, chemScenarios, bridgeSuite, levelsSuite];

for (const suite of suites) await suite.settle();

let failed = 0;
for (const suite of suites) {
  console.log(suite.report());
  failed += suite.failed.length;
}

const total = suites.reduce((t, s) => t + s.results.length, 0);
console.log(`\n${total - failed}/${total} properties hold.`);
process.exit(failed === 0 ? 0 : 1);
