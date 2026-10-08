const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT_DIR = path.resolve(__dirname, '..');
const ROADMAP_PATH = path.join(__dirname, 'enhancement-roadmap.json');
const LOG_PATH = path.join(ROOT_DIR, 'DAILY_ENHANCEMENT_LOG.md');

// Colors
const colors = {
    reset: '\x1b[0m',
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    dim: '\x1b[2m',
    bold: '\x1b[1m'
};

function log(msg, color = colors.reset) {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    console.log(`${colors.dim}[${timestamp}]${colors.reset} ${color}${msg}${colors.reset}`);
}

// 1. Run Unit Tests (vitest)
function runTests() {
    log('🧪 Running unit & integration test suite (vitest)...', colors.cyan);
    try {
        const output = execSync('npx vitest run', {
            cwd: ROOT_DIR,
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe'],
            timeout: 120000
        });
        const match = output.match(/Tests\s+(\d+)\s+passed/);
        const passedCount = match ? match[1] : 'all';
        log(`✅ All unit tests PASSED! (${passedCount} tests passing)`, colors.green);
        return { success: true, passedCount, output };
    } catch (err) {
        const errorOutput = (err.stdout || '') + '\n' + (err.stderr || '');
        log(`❌ Unit tests failed!`, colors.red);
        return { success: false, output: errorOutput };
    }
}

// 2. Check if OpenCode has configured credentials
function hasOpenCodeAuth() {
    try {
        const authPath = path.join(os.homedir(), '.local', 'share', 'opencode', 'auth.json');
        if (fs.existsSync(authPath)) {
            const authData = JSON.parse(fs.readFileSync(authPath, 'utf8'));
            return Object.keys(authData).length > 0;
        }
    } catch (e) {
        // ignore
    }
    return false;
}

// 3. Built-in Automated Enhancers for Roadmap Tasks
const BUILTIN_ENHANCERS = {
    'enhancement-001': () => {
        // Priority Calculator Utility & Unit Test
        const libPath = path.join(ROOT_DIR, 'src', 'lib', 'priority-calculator.ts');
        const testPath = path.join(ROOT_DIR, 'tests', 'unit', 'priority-calculator.test.ts');

        const libCode = `/**
 * Issue Priority & Urgency Score Calculator
 * Automatically computes numeric priority score based on severity, SLA window, and impact.
 */

export type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface PriorityScoreOptions {
    severity: SeverityLevel;
    impactUsers?: number;
    hoursRemainingOnSla?: number;
    hasCustomerBlocker?: boolean;
}

export function calculatePriorityScore(options: PriorityScoreOptions): number {
    let score = 0;

    // Severity weights (0-40)
    switch (options.severity) {
        case 'CRITICAL': score += 40; break;
        case 'HIGH': score += 30; break;
        case 'MEDIUM': score += 20; break;
        case 'LOW': score += 10; break;
    }

    // Impact weighting (0-30)
    if (options.impactUsers) {
        if (options.impactUsers > 1000) score += 30;
        else if (options.impactUsers > 100) score += 20;
        else if (options.impactUsers > 10) score += 10;
        else score += 5;
    }

    // SLA Urgency weighting (0-20)
    if (options.hoursRemainingOnSla !== undefined) {
        if (options.hoursRemainingOnSla <= 4) score += 20;
        else if (options.hoursRemainingOnSla <= 12) score += 15;
        else if (options.hoursRemainingOnSla <= 24) score += 10;
        else if (options.hoursRemainingOnSla <= 48) score += 5;
    }

    // Blocker multiplier (0-10)
    if (options.hasCustomerBlocker) {
        score += 10;
    }

    return Math.min(100, Math.max(0, score));
}

export function getPriorityTier(score: number): 'P0' | 'P1' | 'P2' | 'P3' {
    if (score >= 80) return 'P0';
    if (score >= 60) return 'P1';
    if (score >= 40) return 'P2';
    return 'P3';
}
`;

        const testCode = `import { describe, it, expect } from 'vitest';
import { calculatePriorityScore, getPriorityTier } from '@/lib/priority-calculator';

describe('Unit: Issue Priority Score Calculator', () => {
    it('should assign maximum priority score to critical customer blockers near SLA breach', () => {
        const score = calculatePriorityScore({
            severity: 'CRITICAL',
            impactUsers: 5000,
            hoursRemainingOnSla: 2,
            hasCustomerBlocker: true
        });

        expect(score).toBe(100);
        expect(getPriorityTier(score)).toBe('P0');
    });

    it('should assign P3 tier to low severity issues with ample time and low user impact', () => {
        const score = calculatePriorityScore({
            severity: 'LOW',
            impactUsers: 2,
            hoursRemainingOnSla: 72,
            hasCustomerBlocker: false
        });

        expect(score).toBeLessThan(40);
        expect(getPriorityTier(score)).toBe('P3');
    });

    it('should correctly elevate priority for high severity issues', () => {
        const score = calculatePriorityScore({
            severity: 'HIGH',
            impactUsers: 250,
            hoursRemainingOnSla: 10
        });

        expect(score).toBe(65);
        expect(getPriorityTier(score)).toBe('P1');
    });
});
`;

        fs.writeFileSync(libPath, libCode, 'utf8');
        fs.writeFileSync(testPath, testCode, 'utf8');
        return { modifiedFiles: ['src/lib/priority-calculator.ts', 'tests/unit/priority-calculator.test.ts'] };
    },

    'enhancement-002': () => {
        // Issue Export Formatter Utility & Unit Test
        const libPath = path.join(ROOT_DIR, 'src', 'lib', 'export-formatter.ts');
        const testPath = path.join(ROOT_DIR, 'tests', 'unit', 'export-formatter.test.ts');

        const libCode = `/**
 * Issue Data Export Formatter
 * Prepares issue data for clean JSON and CSV reporting.
 */

export interface ExportableIssue {
    key: string;
    title: string;
    status: string;
    priority: string;
    assigneeEmail?: string | null;
    createdAt: Date | string;
}

export function formatIssuesAsCsv(issues: ExportableIssue[]): string {
    const headers = ['Key', 'Title', 'Status', 'Priority', 'Assignee', 'Created Date'];
    const rows = issues.map(i => [
        i.key,
        \`"\${i.title.replace(/"/g, '""')}"\`,
        i.status,
        i.priority,
        i.assigneeEmail || 'Unassigned',
        new Date(i.createdAt).toISOString()
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\\n');
}

export function formatIssuesAsJson(issues: ExportableIssue[]): string {
    return JSON.stringify(issues, null, 2);
}
`;

        const testCode = `import { describe, it, expect } from 'vitest';
import { formatIssuesAsCsv, formatIssuesAsJson } from '@/lib/export-formatter';

describe('Unit: Issue Data Export Formatter', () => {
    const mockIssues = [
        {
            key: 'BUG-101',
            title: 'Fix "null pointer" in authentication flow',
            status: 'IN_PROGRESS',
            priority: 'HIGH',
            assigneeEmail: 'dev@company.com',
            createdAt: '2026-10-01T10:00:00Z'
        },
        {
            key: 'BUG-102',
            title: 'Update billing banner layout',
            status: 'DONE',
            priority: 'LOW',
            assigneeEmail: null,
            createdAt: '2026-10-02T12:00:00Z'
        }
    ];

    it('should format issues into valid CSV with properly escaped quotes', () => {
        const csv = formatIssuesAsCsv(mockIssues);
        const lines = csv.split('\\n');

        expect(lines[0]).toBe('Key,Title,Status,Priority,Assignee,Created Date');
        expect(lines[1]).toContain('BUG-101');
        expect(lines[1]).toContain('""null pointer""');
        expect(lines[2]).toContain('Unassigned');
    });

    it('should format issues into clean JSON array', () => {
        const jsonStr = formatIssuesAsJson(mockIssues);
        const parsed = JSON.parse(jsonStr);

        expect(Array.isArray(parsed)).toBe(true);
        expect(parsed.length).toBe(2);
        expect(parsed[0].key).toBe('BUG-101');
    });
});
`;

        fs.writeFileSync(libPath, libCode, 'utf8');
        fs.writeFileSync(testPath, testCode, 'utf8');
        return { modifiedFiles: ['src/lib/export-formatter.ts', 'tests/unit/export-formatter.test.ts'] };
    }
};

// 4. Get Next Enhancement from Roadmap
function getNextEnhancement() {
    if (!fs.existsSync(ROADMAP_PATH)) return null;
    const roadmap = JSON.parse(fs.readFileSync(ROADMAP_PATH, 'utf8').trim());
    const pending = roadmap.find(item => item.status === 'pending');
    return { item: pending, all: roadmap };
}

// 5. Update Status
function updateEnhancementStatus(id, status, errorMsg = null) {
    if (!fs.existsSync(ROADMAP_PATH)) return;
    const roadmap = JSON.parse(fs.readFileSync(ROADMAP_PATH, 'utf8').trim());
    const target = roadmap.find(item => item.id === id);
    if (target) {
        target.status = status;
        target.lastRun = new Date().toISOString();
        if (errorMsg) target.lastError = errorMsg;
        fs.writeFileSync(ROADMAP_PATH, JSON.stringify(roadmap, null, 2), 'utf8');
    }
}

// 6. Append to Log
function recordLogEntry({ enhancement, testsPassed, status, diffSummary, note }) {
    const dateStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toLocaleTimeString();

    if (!fs.existsSync(LOG_PATH)) {
        fs.writeFileSync(LOG_PATH, '# 🚀 Bug Tracker Daily Autonomous Enhancement Log\n\nTrack automated daily code improvements, AI refactoring, and unit test verification.\n\n---\n\n', 'utf8');
    }

    const entry = `
### 📅 ${dateStr} at ${timeStr} — ${enhancement.title}
- **Status:** ${status === 'SUCCESS' ? '✅ SUCCESS (Merged & Verified)' : '⚠️ FAILED (Safely Rolled Back)'}
- **Enhancement ID:** \`${enhancement.id}\`
- **Tests Verified:** ${testsPassed ? '✅ 100% Passed (' + testsPassed + ' passing)' : '❌ Failed'}
- **Goal:** ${enhancement.description}
${diffSummary ? `- **Files Changed:**\n\`\`\`\n${diffSummary}\n\`\`\`` : ''}
${note ? `> **Note:** ${note}\n` : ''}
---
`;

    fs.appendFileSync(LOG_PATH, entry, 'utf8');
    log(`📝 Appended enhancement summary to DAILY_ENHANCEMENT_LOG.md`, colors.cyan);
}

// 7. Implement Enhancement
function executeEnhancement(enhancement) {
    if (hasOpenCodeAuth()) {
        log(`🤖 OpenCode credentials detected! Invoking OpenCode agent...`, colors.bold);
        const prompt = `Task: ${enhancement.title}\nDetails: ${enhancement.description}\nImplement cleanly in TypeScript and add unit tests in tests/unit/. Ensure vitest passes.`;
        const opencodeCmd = process.platform === 'win32' ? 'opencode.cmd' : 'opencode';
        spawnSync(opencodeCmd, ['run', prompt], { cwd: ROOT_DIR, shell: true, stdio: 'inherit', timeout: 300000 });
        return true;
    } else {
        log(`⚡ OpenCode provider login pending. Using autonomous enhancement builder for roadmap item...`, colors.cyan);
        const builder = BUILTIN_ENHANCERS[enhancement.id];
        if (builder) {
            builder();
            return true;
        } else {
            log(`ℹ️ To use open-ended prompts, connect OpenCode with: "opencode providers login"`, colors.yellow);
            return false;
        }
    }
}

// 8. Rollback
function rollback() {
    log(`🛡️ Rolling back modified and untracked files to maintain green build...`, colors.yellow);
    try {
        execSync('git checkout -- .', { cwd: ROOT_DIR, stdio: 'ignore' });
        execSync('git clean -fd', { cwd: ROOT_DIR, stdio: 'ignore' });
        log(`✅ Working tree restored to clean state.`, colors.green);
    } catch (e) {
        log(`Rollback error: ${e.message}`, colors.red);
    }
}

// 9. Main Cycle
async function runDailyCycle() {
    console.log('\n' + '='.repeat(70));
    log('⚡ STARTING BUG TRACKER DAILY AUTONOMOUS ENHANCEMENT CYCLE ⚡', colors.bold);
    console.log('='.repeat(70) + '\n');

    // Step 1: Baseline health check
    log('Phase 1: Validating existing baseline unit tests...', colors.cyan);
    const baseline = runTests();
    if (!baseline.success) {
        log('⛔ Baseline tests are currently failing! Aborting to prevent regression.', colors.red);
        return;
    }

    // Step 2: Next enhancement
    const { item: enhancement } = getNextEnhancement() || {};
    if (!enhancement) {
        log('🎉 All roadmap enhancements have been completed! Add new items to scripts/enhancement-roadmap.json.', colors.green);
        return;
    }

    log(`Phase 2: Executing Enhancement -> [${enhancement.id}] "${enhancement.title}"`, colors.cyan);

    // Step 3: Implement
    const implemented = executeEnhancement(enhancement);
    if (!implemented) return;

    // Step 4: Run unit tests
    log(`Phase 3: Verifying unit tests on new enhancement...`, colors.cyan);
    const testResult = runTests();

    // Step 5: Commit or Rollback
    if (testResult.success) {
        log(`🎉 SUCCESS! Enhancement completed and all unit tests passed cleanly.`, colors.green);
        updateEnhancementStatus(enhancement.id, 'completed');

        const gitStatus = execSync('git status --short', { cwd: ROOT_DIR, encoding: 'utf8' }).trim();
        try {
            execSync('git add .', { cwd: ROOT_DIR });
            const commitMsg = `feat(auto-enhance): [${enhancement.id}] ${enhancement.title}`;
            execSync(`git commit -m "${commitMsg}"`, { cwd: ROOT_DIR });
            log(`📦 Git commit created: "${commitMsg}"`, colors.green);
        } catch (e) {
            // ignore if nothing to commit
        }

        recordLogEntry({
            enhancement,
            testsPassed: testResult.passedCount,
            status: 'SUCCESS',
            diffSummary: gitStatus,
            note: 'All unit tests passed. Code automatically verified and merged.'
        });
    } else {
        log(`❌ Unit tests failed after changes! Performing safety rollback...`, colors.red);
        rollback();
        updateEnhancementStatus(enhancement.id, 'failed', 'Unit tests failed verification');
        recordLogEntry({
            enhancement,
            testsPassed: null,
            status: 'FAILED',
            diffSummary: '',
            note: 'Automatically rolled back to protect the main branch.'
        });
    }

    console.log('\n' + '='.repeat(70));
    log('🏁 DAILY ENHANCEMENT CYCLE COMPLETE', colors.bold);
    console.log('='.repeat(70) + '\n');
}

const isDaemon = process.argv.includes('--daemon');
if (isDaemon) {
    log('🔄 Running in DAEMON mode: Cycle will trigger now and repeat every 24 hours.', colors.cyan);
    runDailyCycle();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    setInterval(runDailyCycle, TWENTY_FOUR_HOURS);
} else {
    runDailyCycle();
}
