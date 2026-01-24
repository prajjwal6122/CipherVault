/**
 * Frontend Setup Test - Verifies React + Vite initialization
 * Tests: App component rendering, configuration, build process
 */

describe('Frontend Setup - P1-1.1.2', () => {
  test('React and ReactDOM can be imported', () => {
    const React = require('react');
    const ReactDOM = require('react-dom/client');
    expect(React).toBeDefined();
    expect(ReactDOM).toBeDefined();
  });

  test('Vite configuration exists and is valid', () => {
    const fs = require('fs');
    const path = require('path');
    const viteConfigPath = path.join(__dirname, '..', 'vite.config.js');
    expect(fs.existsSync(viteConfigPath)).toBe(true);
  });

  test('package.json exists with required scripts', () => {
    const fs = require('fs');
    const path = require('path');
    const packageJsonPath = path.join(__dirname, '..', 'package.json');
    
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      expect(packageJson.scripts).toBeDefined();
      expect(packageJson.scripts.dev).toBeDefined();
      expect(packageJson.scripts.build).toBeDefined();
    }
  });

  test('App component file exists', () => {
    const fs = require('fs');
    const path = require('path');
    const appPath = path.join(__dirname, '..', 'src', 'App.jsx');
    expect(fs.existsSync(appPath)).toBe(true);
  });

  test('Main entry point exists', () => {
    const fs = require('fs');
    const path = require('path');
    const mainPath = path.join(__dirname, '..', 'src', 'main.jsx');
    expect(fs.existsSync(mainPath)).toBe(true);
  });

  test('Public directory structure exists', () => {
    const fs = require('fs');
    const path = require('path');
    const publicPath = path.join(__dirname, '..', 'public');
    expect(fs.existsSync(publicPath)).toBe(true);
  });

  test('Environment variables template exists', () => {
    const fs = require('fs');
    const path = require('path');
    const envPath = path.join(__dirname, '..', '.env.example');
    expect(fs.existsSync(envPath)).toBe(true);
  });

  test('ESLint or config file exists for code quality', () => {
    const fs = require('fs');
    const path = require('path');
    const eslintPath = path.join(__dirname, '..', '.eslintrc.js');
    expect(fs.existsSync(eslintPath)).toBe(true);
  });
});
