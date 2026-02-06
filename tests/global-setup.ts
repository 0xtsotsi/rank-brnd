import { FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Global test setup
 *
 * Runs once before all tests
 */

async function globalSetup(config: FullConfig) {
  // Ensure test directories exist
  const testDirs = [
    'test-results',
    'test-results/screenshots',
    'test-results/videos',
    'test-results/traces',
  ];

  for (const dir of testDirs) {
    const fullPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  }

  // Clean up old test results (keep last 5 runs)
  const testResultsDir = path.join(process.cwd(), 'test-results');
  if (fs.existsSync(testResultsDir)) {
    const files = fs.readdirSync(testResultsDir);
    const oldFiles = files
      .filter((f) => f.endsWith('.json') || f.endsWith('.txt'))
      .sort((a, b) => {
        const statA = fs.statSync(path.join(testResultsDir, a));
        const statB = fs.statSync(path.join(testResultsDir, b));
        return statA.mtimeMs - statB.mtimeMs;
      });

    // Remove all but the 5 most recent
    for (const oldFile of oldFiles.slice(0, -5)) {
      try {
        fs.unlinkSync(path.join(testResultsDir, oldFile));
      } catch (e) {
        // Ignore errors
      }
    }
  }

  // Check for required environment variables
  const requiredEnvVars = [
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
  ];

  const missingEnvVars = requiredEnvVars.filter(
    (varName) => !process.env[varName]
  );

  if (missingEnvVars.length > 0) {
    console.warn(
      `Warning: Missing environment variables: ${missingEnvVars.join(', ')}`
    );
    console.warn(
      'Some tests may fail. Create a .env file with the required variables.'
    );
  }

  console.log('Test setup completed successfully');
}

export default globalSetup;
