const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROUTES = [
  { path: '/admin', name: 'dashboard' },
  { path: '/admin/articles', name: 'articles' },
  { path: '/admin/press-releases', name: 'press-releases' },
  { path: '/admin/clients', name: 'clients' },
  { path: '/admin/stats', name: 'stats' },
  { path: '/admin/monitoring', name: 'monitoring' },
  { path: '/admin/crawl', name: 'crawl' },
  { path: '/admin/settings', name: 'settings' },
];

const VIEWPORTS = [
  { width: 1440, height: 900, name: 'desktop' },
  { width: 375, height: 812, name: 'mobile' },
];

const BASE_URL = 'http://localhost:3000';
const OUTPUT_DIR = '.sisyphus/evidence/ui-audit';

async function runAudit() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const results = {
    timestamp: new Date().toISOString(),
    routes: [],
    issues: [],
  };

  for (const route of ROUTES) {
    console.log(`\n=== Auditing ${route.name} ===`);
    const routeResult = {
      route: route.path,
      name: route.name,
      viewports: [],
    };

    for (const viewport of VIEWPORTS) {
      console.log(`  ${viewport.name} (${viewport.width}x${viewport.height})`);
      
      try {
        // Set viewport
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        
        // Navigate
        await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'networkidle' });
        
        // Wait for content to render
        await page.waitForTimeout(1000);
        
        // Get page metrics
        const metrics = await page.evaluate(() => {
          const html = document.documentElement;
          const body = document.body;
          return {
            scrollHeight: Math.max(html.scrollHeight, body.scrollHeight),
            scrollWidth: Math.max(html.scrollWidth, body.scrollWidth),
            clientHeight: html.clientHeight,
            clientWidth: html.clientWidth,
          };
        });
        
        // Take screenshot
        const filename = `${viewport.name}-${route.name}.png`;
        const filepath = path.join(OUTPUT_DIR, filename);
        await page.screenshot({ path: filepath, fullPage: true });
        
        // Check for issues
        const viewportIssues = [];
        
        // Check for horizontal scroll
        if (metrics.scrollWidth > viewport.width) {
          viewportIssues.push(`Horizontal scroll detected: ${metrics.scrollWidth}px > ${viewport.width}px`);
        }
        
        // Check for sidebar visibility on mobile
        if (viewport.name === 'mobile') {
          const sidebarVisible = await page.evaluate(() => {
            const sidebar = document.querySelector('aside');
            if (!sidebar) return null;
            const rect = sidebar.getBoundingClientRect();
            return {
              visible: rect.width > 0 && rect.height > 0,
              width: rect.width,
              overlapping: rect.right > window.innerWidth,
            };
          });
          
          if (sidebarVisible) {
            if (sidebarVisible.overlapping) {
              viewportIssues.push(`Sidebar overlaps content: ${sidebarVisible.width}px wide`);
            }
          }
        }
        
        const viewportResult = {
          viewport: `${viewport.width}x${viewport.height}`,
          name: viewport.name,
          screenshot: filename,
          metrics,
          issues: viewportIssues,
        };
        
        routeResult.viewports.push(viewportResult);
        
        if (viewportIssues.length > 0) {
          results.issues.push({
            route: route.name,
            viewport: viewport.name,
            issues: viewportIssues,
          });
        }
        
        console.log(`    ✓ Screenshot saved: ${filename}`);
        if (viewportIssues.length > 0) {
          console.log(`    ⚠ Issues found: ${viewportIssues.join(', ')}`);
        }
        
      } catch (error) {
        console.error(`    ✗ Error: ${error.message}`);
        routeResult.viewports.push({
          viewport: `${viewport.width}x${viewport.height}`,
          name: viewport.name,
          error: error.message,
        });
        results.issues.push({
          route: route.name,
          viewport: viewport.name,
          error: error.message,
        });
      }
    }
    
    results.routes.push(routeResult);
  }

  // Save results
  const reportPath = path.join(OUTPUT_DIR, 'audit-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n✓ Report saved: ${reportPath}`);

  await browser.close();
  
  // Print summary
  console.log('\n=== AUDIT SUMMARY ===');
  console.log(`Total routes audited: ${results.routes.length}`);
  console.log(`Total screenshots: ${results.routes.length * 2}`);
  console.log(`Issues found: ${results.issues.length}`);
  
  if (results.issues.length > 0) {
    console.log('\nIssues by route:');
    results.issues.forEach(issue => {
      console.log(`  - ${issue.route} (${issue.viewport}): ${issue.issues?.join(', ') || issue.error}`);
    });
  }
}

runAudit().catch(console.error);
