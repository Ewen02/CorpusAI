export interface ServiceStatus {
  status: string;
  latencyMs: number;
  error?: string;
  collections?: number;
  totalPoints?: number;
}

export interface HealthData {
  status: 'healthy' | 'degraded';
  uptime: number;
  timestamp: string;
  responseMs: number;
  services: {
    postgres: ServiceStatus;
    qdrant: ServiceStatus;
    redis: ServiceStatus;
    openai: ServiceStatus;
  };
  documentQueue: {
    failed: number;
    pending: number;
    processing: number;
  };
}

export interface TestSuite {
  name: string;
  status: 'passed' | 'failed' | 'error';
  tests: number;
  passed: number;
  failed: number;
  files: number;
  error?: string;
}

export interface TestStatus {
  status: 'all_passed' | 'some_failed';
  totalTests: number;
  totalPassed: number;
  totalFailed: number;
  suites: TestSuite[];
  timestamp: string;
}
