import Suite from "intern/lib/Suite";
import Test from "intern/lib/Test";
import { hostname, type, userInfo, arch, platform } from "os";
import { writeFile } from "fs";

function nUnitTime(time): string {
  return time.toISOString().split(".")[0].replace("T", " ") + "Z"
};

class TestRun {
  id: string // The unique ID of this test. For the test-run, it is hard-coded as "2".
  testcasecount: number; // The number of test cases contained in this test run.
  result: string; // The basic result of the test. May be Passed, Failed, Inconclusive or Skipped.
  total: number; // The total number of test cases executed in the run. This may be less than the testcasecont due to filtering of tests.
  passed: number; // The number of test cases that passed.
  failed: number; // The number of test cases that failed.
  inconclusive: number; // The number of test cases that were inconclusive.
  skipped: number; // The number of test cases that were skipped.
  asserts: number; // The number of asserts executed in the test run.
  "engine-version": string; // The version of the NUnit test engine in use.
  "clr-version": string; // The runtime version under which the engine is running, taken from Environment.Version.
  "start-time": string; // The UTC time that the test run started.
  "end-time": string; // The UTC time that the test run ended.
  duration: number; // The duration of the test run in seconds, expressed as a real number.
  suites: Suite[];

  props() {
    return [
      "id",
      "testcasecount",
      "result",
      "total",
      "passed",
      "failed",
      "inconclusive",
      "skipped",
      "asserts",
      "engine-version",
      "clr-version",
      "start-time",
      "end-time",
      "duration"
    ];
  };

  constructor() {
    // "2" is a hard-coded value by convention.
    this.id = "2";
    this.testcasecount = 0;
    this.result = "Passed";
    this.total = 0;
    this.passed = 0;
    this.failed = 0;
    this.inconclusive = 0;
    this.skipped = 0;
    this.asserts = 0;

    // Version of NUnit this is being based off
    this["engine-version"] = "3.6.1.0";

    // Represents the version of Intern being used.
    this["clr-version"] = "4.X";

    this["start-time"] = nUnitTime(new Date());
    this["end-time"] = nUnitTime(new Date());
    this.duration = 0;
    this.suites = [];
  };

  toString(): string {
    const COMMANDLINE = "<command-line><![CDATA[npx intern]]></command-line>";

    // Builds a string like <test-run prop1=val1 prop2=val2>inner</test-run>
    let outer = "<test-run ";
    outer += this.props().map((propertyName) => {
      return `${propertyName}="${this[propertyName]}"`;
    }).join(" ");
    outer += ">";

    outer += COMMANDLINE;

    outer += this.suites.map((suite) => {
      return suite.toString();
    }).join("");

    outer += "</test-run>";
    return outer;
  };
};

class Settings {
  toString(): string {
    let outer = "<settings>";
    outer += "</settings>";
    return outer;
  }
}

class TestCase {
  id: string; // The unique id of this test. Coded as "mmm-nnn" where the part before the hyphen represents the assembly and the part after it represents a test in that assembly. Currently, mmm and nnn are ints, but that is merely an accident of the implementation and should not be relied on.
  name: string; // The display name of the test as generated by NUnit or, in the case of some parameterized tests, specified by the user.
  fullname: string; // The full name of the test as generated by NUnit.
  methodname: string; // The name of the method representing the test case.
  classname: string; // The full name of the class in which this test case appears.
  runstate: string; //  An indicator of whether the suite is runnable. Value may be NotRunnable, Runnable, Explicit, Skipped or Ignored. NotRunnable means there is an error in how the test is expressed in code, for example, the signature may be wrong. Explicit, Skipped and Ignored are set by attributes on the test.
  seed: string; // The seed used to generate random arguments and other values for this test.
  result: string; //  The basic result of the test. May be Passed, Failed, Inconclusive or Skipped.
  label: string; // Additional labeling information about the result. In principle, this may be any string value and is combined with the result to give a more precise reason for failure. Currently, NUnit may use the following labels in combination with the Failure result: Error, Cancelled or Invalid. It may use the following labels in combination with a Skipped result: Ignored or Explicit. Additional values may be added in future releases or supplied by extensions, so code that processes a result file should be prepared to deal with any label or none at all.
  site: string; //  Optional element indicating where a failure occurred. Values are Test, SetUp, TearDown, Parent or Child. Default is Test and the attribute does not normally appear in that case.
  "start-time": string; // The UTC time that the test started.
  "end-time": string; //  The UTC time that the test ended.
  duration: number; // The duration of the test in seconds, expressed as a real number.
  asserts: number; // The number of asserts executed by the test.

  constructor(testCase: Test) {
    let time = new Date();
    const endTime = nUnitTime(time);
    time.setMilliseconds(time.getMilliseconds() - testCase.timeElapsed || 0);
    const startTime = nUnitTime(time);

    this.id = "0-0";
    this.name = testCase.name;
    this.fullname = testCase.name; /* redundant */
    this.classname = "unspecified";
    this.runstate = "unspecified";
    this.seed = "null";
    this.result = `${testCase.error ? "Failed" : "Passed"}`;
    this.label = `${testCase.error ? testCase.error : "unspecified" }`;
    this.site = "Test";
    this["start-time"] = startTime;;
    this["end-time"] = endTime;
    // Traditionally duration is reported in seconds
    this.duration = (testCase.timeElapsed || 0) / 1000; 
    this.asserts = 1;
  };

  properties() {
    return [
      "id",
      "name",
      "fullname",
      "methodname",
      "classname",
      "runstate",
      "seed",
      "result",
      "label",
      "site",
      "start-time",
      "end-time",
      "duration",
      "asserts"
    ];
  };

  toString(): string {
    // Builds a string like <test-case prop1=val1 prop2=val2/>
    let outer = "<test-case ";
    outer += this.properties().map((propertyName) => {
      return `${propertyName}="${this[propertyName]}"`;
    }).join(" ");
    outer += "/>";

    return outer;
  };
}

class Environment {
  "framework-version": string; // The version of the nunit framework in use.
  "clr-version": string; // The runtime version under which the tests are running, taken from Environment.Version.
  "os-version": string; //A text string describing the operating system running the tests, taken from Environment.OsVersion.
  platform: string; // The platform id, taken from Environment.OsVersion.Platform.
  cwd: string; // The current working directory path, taken from Environment.CurrentDirectory.
  "machine-name": string; // The machine name, taken from Environment.MachineName.
  user: string; // The user id, taken from Environment.UserName.
  "user-domain": string; // The user domain, taken from Environment.UserDomainName.
  culture: string; // The current culture, taken from CultureInfo.CurrentCulture.
  uiculture: string; // The current UI culture, taken from CultureInfo.CurrentUICulture.
  "os-architecture": string; // The architecture, taken from GetProcessorArchitecture().

  constructor() {
    this["framework-version"] = "3.5.0.0";
    this["clr-version"] = "2.0.50727.8784";
    this["os-version"] = "Microsoft Windows NT 10.0.15063.0";
    this.platform = "Win32NT";
    this.cwd = process.cwd();
    this["machine-name"] = hostname();
    this.user = userInfo().username;
    this["user-domain"] = this.user;
    this.culture = "en-GB";
    this.uiculture = "en-US";
    this["os-architecture"] = arch();
  };

  props(): string[] {
    return [
      "framework-version",
      "clr-version",
      "cwd",
      "machine-name",
      "user",
      "user-domain",
      "culture",
      "uiculture",
      "os-architecture"
    ];
  }

  toString(): string {
    // Builds a string like <environment prop1=val1 prop2=val2/>
    let outer = "<environment ";
    outer += this.props().map((propertyName) => {
      if (this[propertyName]) {
        return `${propertyName}="${this[propertyName]}"`;
      } else {
        return "";
      }
    }).join(" ");

    outer += "/>";

    return outer;

  };
};

class TestSuite {
  type: string; // The type of suite represented by this element. Currently supported types are Assembly, TestSuite, TestFixture,
  id: string; // The unique id of this test. Coded as "mmm-nnn" where the part before the hyphen represents the assembly and the part after it represents a test in that assembly. Currently, mmm and nnn are ints, but that is merely an accident of the implementation and should not be relied on.
  name: string; // The display name of the test as generated by NUnit.
  fullname: string; //  The full name of the test as generated by NUnit.
  classname: string; //  The full name of the class (fixture) representing this test. Only present if type is equal to "TestFixture".
  testcasecount: number; //  The number of test cases contained, directly or indirectly, in this suite.
  runstate: string; //  An indicator of whether the suite is runnable. Value may be NotRunnable, Runnable, Explicit, Skipped or Ignored. NotRunnable means there is an error in how the test is expressed in code, for example, the signature may be wrong. Explicit, Skipped and Ignored are set by attributes on the test.
  result: string; //  The basic result of the test. May be Passed, Failed, Inconclusive or Skipped.
  label: string; // Additional labeling information about the result. In principle, this may be any string value and is combined with the result to give a more precise reason for failure. Currently, NUnit may use the following labels in combination with the Failure result: Error, Cancelled or Invalid. It may use the following labels in combination with a Skipped result: Ignored or Explicit. Additional values may be added in future releases or supplied by extensions, so code that processes a result file should be prepared to deal with any label or none at all.
  site?: string; // Optional element indicating where a failure occurred. Values are Test, SetUp, TearDown, Parent or Child. Default is Test and the attribute does not normally appear in that case.
  "start-time": string; //  The UTC time that the suite started.
  "end-time": string; // The UTC time that the suite ended.
  duration: number; // The duration of the suite in seconds, expressed as a real number.
  total: number; //  The total number of test cases executed under this suite.
  passed: number; //  The number of test cases that passed.
  failed: number; // The number of test cases that failed.
  inconclusive: number; // The number of test cases that were inconclusive.
  skipped: number; //  The number of test cases that were skipped.
  asserts: number; //  The number of asserts executed by the suite, including any nested suites or test cases. Since asserts may be executed in OneTimeSetUp and in ActionAttributes, this number can be greater than the total of the asserts for the test cases.
  testCases: any;
  "test-suites": (TestCase | TestSuite)[];
  "test-cases": (TestCase | TestSuite)[];
  environment: Environment;
  settings: Settings;
  properties?: any;
  reason ?: any;
  failure?: any;
  output?: any;
  attachments?: any;

  constructor(suite: Suite) {
    let time = new Date();
    const endTime = nUnitTime(time);
    time.setMilliseconds(time.getMilliseconds() - suite.timeElapsed);
    const startTime = nUnitTime(time);

    // For whatever reason using "TestSuite" results in this not being able to be reported in VSTS. 
    this.type = "Assembly";
    this.id = suite.id;
    this.name = suite.name;
    this.fullname = suite.name; /* Redundant */
    this.classname = suite.name; /* Redundant */
    this.testcasecount = suite.numTests;
    this.runstate = `${suite.skipped ? "Skipped" : "Runnable"}`;
    this.result= `${suite.numFailedTests == 0 ? "Passed" : "Failed"}`;
    this.label = "unspecified";
    this.site = "unspecified";
    this["start-time"] = startTime;
    this["end-time"] = endTime;
    
    // Traditionally duration is reported in seconds 
    this.duration = (suite.timeElapsed || 0) / 1000; 
    this.total = suite.numTests;
    this.passed = suite.numPassedTests;
    this.failed = suite.numFailedTests;
    this.inconclusive = suite.tests.length - this.failed - this.passed - this.skipped;
    this.skipped = suite.numSkippedTests;

    // TODO: This is not actually right. Right now there isn't anyway to distinguish 
    // between the amount of tests and the amount of assertions. A test can have multiple
    // assertions
    this.asserts = suite.numTests;

    // @ts-ignore
    if (suite.tests[0].constructor.name === "Suite") {
      this["test-suites"] = suite.tests.map((suite: Suite, index: number) => { 
        let newTestSuite = new TestSuite(suite)
        newTestSuite.id = `0-${index + 1}`;
        return newTestSuite;
      });

    // @ts-ignore
    } else if (suite.tests[0].constructor.name === "Test") {
      this["test-cases"] = suite.tests.map((testCase: Test, index: number) => { 
        let newTestCase = new TestCase(testCase)
        newTestCase.id = `0-${index + 1}`;
        return newTestCase;
      });
    }

    this.environment = new Environment();
    this.settings = new Settings();

    // Later, these items should contain various metadata that can later be 
    // included in VSTS or similar reporting system. 
    this.properties = null;
    this.reason = null;
    this.failure = null;
    this.output = null;
    this.attachments = null;
  };

  inners() {
    return [
      "test-cases",
      "test-suites",
      "environment",
      "settings"
      // TODO: Optional and currently not included.
      // "properties",
      // "reason",
      // "failure",
      // "output",
      // "attachments"
    ];
  };

  props() {
    return [
      "type",
      "id",
      "name",
      "fullname",
      "classname",
      "testcasecount",
      "runstate",
      "result",
      "label",
      "site",
      "start-time",
      "end-time",
      "duration",
      "total",
      "passed",
      "failed",
      "inconclusive",
      "skipped",
      "asserts"
    ];
  };

  toString(): string {

    // Builds a string like <test-suite prop1=val1 prop2=val2>inner</test-suite>
   let outer = "<test-suite ";
    outer += this.props().map((propertyName) => {
      if (this[propertyName]) {
        return `${propertyName}="${this[propertyName]}"`;
      } else {
        return "";
      }
    }).join(" ");
    outer += ">";

    let inner = "";
    inner += this.inners().map((propertyName) => {
      if (this[propertyName] && this[propertyName].length) {
        return this[propertyName].map((val) => {
          return val.toString();
        }).join("");

      } else if (this[propertyName]) {
        return this[propertyName].toString();
      } else {
        return;
      }
    }).join("");

    outer += inner;
    outer += "</test-suite>";
    return outer;
  };

};

const HEADER = `<?xml version="1.0" encoding="utf-8" standalone="no"?>`;

intern.on("runStart", () => {
  this.testRun = new TestRun();
  this.start = new Date().getMilliseconds();
});

intern.on("runEnd", () => {
  this.testRun["end-time"] = nUnitTime(new Date());
  this.testRun.duration = Math.abs(this.start - new Date().getMilliseconds());
  writeFile("nunit3.xml", HEADER + this.testRun.toString(), (error) => {
    if (error) {
      throw error;
    }

    console.log("nunit3.xml saved");
  })
});

intern.on("testEnd", test => {
  this.testRun.testcasecount += 1;
  this.testRun.total += 1; // TODO: Modify this to account for skipped runs.

  if (test.error) {
    this.testRun.result = "Failed";
    this.testRun.failed += 1;
  } else if (test.skipped) {
    this.testRun.skipped += 1;
  } else {
    this.testRun.passed += 1;
  }
});

intern.on("suiteEnd", suite => {
  if (suite.name == "node") {
    return;
  }
  this.testRun.suites.push(new TestSuite(suite));
});
